import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  User,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  X,
  Save,
} from 'lucide-react';
import type { MasterStaff, StaffDocument, StaffImage } from '../../lib/database.types';
import { StaffFormModal } from './StaffFormModal';

interface StaffMemberWithDetails extends MasterStaff {
  user_email?: string;
  documents_count?: number;
  images_count?: number;
}

const STAFF_CATEGORIES = [
  'guide',
  'driver',
  'coordinator',
  'photographer',
  'translator',
  'porter',
  'chef',
  'medic',
  'security',
  'assistant',
  'heritage_specialist',
  'other',
];

const STAFF_TYPES = ['employee', 'contractor', 'freelancer'];

const AVAILABILITY_OPTIONS = ['available', 'partially_available', 'not_available'];

const STATUS_OPTIONS = ['active', 'inactive', 'on_leave', 'terminated'];

export function StaffDirectoryPage() {
  const [staff, setStaff] = useState<StaffMemberWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLinkedToUser, setFilterLinkedToUser] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<MasterStaff | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<MasterStaff | null>(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('master_staff')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      const staffWithDetails = await Promise.all(
        (data || []).map(async (staffMember) => {
          const [docsResult, imagesResult] = await Promise.all([
            supabase
              .from('staff_documents')
              .select('id', { count: 'exact' })
              .eq('master_staff_id', staffMember.id),
            supabase
              .from('staff_images')
              .select('id', { count: 'exact' })
              .eq('master_staff_id', staffMember.id),
          ]);

          return {
            ...staffMember,
            documents_count: docsResult.count || 0,
            images_count: imagesResult.count || 0,
          };
        })
      );

      setStaff(staffWithDetails);
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staff.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.phone && s.phone.includes(searchTerm));

    const matchesCategory = filterCategory === 'all' || s.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchesLinked =
      filterLinkedToUser === 'all' ||
      (filterLinkedToUser === 'yes' && s.user_id) ||
      (filterLinkedToUser === 'no' && !s.user_id);

    return matchesSearch && matchesCategory && matchesStatus && matchesLinked;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle className="w-3 h-3 mr-1" />
            Inactive
          </span>
        );
      case 'on_leave':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            On Leave
          </span>
        );
      case 'terminated':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Terminated
          </span>
        );
      default:
        return null;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;

    try {
      const { error } = await supabase.from('master_staff').delete().eq('id', id);

      if (error) throw error;

      setStaff(staff.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Error deleting staff:', err);
      alert('Failed to delete staff member');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading staff directory...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Directory</h1>
          <p className="text-gray-600 mt-1">Manage all staff members and their information</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Staff Member
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {STAFF_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </option>
            ))}
          </select>

          <select
            value={filterLinkedToUser}
            onChange={(e) => setFilterLinkedToUser(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Staff</option>
            <option value="yes">Linked to User</option>
            <option value="no">Not Linked</option>
          </select>
        </div>

        <div className="text-sm text-gray-600">
          Showing {filteredStaff.length} of {staff.length} staff members
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map((staffMember) => (
          <div
            key={staffMember.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                {staffMember.profile_photo_url ? (
                  <img
                    src={staffMember.profile_photo_url}
                    alt={staffMember.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-500" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">{staffMember.name}</h3>
                  <p className="text-sm text-gray-600">
                    {staffMember.role_custom || staffMember.role}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => {
                    setEditingStaff(staffMember);
                    setShowAddModal(true);
                  }}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(staffMember.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-center text-sm text-gray-600">
                <span className="font-medium mr-2">Category:</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                  {staffMember.category}
                </span>
              </div>
              {getStatusBadge(staffMember.status)}
              {staffMember.user_id && (
                <div className="flex items-center text-sm">
                  <LinkIcon className="w-4 h-4 mr-1 text-green-600" />
                  <span className="text-green-600 font-medium">Linked to User Account</span>
                </div>
              )}
            </div>

            <div className="space-y-1 text-sm text-gray-600 mb-3">
              {staffMember.email && (
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="truncate">{staffMember.email}</span>
                </div>
              )}
              {staffMember.phone && (
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-gray-400" />
                  <span>{staffMember.phone}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-200 text-sm text-gray-600">
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  <FileText className="w-4 h-4 mr-1 text-gray-400" />
                  <span>{staffMember.documents_count || 0} docs</span>
                </div>
                <div className="flex items-center">
                  <ImageIcon className="w-4 h-4 mr-1 text-gray-400" />
                  <span>{staffMember.images_count || 0} images</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaff(staffMember)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No staff members found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterCategory !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first staff member'}
          </p>
          {!searchTerm && filterCategory === 'all' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Staff Member
            </button>
          )}
        </div>
      )}

      {(showAddModal || editingStaff) && (
        <StaffFormModal
          staff={editingStaff}
          onClose={() => {
            setShowAddModal(false);
            setEditingStaff(null);
          }}
          onSave={() => {
            fetchStaff();
          }}
        />
      )}
    </div>
  );
}
