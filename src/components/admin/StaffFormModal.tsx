import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Save, User, Mail, Phone, AlertCircle, Loader } from 'lucide-react';
import type { MasterStaff } from '../../lib/database.types';
import { useStaffRoles } from '../../hooks/useStaffRoles';

interface StaffFormModalProps {
  staff: MasterStaff | null;
  onClose: () => void;
  onSave: () => void;
}

const STAFF_TYPES = ['employee', 'contractor', 'freelancer'];
const AVAILABILITY_OPTIONS = ['available', 'partially_available', 'not_available'];
const STATUS_OPTIONS = ['active', 'inactive', 'on_leave', 'terminated'];

export function StaffFormModal({ staff, onClose, onSave }: StaffFormModalProps) {
  const { roles: staffRoles, loading: rolesLoading } = useStaffRoles();

  const [formData, setFormData] = useState({
    name: '',
    category: 'guide',
    staff_type: 'employee',
    email: '',
    phone: '',
    emergency_contact: '',
    availability: 'available',
    availability_notes: '',
    status: 'active',
    internal_notes: '',
  });

  const [createUserAccount, setCreateUserAccount] = useState(false);
  const [userRole, setUserRole] = useState<'guide' | 'client' | 'admin'>('guide');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (staff) {
      setFormData({
        name: staff.name || '',
        category: staff.category || 'guide',
        staff_type: staff.staff_type || 'employee',
        email: staff.email || '',
        phone: staff.phone || '',
        emergency_contact: staff.emergency_contact || '',
        availability: staff.availability || 'available',
        availability_notes: staff.availability_notes || '',
        status: staff.status || 'active',
        internal_notes: staff.internal_notes || '',
      });
      setCreateUserAccount(!!staff.user_id);
    }
  }, [staff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      let staffId = staff?.id;

      if (staff) {
        const { error: updateError } = await supabase
          .from('master_staff')
          .update({
            name: formData.name,
            category: formData.category,
            staff_type: formData.staff_type,
            email: formData.email || null,
            phone: formData.phone || null,
            emergency_contact: formData.emergency_contact || null,
            availability: formData.availability,
            availability_notes: formData.availability_notes,
            status: formData.status,
            internal_notes: formData.internal_notes,
          })
          .eq('id', staff.id);

        if (updateError) throw updateError;
      } else {
        const { data: newStaff, error: insertError } = await supabase
          .from('master_staff')
          .insert({
            name: formData.name,
            category: formData.category,
            staff_type: formData.staff_type,
            email: formData.email || null,
            phone: formData.phone || null,
            emergency_contact: formData.emergency_contact || null,
            availability: formData.availability,
            availability_notes: formData.availability_notes,
            status: formData.status,
            internal_notes: formData.internal_notes,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        staffId = newStaff.id;
      }

      if (createUserAccount && !staff?.user_id && formData.email) {
        await createUserForStaff(staffId, formData.email, formData.name);
      }

      onSave();
      onClose();
    } catch (err: any) {
      console.error('Error saving staff:', err);
      setError(err.message || 'Failed to save staff member');
    } finally {
      setSaving(false);
    }
  };

  const createUserForStaff = async (staffId: string, email: string, name: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name,
          role: userRole,
          phone_number: formData.phone || null,
          master_staff_id: staffId,
          send_invitation: true,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create user account');
      }

      alert(`User account created successfully! An invitation email has been sent to ${email}`);
    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(`Staff member saved, but failed to create user account: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {staff ? 'Edit Staff Member' : 'Add Staff Member'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.staff_type}
                onChange={(e) => setFormData({ ...formData, staff_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {STAFF_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="staff@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+1234567890"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emergency Contact
              </label>
              <input
                type="text"
                value={formData.emergency_contact}
                onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Name and phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Availability
              </label>
              <select
                value={formData.availability}
                onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {AVAILABILITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Availability Notes
              </label>
              <textarea
                value={formData.availability_notes}
                onChange={(e) => setFormData({ ...formData, availability_notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                placeholder="Any notes about availability..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Internal Notes
              </label>
              <textarea
                value={formData.internal_notes}
                onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Internal notes about this staff member..."
              />
            </div>
          </div>

          {!staff?.user_id && (
            <div className="border-t border-gray-200 pt-6">
              <div className={`border rounded-lg p-4 ${formData.email ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                <label className={`flex items-start ${formData.email ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                  <input
                    type="checkbox"
                    checked={createUserAccount}
                    onChange={(e) => setCreateUserAccount(e.target.checked)}
                    disabled={!formData.email}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:cursor-not-allowed"
                  />
                  <div className="ml-3 flex-1">
                    <span className="text-sm font-medium text-gray-900">
                      Create user account and send login invitation
                    </span>
                    {formData.email ? (
                      <p className="text-sm text-gray-600 mt-1">
                        An email will be sent to <strong>{formData.email}</strong> with instructions to set their password and log in.
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 mt-1">
                        Please enter an email address above to enable user account creation.
                      </p>
                    )}
                  </div>
                </label>

                {createUserAccount && formData.email && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      User Role
                    </label>
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value as any)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="guide">Guide</option>
                      <option value="client">Client</option>
                      <option value="admin">Admin</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      This determines what permissions the user will have in the system.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {staff?.user_id && (
            <div className="border-t border-gray-200 pt-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
                <User className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    User Account Linked
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    This staff member has a user account and can log in to the system.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Saving...' : 'Save Staff Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
