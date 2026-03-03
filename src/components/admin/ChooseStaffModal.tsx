import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  X,
  Users,
  CheckCircle,
  Search,
  User,
  Mail,
  Phone,
  Car,
  AlertCircle,
} from 'lucide-react';
import { formatRoleLabel } from '../../hooks/useStaffRoles';

interface MasterStaff {
  id: string;
  name: string;
  role: string;
  role_custom: string | null;
  staff_type: string;
  email: string | null;
  phone: string | null;
  emergency_contact: string | null;
  availability: string;
  availability_notes: string;
  payment_method: string | null;
  id_verified: boolean;
  contract_signed: boolean;
  documents_notes: string;
  profile_photo_url: string | null;
  document_attachment_url: string | null;
  has_vehicle: boolean;
  vehicle_type: string | null;
  internal_notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ChooseStaffModalProps {
  journeyId: string;
  existingMasterStaffIds: string[];
  onClose: () => void;
  onStaffSelected: () => void;
}

export function ChooseStaffModal({ journeyId, existingMasterStaffIds, onClose, onStaffSelected }: ChooseStaffModalProps) {
  const [masterStaff, setMasterStaff] = useState<MasterStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchMasterStaff();
  }, []);

  const fetchMasterStaff = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('master_staff')
        .select('id, name, role, role_custom, staff_type, email, phone, emergency_contact, availability, availability_notes, payment_method, id_verified, contract_signed, documents_notes, profile_photo_url, document_attachment_url, has_vehicle, vehicle_type, internal_notes, is_active, created_at, updated_at')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setMasterStaff(data || []);
    } catch (err) {
      console.error('Error fetching master staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStaffSelection = (staffId: string) => {
    const newSelected = new Set(selectedStaffIds);
    if (newSelected.has(staffId)) {
      newSelected.delete(staffId);
    } else {
      newSelected.add(staffId);
    }
    setSelectedStaffIds(newSelected);
  };

  const assignStaffToTrip = async () => {
    if (selectedStaffIds.size === 0) return;

    try {
      setAssigning(true);

      const staffToAssign = masterStaff.filter(s => selectedStaffIds.has(s.id));

      // Helper function to normalize role to lowercase
      const normalizeRole = (role: string) => {
        return role.toLowerCase();
      };

      // Helper function to normalize staff_type
      const normalizeStaffType = (staffType: string) => {
        // Convert "employee" to "internal", otherwise use as-is
        if (staffType === 'employee') return 'internal';
        return staffType;
      };

      const tripStaffRecords = staffToAssign.map(staff => ({
        journey_id: journeyId,
        master_staff_id: staff.id,
        name: staff.name,
        role: normalizeRole(staff.role),
        role_custom: staff.role_custom,
        staff_type: normalizeStaffType(staff.staff_type),
        email: staff.email,
        phone: staff.phone,
        emergency_contact: staff.emergency_contact,
        status: 'pending',
        availability: staff.availability,
        availability_notes: staff.availability_notes || '',
        payment_status: 'not_paid',
        payment_method: staff.payment_method || null,
        payment_amount: null,
        payment_date: null,
        payment_notes: '',
        id_verified: staff.id_verified || false,
        contract_signed: staff.contract_signed || false,
        documents_notes: staff.documents_notes || '',
        internal_notes: staff.internal_notes || '',
        profile_photo_url: staff.profile_photo_url || null,
        document_attachment_url: staff.document_attachment_url || null,
        has_vehicle: staff.has_vehicle || false,
        vehicle_type: staff.vehicle_type || null,
      }));

      const { error } = await supabase
        .from('journey_staff')
        .insert(tripStaffRecords);

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      onStaffSelected();
      onClose();
    } catch (err: any) {
      console.error('Error assigning staff to trip:', err);
      console.error('Error message:', err?.message);
      console.error('Error details:', err?.details);
      console.error('Error hint:', err?.hint);
      const errorMsg = err?.message || 'Unknown error occurred';
      alert(`Failed to assign staff to trip: ${errorMsg}`);
    } finally {
      setAssigning(false);
    }
  };

  const filteredStaff = masterStaff.filter(staff =>
    staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'text-green-600 bg-green-50';
      case 'partially_available': return 'text-yellow-600 bg-yellow-50';
      case 'not_available': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-brand-brown">Choose Staff Members</h2>
            <p className="text-sm text-brand-gray-1 mt-1">Select staff from your master list to assign to this trip</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-brand-gray-1" />
            <input
              type="text"
              placeholder="Search by name, role, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {selectedStaffIds.size > 0 && (
            <div className="mt-3 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
              <span className="text-sm text-blue-900 font-medium">
                {selectedStaffIds.size} staff member{selectedStaffIds.size > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedStaffIds(new Set())}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-brand-gray-2 mb-3" />
              <p className="text-brand-gray-1">
                {searchTerm ? 'No staff members found matching your search' : 'No master staff members available'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredStaff.map((staff) => {
                const isAlreadyAssigned = existingMasterStaffIds.includes(staff.id);
                const isSelected = selectedStaffIds.has(staff.id);

                return (
                  <div
                    key={staff.id}
                    className={`border rounded-lg p-4 transition-all ${
                      isAlreadyAssigned
                        ? 'bg-gray-50 border-gray-300 opacity-60'
                        : isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-brand-gray-3 hover:border-blue-300 hover:shadow-sm cursor-pointer'
                    }`}
                    onClick={() => !isAlreadyAssigned && toggleStaffSelection(staff.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {staff.profile_photo_url ? (
                          <img
                            src={staff.profile_photo_url}
                            alt={staff.name}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-brand-gray-3 flex items-center justify-center">
                            <User className="w-8 h-8 text-brand-gray-1" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-brand-brown">
                              {staff.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                {formatRoleLabel(staff.role, staff.role_custom)}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded ${getAvailabilityColor(staff.availability)}`}>
                                {staff.availability.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                          {isAlreadyAssigned ? (
                            <div className="flex items-center gap-2 text-gray-600 bg-gray-200 px-3 py-1 rounded-full">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-xs font-medium">Already Assigned</span>
                            </div>
                          ) : (
                            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-gray-300'
                            }`}>
                              {isSelected && <CheckCircle className="w-5 h-5 text-white" />}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          {staff.email && (
                            <div className="flex items-center gap-2 text-brand-gray-1">
                              <Mail className="w-4 h-4" />
                              <span className="truncate">{staff.email}</span>
                            </div>
                          )}
                          {staff.phone && (
                            <div className="flex items-center gap-2 text-brand-gray-1">
                              <Phone className="w-4 h-4" />
                              <span>{staff.phone}</span>
                            </div>
                          )}
                          {staff.has_vehicle && (
                            <div className="flex items-center gap-2 text-brand-gray-1">
                              <Car className="w-4 h-4" />
                              <span>{staff.vehicle_type || 'Has vehicle'}</span>
                            </div>
                          )}
                        </div>

                        {staff.availability_notes && (
                          <p className="text-sm text-brand-gray-1 mt-2 italic">
                            {staff.availability_notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-brand-gray-1 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={assignStaffToTrip}
            disabled={selectedStaffIds.size === 0 || assigning}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {assigning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Assigning...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Assign {selectedStaffIds.size > 0 && `(${selectedStaffIds.size})`} to Trip
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}