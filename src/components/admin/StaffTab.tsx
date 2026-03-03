import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ChooseStaffModal } from './ChooseStaffModal';
import { safeParseFloat } from '../../lib/numberValidation';
import { useStaffRoles, formatRoleLabel } from '../../hooks/useStaffRoles';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  Calendar,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  Mail,
  Shield,
  MapPin,
  Car,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';

interface StaffTabProps {
  journeyId: string;
}

type StaffRole = string;
type StaffType = 'internal' | 'external';
type StaffStatus = 'confirmed' | 'pending' | 'cancelled' | 'replacement_needed';
type StaffAvailability = 'available' | 'partially_available' | 'not_available';
type PaymentStatus = 'not_paid' | 'partially_paid' | 'fully_paid';

interface StaffMember {
  id: string;
  journey_id: string;
  master_staff_id: string | null;
  name: string;
  role: StaffRole;
  role_custom: string | null;
  staff_type: StaffType;
  email: string | null;
  phone: string | null;
  emergency_contact: string | null;
  status: StaffStatus;
  availability: StaffAvailability;
  availability_notes: string;
  payment_status: PaymentStatus;
  payment_method: string | null;
  payment_amount: number | null;
  payment_date: string | null;
  payment_notes: string;
  id_verified: boolean;
  contract_signed: boolean;
  documents_notes: string;
  internal_notes: string;
  profile_photo_url: string | null;
  document_attachment_url: string | null;
  has_vehicle: boolean;
  vehicle_type: string | null;
  uses_registered_vehicle: boolean;
  created_at: string;
  updated_at: string;
}

interface StaffPayment {
  id: string;
  payment_type: 'advance' | 'final' | 'expenses' | 'bonus' | 'accommodation' | 'meals' | 'transportation' | 'equipment' | 'other';
  amount: number;
  currency: string;
  payment_date: string | null;
  payment_method: string | null;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  reference_number: string | null;
  notes: string;
}

interface StaffFormData {
  name: string;
  role: StaffRole;
  role_custom: string;
  staff_type: StaffType;
  email: string;
  phone: string;
  emergency_contact: string;
  status: StaffStatus;
  availability: StaffAvailability;
  availability_notes: string;
  payment_status: PaymentStatus;
  payment_method: string;
  payment_amount: string;
  payment_date: string;
  payment_notes: string;
  id_verified: boolean;
  contract_signed: boolean;
  documents_notes: string;
  internal_notes: string;
  has_vehicle: boolean;
  vehicle_type: string;
  uses_registered_vehicle: boolean;
}

export function StaffTab({ journeyId }: StaffTabProps) {
  const { roles: staffRoles, loading: rolesLoading } = useStaffRoles();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showChooseStaffModal, setShowChooseStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [expandedStaff, setExpandedStaff] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchStaff();
  }, [journeyId]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('journey_staff')
        .select('id, journey_id, master_staff_id, name, role, role_custom, staff_type, email, phone, emergency_contact, status, availability, availability_notes, payment_status, payment_method, payment_amount, payment_date, payment_notes, id_verified, contract_signed, documents_notes, internal_notes, profile_photo_url, document_attachment_url, has_vehicle, vehicle_type, uses_registered_vehicle, created_at, updated_at')
        .eq('journey_id', journeyId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setStaff(data || []);
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: StaffStatus) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'replacement_needed':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
    }
  };

  const getStatusLabel = (status: StaffStatus) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'pending':
        return 'Pending';
      case 'cancelled':
        return 'Cancelled';
      case 'replacement_needed':
        return 'Replacement Needed';
    }
  };

  const getStatusColor = (status: StaffStatus) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'replacement_needed':
        return 'bg-orange-50 text-orange-700 border-orange-200';
    }
  };

  const getAvailabilityIcon = (availability: StaffAvailability) => {
    switch (availability) {
      case 'available':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'partially_available':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'not_available':
        return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getPaymentIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'fully_paid':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'partially_paid':
        return <DollarSign className="w-4 h-4 text-blue-600" />;
      case 'not_paid':
        return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };


  const calculateCompletion = () => {
    if (staff.length === 0) return 0;

    const requiredRoles = ['guide', 'driver'];
    const hasRequiredRoles = requiredRoles.every(role =>
      staff.some(s => s.role === role && s.status === 'confirmed')
    );

    const allConfirmed = staff.every(s => s.status === 'confirmed');
    const allDocumentsComplete = staff.every(s =>
      s.id_verified && s.contract_signed
    );

    if (hasRequiredRoles && allConfirmed && allDocumentsComplete) return 100;

    let score = 0;
    if (hasRequiredRoles) score += 40;
    if (allConfirmed) score += 40;
    if (allDocumentsComplete) score += 20;

    return score;
  };

  const toggleExpanded = (staffId: string) => {
    const newExpanded = new Set(expandedStaff);
    if (newExpanded.has(staffId)) {
      newExpanded.delete(staffId);
    } else {
      newExpanded.add(staffId);
    }
    setExpandedStaff(newExpanded);
  };

  const handleDelete = async (staffId: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;

    try {
      const { error } = await supabase
        .from('journey_staff')
        .delete()
        .eq('id', staffId);

      if (error) throw error;
      await fetchStaff();
    } catch (err) {
      console.error('Error deleting staff:', err);
      alert('Failed to delete staff member');
    }
  };

  const completionPercentage = calculateCompletion();
  const isFullyCompleted = completionPercentage === 100;

  const confirmedCount = staff.filter(s => s.status === 'confirmed').length;
  const pendingCount = staff.filter(s => s.status === 'pending').length;
  const requiredRoles = ['guide', 'driver'];
  const missingRoles = requiredRoles.filter(role =>
    !staff.some(s => s.role === role && s.status === 'confirmed')
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-brand-gray-1">Loading staff...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-brand-gray-3 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-brand-brown mb-1">Staff Overview</h2>
            <p className="text-sm text-brand-gray-1">Manage journey staff and assignments</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowChooseStaffModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
              title="Select from existing staff members"
            >
              <Users className="w-4 h-4" />
              Choose from Existing Staff
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-green-600 text-green-600 hover:bg-green-50 rounded-lg transition-colors text-sm font-medium"
              title="Create new staff member"
            >
              <Plus className="w-4 h-4" />
              Add New Staff
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Total Staff</p>
                <p className="text-2xl font-bold text-blue-900">{staff.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Confirmed</p>
                <p className="text-2xl font-bold text-green-900">{confirmedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700 font-medium">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">{pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600 opacity-50" />
            </div>
          </div>

          <div className={`border rounded-lg p-4 ${
            missingRoles.length > 0
              ? 'bg-red-50 border-red-200'
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  missingRoles.length > 0 ? 'text-red-700' : 'text-green-700'
                }`}>
                  Required Roles
                </p>
                <p className={`text-2xl font-bold ${
                  missingRoles.length > 0 ? 'text-red-900' : 'text-green-900'
                }`}>
                  {missingRoles.length > 0 ? 'Missing' : 'Complete'}
                </p>
              </div>
              {missingRoles.length > 0 ? (
                <AlertCircle className="w-8 h-8 text-red-600 opacity-50" />
              ) : (
                <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
              )}
            </div>
            {missingRoles.length > 0 && (
              <p className="text-xs text-red-600 mt-2">
                Missing: {missingRoles.join(', ')}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1 mr-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-brand-brown">Completion Status</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-brand-brown">{completionPercentage}%</span>
                {isFullyCompleted && <CheckCircle className="w-5 h-5 text-green-600" />}
              </div>
            </div>
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isFullyCompleted ? 'bg-green-600' : 'bg-blue-600'
                }`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {staff.length === 0 ? (
          <div className="bg-white rounded-lg border border-brand-gray-3 p-12 text-center">
            <Users className="w-12 h-12 text-brand-gray-2 mx-auto mb-3" />
            <p className="text-brand-gray-1 mb-4">No staff members added yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add First Staff Member
            </button>
          </div>
        ) : (
          staff.map(member => (
            <div
              key={member.id}
              className="bg-white rounded-lg border border-brand-gray-3 shadow-sm overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {member.profile_photo_url ? (
                      <img
                        src={member.profile_photo_url}
                        alt={member.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-brand-gray-3"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-brand-gray-4 flex items-center justify-center border-2 border-brand-gray-3">
                        <User className="w-6 h-6 text-brand-gray-2" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-brand-brown">{member.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                          member.status
                        )}`}>
                          {getStatusLabel(member.status)}
                        </span>
                        {member.has_vehicle && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-medium flex items-center gap-1">
                            <Car className="w-3 h-3" />
                            Vehicle
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-brand-gray-1">
                        <span className="flex items-center gap-1">
                          <Shield className="w-4 h-4" />
                          {formatRoleLabel(member.role, member.role_custom)}
                        </span>
                        <span className="px-2 py-0.5 bg-brand-gray-4 text-brand-brown rounded text-xs">
                          {member.staff_type}
                        </span>
                        {member.has_vehicle && member.vehicle_type && (
                          <span className="flex items-center gap-1">
                            <Car className="w-4 h-4" />
                            {member.vehicle_type}
                          </span>
                        )}
                        {member.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {member.phone}
                          </span>
                        )}
                        {member.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {member.email}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
                        <div className="flex items-center gap-1">
                          {getAvailabilityIcon(member.availability)}
                          <span className="text-brand-gray-1">
                            {member.availability.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {getPaymentIcon(member.payment_status)}
                          <span className="text-brand-gray-1">
                            {member.payment_status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.id_verified && <CheckCircle className="w-4 h-4 text-green-600" title="ID Verified" />}
                          {member.contract_signed && <FileText className="w-4 h-4 text-green-600" title="Contract Signed" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleExpanded(member.id)}
                      className="p-2 hover:bg-brand-gray-4 rounded-lg transition-colors"
                      title="View details"
                    >
                      {expandedStaff.has(member.id) ? (
                        <ChevronUp className="w-5 h-5 text-brand-gray-1" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-brand-gray-1" />
                      )}
                    </button>
                    <button
                      onClick={() => setEditingStaff(member)}
                      className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-5 h-5 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </div>

                {expandedStaff.has(member.id) && (
                  <div className="mt-4 pt-4 border-t border-brand-gray-3 space-y-3">
                    {member.availability_notes && (
                      <div>
                        <p className="text-xs font-semibold text-brand-brown mb-1">Availability Notes</p>
                        <p className="text-sm text-brand-gray-1">{member.availability_notes}</p>
                      </div>
                    )}

                    {member.emergency_contact && (
                      <div>
                        <p className="text-xs font-semibold text-brand-brown mb-1">Emergency Contact</p>
                        <p className="text-sm text-brand-gray-1">{member.emergency_contact}</p>
                      </div>
                    )}

                    {member.payment_amount && (
                      <div>
                        <p className="text-xs font-semibold text-brand-brown mb-1">Payment Details</p>
                        <div className="text-sm text-brand-gray-1 space-y-1">
                          <p>Amount: ${member.payment_amount}</p>
                          {member.payment_method && <p>Method: {member.payment_method}</p>}
                          {member.payment_date && <p>Date: {new Date(member.payment_date).toLocaleDateString()}</p>}
                          {member.payment_notes && <p>Notes: {member.payment_notes}</p>}
                        </div>
                      </div>
                    )}

                    {member.documents_notes && (
                      <div>
                        <p className="text-xs font-semibold text-brand-brown mb-1">Documents Notes</p>
                        <p className="text-sm text-brand-gray-1">{member.documents_notes}</p>
                      </div>
                    )}

                    {member.internal_notes && (
                      <div>
                        <p className="text-xs font-semibold text-brand-brown mb-1">Internal Notes</p>
                        <p className="text-sm text-brand-gray-1">{member.internal_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {(showAddModal || editingStaff) && (
        <StaffModal
          journeyId={journeyId}
          staff={editingStaff}
          onClose={() => {
            setShowAddModal(false);
            setEditingStaff(null);
          }}
          onSave={() => {
            fetchStaff();
            setShowAddModal(false);
            setEditingStaff(null);
          }}
        />
      )}

      {showChooseStaffModal && (
        <ChooseStaffModal
          journeyId={journeyId}
          existingMasterStaffIds={staff.filter(s => s.master_staff_id).map(s => s.master_staff_id as string)}
          onClose={() => setShowChooseStaffModal(false)}
          onStaffSelected={() => {
            fetchStaff();
            setShowChooseStaffModal(false);
          }}
        />
      )}
    </div>
  );
}

interface StaffModalProps {
  journeyId: string;
  staff: StaffMember | null;
  onClose: () => void;
  onSave: () => void;
}

function StaffModal({ journeyId, staff, onClose, onSave }: StaffModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(staff?.profile_photo_url || null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(staff?.document_attachment_url || null);

  const getFileNameFromUrl = (url: string | null): string => {
    if (!url) return 'View Document';
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const parts = pathname.split('/');
      const filename = parts[parts.length - 1];
      return decodeURIComponent(filename) || 'View Document';
    } catch {
      return 'View Document';
    }
  };

  const [formData, setFormData] = useState<StaffFormData>({
    name: staff?.name || '',
    role: staff?.role || 'guide',
    role_custom: staff?.role_custom || '',
    staff_type: staff?.staff_type || 'internal',
    email: staff?.email || '',
    phone: staff?.phone || '',
    emergency_contact: staff?.emergency_contact || '',
    status: staff?.status || 'pending',
    availability: staff?.availability || 'available',
    availability_notes: staff?.availability_notes || '',
    payment_status: staff?.payment_status || 'not_paid',
    payment_method: staff?.payment_method || '',
    payment_amount: staff?.payment_amount?.toString() || '',
    payment_date: staff?.payment_date || '',
    payment_notes: staff?.payment_notes || '',
    id_verified: staff?.id_verified || false,
    contract_signed: staff?.contract_signed || false,
    documents_notes: staff?.documents_notes || '',
    internal_notes: staff?.internal_notes || '',
    has_vehicle: staff?.has_vehicle || false,
    vehicle_type: staff?.vehicle_type || '',
    uses_registered_vehicle: staff?.uses_registered_vehicle ?? true,
  });

  const uploadFile = async (file: File, type: 'photo' | 'document'): Promise<string | null> => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${journeyId}/${type}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('staff-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('staff-documents')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error(`Error uploading ${type}:`, err);
      alert(`Failed to upload ${type}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Please enter a name');
      return;
    }

    try {
      setLoading(true);

      let finalProfilePhotoUrl = profilePhotoUrl;
      let finalDocumentUrl = documentUrl;

      if (profilePhotoFile) {
        const uploadedUrl = await uploadFile(profilePhotoFile, 'photo');
        if (uploadedUrl) finalProfilePhotoUrl = uploadedUrl;
      }

      if (documentFile) {
        const uploadedUrl = await uploadFile(documentFile, 'document');
        if (uploadedUrl) finalDocumentUrl = uploadedUrl;
      }

      const dataToSave = {
        journey_id: journeyId,
        name: formData.name,
        role: formData.role,
        role_custom: formData.role === 'other' ? formData.role_custom : null,
        staff_type: formData.staff_type,
        email: formData.email || null,
        phone: formData.phone || null,
        emergency_contact: formData.emergency_contact || null,
        status: formData.status,
        availability: formData.availability,
        availability_notes: formData.availability_notes,
        payment_status: formData.payment_status,
        payment_method: formData.payment_method || null,
        payment_amount: formData.payment_amount ? safeParseFloat(formData.payment_amount, null) : null,
        payment_date: formData.payment_date || null,
        payment_notes: formData.payment_notes,
        id_verified: formData.id_verified,
        contract_signed: formData.contract_signed,
        documents_notes: formData.documents_notes,
        internal_notes: formData.internal_notes,
        profile_photo_url: finalProfilePhotoUrl,
        document_attachment_url: finalDocumentUrl,
        has_vehicle: formData.has_vehicle,
        vehicle_type: formData.has_vehicle ? (formData.vehicle_type || null) : null,
        uses_registered_vehicle: formData.uses_registered_vehicle,
      };

      if (staff) {
        const { error } = await supabase
          .from('journey_staff')
          .update(dataToSave)
          .eq('id', staff.id);

        if (error) throw error;
      } else {
        let masterStaffId = null;

        if (!staff?.master_staff_id) {
          const masterStaffData = {
            name: formData.name,
            role: formData.role,
            role_custom: formData.role === 'other' ? formData.role_custom : null,
            staff_type: formData.staff_type,
            email: formData.email || null,
            phone: formData.phone || null,
            emergency_contact: formData.emergency_contact || null,
            availability: formData.availability,
            availability_notes: formData.availability_notes,
            payment_method: formData.payment_method || null,
            id_verified: formData.id_verified,
            contract_signed: formData.contract_signed,
            documents_notes: formData.documents_notes,
            profile_photo_url: finalProfilePhotoUrl,
            document_attachment_url: finalDocumentUrl,
            has_vehicle: formData.has_vehicle,
            vehicle_type: formData.has_vehicle ? (formData.vehicle_type || null) : null,
            uses_registered_vehicle: formData.uses_registered_vehicle,
            internal_notes: formData.internal_notes,
            is_active: true,
          };

          const { data: masterStaffResult, error: masterError } = await supabase
            .from('master_staff')
            .insert(masterStaffData)
            .select()
            .single();

          if (masterError) throw masterError;
          masterStaffId = masterStaffResult.id;
        }

        const { error } = await supabase
          .from('journey_staff')
          .insert({ ...dataToSave, master_staff_id: masterStaffId });

        if (error) throw error;
      }

      onSave();
    } catch (err) {
      console.error('Error saving staff:', err);
      alert('Failed to save staff member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold text-brand-brown">
            {staff ? 'Edit Staff Member' : 'Add Staff Member'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-brand-gray-4 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-brown mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-brown mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as StaffRole })}
                  className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={rolesLoading}
                >
                  {rolesLoading ? (
                    <option>Loading roles...</option>
                  ) : (
                    staffRoles.map((role) => (
                      <option key={role.role_value} value={role.role_value}>
                        {role.role_label}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {formData.role === 'other' && (
                <div>
                  <label className="block text-sm font-medium text-brand-brown mb-1">
                    Custom Role
                  </label>
                  <input
                    type="text"
                    value={formData.role_custom}
                    onChange={(e) => setFormData({ ...formData, role_custom: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter custom role"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-brand-brown mb-1">
                  Type
                </label>
                <select
                  value={formData.staff_type}
                  onChange={(e) => setFormData({ ...formData, staff_type: e.target.value as StaffType })}
                  className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="internal">Internal</option>
                  <option value="external">External</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-brown mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as StaffStatus })}
                  className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="replacement_needed">Replacement Needed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-brown mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-brown mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-brown mb-1">
                  Emergency Contact
                </label>
                <input
                  type="text"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-brown mb-1">
                  Availability
                </label>
                <select
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value as StaffAvailability })}
                  className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="available">Available</option>
                  <option value="partially_available">Partially Available</option>
                  <option value="not_available">Not Available</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-brand-brown mb-1">
                  Availability Notes
                </label>
                <textarea
                  value={formData.availability_notes}
                  onChange={(e) => setFormData({ ...formData, availability_notes: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Late arrival, early leave, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-brown mb-1">
                  Payment Status
                </label>
                <select
                  value={formData.payment_status}
                  onChange={(e) => setFormData({ ...formData, payment_status: e.target.value as PaymentStatus })}
                  className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="not_paid">Not Paid</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="fully_paid">Fully Paid</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-brown mb-1">
                  Payment Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.payment_amount}
                  onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-brown mb-1">
                  Payment Method
                </label>
                <input
                  type="text"
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Cash, Bank Transfer, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-brown mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-brand-brown mb-1">
                  Payment Notes
                </label>
                <textarea
                  value={formData.payment_notes}
                  onChange={(e) => setFormData({ ...formData, payment_notes: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-brand-brown mb-3">Profile Photo & Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-brown mb-1">
                    Profile Photo
                  </label>
                  <div className="space-y-2">
                    {profilePhotoUrl && !profilePhotoFile && (
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-brand-gray-3">
                        <img
                          src={profilePhotoUrl}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer text-sm">
                        <ImageIcon className="w-4 h-4" />
                        {profilePhotoFile ? profilePhotoFile.name : 'Choose Photo'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setProfilePhotoFile(file);
                          }}
                          className="hidden"
                        />
                      </label>
                      {profilePhotoFile && (
                        <span className="text-xs text-green-600">Selected: {profilePhotoFile.name}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-brown mb-1">
                    Document Attachment
                  </label>
                  <div className="space-y-2">
                    {documentUrl && !documentFile && (
                      <a
                        href={documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <FileText className="w-4 h-4" />
                        {getFileNameFromUrl(documentUrl)}
                      </a>
                    )}
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer text-sm">
                        <Upload className="w-4 h-4" />
                        {documentFile ? documentFile.name : 'Choose Document'}
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setDocumentFile(file);
                          }}
                          className="hidden"
                        />
                      </label>
                      {documentFile && (
                        <span className="text-xs text-green-600">Selected: {documentFile.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-brand-brown mb-3">Vehicle Assignment</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.has_vehicle}
                      onChange={(e) => setFormData({ ...formData, has_vehicle: e.target.checked, vehicle_type: e.target.checked ? formData.vehicle_type : '' })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-brand-brown flex items-center gap-2">
                      <Car className="w-4 h-4" />
                      Has Vehicle
                    </span>
                  </label>
                </div>

                {formData.has_vehicle && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-brand-brown mb-1">
                        Vehicle Type / Model
                      </label>
                      <input
                        type="text"
                        value={formData.vehicle_type}
                        onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                        className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Toyota Land Cruiser, 4x4 SUV"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.uses_registered_vehicle}
                          onChange={(e) => setFormData({ ...formData, uses_registered_vehicle: e.target.checked })}
                          className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                        />
                        <span className="text-sm text-brand-brown">Using registered vehicle on this journey</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-brand-brown mb-3">Documents & Requirements</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.id_verified}
                    onChange={(e) => setFormData({ ...formData, id_verified: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-brand-brown">ID Verified</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.contract_signed}
                    onChange={(e) => setFormData({ ...formData, contract_signed: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-brand-brown">Contract Signed</span>
                </label>
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-brand-brown mb-1">
                  Documents Notes
                </label>
                <textarea
                  value={formData.documents_notes}
                  onChange={(e) => setFormData({ ...formData, documents_notes: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-brown mb-1">
                Internal Notes
              </label>
              <textarea
                value={formData.internal_notes}
                onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Internal notes about this staff member"
              />
            </div>
          </div>
        </form>

        <div className="p-6 border-t bg-brand-gray-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-brand-gray-3 text-brand-brown rounded-lg hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || uploading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {uploading ? 'Uploading...' : loading ? 'Saving...' : 'Save Staff Member'}
          </button>
        </div>
      </div>
    </div>
  );
}
