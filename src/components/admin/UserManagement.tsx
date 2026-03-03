import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Shield, UserCircle, X, Search, CheckCircle, XCircle, Loader, Users, Calendar, Mail, User, Filter, Bell, KeyRound, Edit, Phone, FileText, Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { uploadFile, deleteFile } from '../../lib/fileUpload';
import type { User as UserType } from '../../lib/database.types';
import { UserSharedJourneysModal } from './UserSharedJourneysModal';
import { ConfirmDialog } from './ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';

interface UserManagementProps {
  onNavigateToJourney?: (journeyId: string) => void;
}

type UserStatus = 'all' | 'pending' | 'active' | 'rejected' | 'inactive' | 'deleted';

export default function UserManagement({ onNavigateToJourney }: UserManagementProps = {}) {
  const [users, setUsers] = useState<UserType[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus>('all');
  const [confirmAction, setConfirmAction] = useState<{ userId: string; action: 'approve' | 'reject' | 'delete' | 'permanentDelete'; userName: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [newUserNotification, setNewUserNotification] = useState<string | null>(null);
  const { userProfile } = useAuth();

  useEffect(() => {
    fetchUsers();

    const subscription = supabase
      .channel('user-registrations')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'users',
          filter: 'status=eq.pending'
        },
        (payload) => {
          const newUser = payload.new as UserType;
          setNewUserNotification(`New user registration: ${newUser.name} (${newUser.email})`);
          fetchUsers();

          setTimeout(() => {
            setNewUserNotification(null);
          }, 10000);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, status, approved_at, phone_number, tour_license_url, tour_license_expiry, created_at, approved_by, rejection_reason, deleted_at, deleted_by')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(query) ||
        user.name.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleApproveUser = async (userId: string) => {
    try {
      if (!userProfile) return;

      const { error } = await supabase
        .from('users')
        .update({
          status: 'active',
          approved_by: userProfile.id,
          approved_at: new Date().toISOString(),
          rejection_reason: null
        })
        .eq('id', userId);

      if (error) throw error;

      alert('User approved successfully!');
      setConfirmAction(null);
      await fetchUsers();
    } catch (error: any) {
      console.error('Error approving user:', error);
      alert(`Failed to approve user: ${error.message}`);
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      if (!userProfile) return;

      const { error } = await supabase
        .from('users')
        .update({
          status: 'rejected',
          approved_by: userProfile.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason || 'No reason provided'
        })
        .eq('id', userId);

      if (error) throw error;

      alert('User rejected successfully.');
      setConfirmAction(null);
      setRejectionReason('');
      await fetchUsers();
    } catch (error: any) {
      console.error('Error rejecting user:', error);
      alert(`Failed to reject user: ${error.message}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      if (!userProfile) return;

      const { error } = await supabase
        .from('users')
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          deleted_by: userProfile.id
        })
        .eq('id', userId);

      if (error) throw error;

      setConfirmAction(null);
      alert('User deleted successfully! The user can no longer log in, but their data is preserved.');
      await fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(`Failed to delete user: ${error.message}`);
    }
  };

  const handlePermanentDeleteUser = async (userId: string) => {
    try {
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      const { error: transferError } = await supabase.rpc('transfer_user_data_to_admin', {
        p_user_id: userId,
        p_deleted_by: userProfile.id
      });

      if (transferError) {
        console.error('Data transfer error:', transferError);
        throw new Error(`Failed to transfer user data: ${transferError.message}`);
      }

      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (deleteError) {
        console.error('Permanent delete error:', deleteError);
        throw new Error(`Failed to delete user: ${deleteError.message}`);
      }

      setConfirmAction(null);
      alert('User permanently deleted. All their data has been transferred to the admin account with notes about the original owner.');
      await fetchUsers();
    } catch (error: any) {
      console.error('Error permanently deleting user:', error);
      alert(`Failed to permanently delete user: ${error.message}`);
    }
  };

  const handleRestoreUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          status: 'active',
          deleted_at: null,
          deleted_by: null
        })
        .eq('id', userId);

      if (error) throw error;

      alert('User restored successfully!');
      await fetchUsers();
    } catch (error: any) {
      console.error('Error restoring user:', error);
      alert(`Failed to restore user: ${error.message}`);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'inactive' | 'rejected') => {
    try {
      if (!userProfile) return;

      const updateData: any = { status: newStatus };

      if (newStatus === 'rejected') {
        const reason = prompt('Enter reason for rejection (optional):');
        updateData.rejection_reason = reason || 'No reason provided';
        updateData.approved_by = userProfile.id;
        updateData.approved_at = new Date().toISOString();
      } else if (newStatus === 'active') {
        updateData.rejection_reason = null;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      alert(`User status updated to ${newStatus}!`);
      await fetchUsers();
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert(`Failed to update status: ${error.message}`);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'guide' | 'client') => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update user role');
    }
  };

  const handleRequestPasswordReset = async (userEmail: string, userName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      alert(`Password reset email sent to ${userName} (${userEmail}). They will receive an email with a link to reset their password.`);
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      alert(`Failed to send password reset email: ${error.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
            <Loader className="w-3 h-3" />
            Pending
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
            <XCircle className="w-3 h-3" />
            Inactive
          </span>
        );
      case 'deleted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-200 text-red-900 text-xs font-semibold rounded-full">
            <Trash2 className="w-3 h-3" />
            Deleted
          </span>
        );
      default:
        return null;
    }
  };

  const getPendingCount = () => users.filter(u => u.status === 'pending').length;

  return (
    <div className="space-y-6">
      {newUserNotification && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg shadow-soft animate-pulse">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">{newUserNotification}</p>
              <p className="text-sm text-amber-700 mt-1">Please review and approve or reject this registration.</p>
            </div>
            <button
              onClick={() => setNewUserNotification(null)}
              className="ml-auto text-amber-600 hover:text-amber-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-soft p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-brand-charcoal flex items-center gap-2">
              <Users className="w-7 h-7 text-brand-terracotta" />
              User Management
            </h2>
            <p className="text-sm text-brand-chocolate mt-1">
              Manage users, approvals, and access levels
            </p>
          </div>
          <div className="flex items-center gap-4">
            {getPendingCount() > 0 && (
              <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg font-semibold">
                {getPendingCount()} Pending {getPendingCount() === 1 ? 'Request' : 'Requests'}
              </div>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-brand-terracotta hover:bg-brand-terracotta-light text-white font-semibold rounded-lg transition-colors shadow-soft"
            >
              <Plus className="w-5 h-5" />
              <span>Add User</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-brown-light" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-brown-light" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as UserStatus)}
              className="pl-10 pr-8 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent appearance-none bg-white cursor-pointer"
            >
              <option value="all">All Users</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="rejected">Rejected</option>
              <option value="deleted">Deleted</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader className="w-10 h-10 text-brand-terracotta animate-spin mb-3" />
            <p className="text-brand-chocolate font-medium">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-brand-brown-light mx-auto mb-4" />
            <p className="text-brand-chocolate font-medium mb-2">No users found</p>
            <p className="text-sm text-brand-brown-light">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter'
                : 'No user registrations yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-brand-tan">
                  <th className="text-left py-3 px-4 font-semibold text-brand-charcoal">User Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-brand-charcoal">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-brand-charcoal">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-brand-charcoal">Created</th>
                  <th className="text-left py-3 px-4 font-semibold text-brand-charcoal">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-brand-charcoal">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-brand-tan hover:bg-brand-beige-light transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {user.role === 'admin' ? (
                          <Shield className="w-5 h-5 text-brand-terracotta" />
                        ) : (
                          <UserCircle className="w-5 h-5 text-brand-brown-light" />
                        )}
                        <span className="font-medium text-brand-charcoal">{user.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-brand-terracotta hover:text-brand-terracotta-light hover:underline font-medium transition-all cursor-pointer flex items-center gap-2"
                          title="View shared journeys"
                        >
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">{user.email}</span>
                        </button>
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-1.5 hover:bg-brand-beige-light rounded transition-colors"
                          title="Edit user details"
                        >
                          <Edit className="w-4 h-4 text-brand-chocolate" />
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {user.status === 'active' ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'guide' | 'client')}
                          className="px-3 py-1 border border-brand-tan rounded-lg text-sm font-medium text-brand-charcoal bg-white focus:ring-2 focus:ring-brand-terracotta focus:border-transparent capitalize shadow-soft"
                        >
                          <option value="admin">Admin</option>
                          <option value="guide">Guide</option>
                          <option value="client">Client</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.role === 'admin'
                            ? 'bg-brand-terracotta-light text-brand-chocolate'
                            : 'bg-brand-cyan bg-opacity-30 text-brand-brown'
                        }`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-brand-chocolate text-sm">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        {new Date(user.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {user.status === 'pending' && (
                          <>
                            <button
                              onClick={() => setConfirmAction({ userId: user.id, action: 'approve', userName: user.name })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-lg transition-colors"
                              title="Approve user"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => setConfirmAction({ userId: user.id, action: 'reject', userName: user.name })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-lg transition-colors"
                              title="Reject user"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>
                          </>
                        )}
                        {user.status === 'rejected' && (
                          <>
                            {user.rejection_reason && (
                              <div className="text-xs text-brand-brown-light italic mr-2">
                                Reason: {user.rejection_reason}
                              </div>
                            )}
                            <button
                              onClick={() => handleStatusChange(user.id, 'active')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-lg transition-colors"
                              title="Approve user"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Activate
                            </button>
                          </>
                        )}
                        {user.status === 'active' && (
                          <>
                            <div className="text-xs text-green-600 font-medium mr-2">
                              Approved {user.approved_at && `on ${new Date(user.approved_at).toLocaleDateString()}`}
                            </div>
                            <button
                              onClick={() => handleRequestPasswordReset(user.email, user.name)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors"
                              title="Send password reset email to user"
                            >
                              <KeyRound className="w-4 h-4" />
                              Reset Password
                            </button>
                            <button
                              onClick={() => setConfirmAction({ userId: user.id, action: 'delete', userName: user.name })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white font-semibold text-sm rounded-lg transition-colors"
                              title="Deactivate user (soft delete)"
                            >
                              Deactivate
                            </button>
                          </>
                        )}
                        {user.status === 'inactive' && (
                          <>
                            <div className="text-xs text-gray-600 font-medium mr-2">
                              Inactive
                            </div>
                            <button
                              onClick={() => handleStatusChange(user.id, 'active')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-lg transition-colors"
                              title="Reactivate user"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Activate
                            </button>
                            <button
                              onClick={() => setConfirmAction({ userId: user.id, action: 'permanentDelete', userName: user.name })}
                              className="text-red-600 hover:text-red-700 transition-colors p-2 hover:bg-red-50 rounded-lg"
                              title="Permanently delete user from database"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        {user.status === 'deleted' && (
                          <>
                            <div className="text-xs text-red-600 font-medium mr-2">
                              Deleted {user.deleted_at && `on ${new Date(user.deleted_at).toLocaleDateString()}`}
                            </div>
                            <button
                              onClick={() => handleRestoreUser(user.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors"
                              title="Restore user"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Restore
                            </button>
                            <button
                              onClick={() => setConfirmAction({ userId: user.id, action: 'permanentDelete', userName: user.name })}
                              className="text-red-600 hover:text-red-700 transition-colors p-2 hover:bg-red-50 rounded-lg"
                              title="Permanently delete user from database"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 text-sm text-brand-brown-light">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {showCreateModal && (
        <CreateUserModal
          onClose={() => {
            setShowCreateModal(false);
            fetchUsers();
          }}
        />
      )}

      {selectedUser && (
        <UserSharedJourneysModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onNavigateToJourney={(journeyId) => {
            setSelectedUser(null);
            if (onNavigateToJourney) {
              onNavigateToJourney(journeyId);
            }
          }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => {
            setEditingUser(null);
            fetchUsers();
          }}
        />
      )}

      {confirmAction && (
        confirmAction.action === 'approve' ? (
          <ConfirmDialog
            isOpen={true}
            title="Approve User"
            message={`Are you sure you want to approve ${confirmAction.userName}'s registration? They will be able to access the application immediately.`}
            confirmText="Approve"
            cancelText="Cancel"
            type="warning"
            onConfirm={() => handleApproveUser(confirmAction.userId)}
            onClose={() => setConfirmAction(null)}
          />
        ) : confirmAction.action === 'reject' ? (
          <div className="fixed inset-0 bg-brand-brown bg-opacity-20 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-brand-charcoal mb-2">Reject User</h3>
              <p className="text-brand-chocolate mb-4">
                Are you sure you want to reject {confirmAction.userName}'s registration?
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-brand-charcoal mb-2">
                  Reason for rejection (optional)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="w-full px-3 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setConfirmAction(null);
                    setRejectionReason('');
                  }}
                  className="flex-1 px-4 py-2 border border-brand-tan text-brand-chocolate hover:bg-brand-beige-light rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRejectUser(confirmAction.userId)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ) : confirmAction.action === 'delete' ? (
          <ConfirmDialog
            isOpen={true}
            title="Deactivate User"
            message={`Are you sure you want to deactivate ${confirmAction.userName}? They will no longer be able to log in, but their data will be preserved. You can restore them later.`}
            confirmText="Deactivate"
            cancelText="Cancel"
            type="danger"
            onConfirm={() => handleDeleteUser(confirmAction.userId)}
            onClose={() => setConfirmAction(null)}
          />
        ) : (
          <ConfirmDialog
            isOpen={true}
            title="Permanently Delete User"
            message={`⚠️ WARNING: Are you sure you want to PERMANENTLY delete ${confirmAction.userName} from the database? This action CANNOT be undone and will remove all their data. This may fail if the user has associated records in the system.`}
            confirmText="Permanently Delete"
            cancelText="Cancel"
            type="danger"
            onConfirm={() => handlePermanentDeleteUser(confirmAction.userId)}
            onClose={() => setConfirmAction(null)}
          />
        )
      )}
    </div>
  );
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'guide' | 'client'>('guide');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [bio, setBio] = useState('');
  const [tourLicenseExpiry, setTourLicenseExpiry] = useState('');
  const [sendInvitation, setSendInvitation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [tourLicenseFile, setTourLicenseFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const tourLicenseInputRef = useRef<HTMLInputElement>(null);

  const handleProfileImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Profile image must be less than 10MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Profile image must be an image file');
        return;
      }
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleTourLicenseSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Tour license document must be less than 10MB');
        return;
      }
      setTourLicenseFile(file);
      setError('');
    }
  };

  const removeProfileImage = () => {
    setProfileImageFile(null);
    setProfileImagePreview(null);
    if (profileImageInputRef.current) {
      profileImageInputRef.current.value = '';
    }
  };

  const removeTourLicense = () => {
    setTourLicenseFile(null);
    if (tourLicenseInputRef.current) {
      tourLicenseInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Upload files first to get URLs before creating user
      let profileImageUrl: string | null = null;
      let tourLicenseUrl: string | null = null;

      // Generate a temporary ID for file uploads (will be replaced with actual user ID)
      const tempId = crypto.randomUUID();

      if (profileImageFile) {
        const result = await uploadFile(
          profileImageFile,
          'profile-images',
          tempId,
          { compress: true }
        );
        if (!result.success) {
          throw new Error(`Failed to upload profile image: ${result.error}`);
        }
        profileImageUrl = result.fileUrl || null;
      }

      if (tourLicenseFile) {
        const result = await uploadFile(
          tourLicenseFile,
          'profile-images',
          `${tempId}/license`,
          { compress: false }
        );
        if (!result.success) {
          throw new Error(`Failed to upload tour license: ${result.error}`);
        }
        tourLicenseUrl = result.fileUrl || null;
      }

      // Get auth token
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('No active session');
      }

      // Call edge function to create user
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: sendInvitation ? undefined : password,
          name,
          role,
          phone_number: phoneNumber || null,
          job_title: jobTitle || null,
          bio: bio || null,
          profile_picture_url: profileImageUrl,
          tour_license_url: tourLicenseUrl,
          tour_license_expiry: tourLicenseExpiry || null,
          send_invitation: sendInvitation,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create user');
      }

      if (sendInvitation) {
        alert(`Invitation email sent to ${email}! They will receive an email to set up their account.`);
      } else {
        alert('User created successfully!');
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-brand-brown bg-opacity-20 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-soft-lg">
        <div className="sticky top-0 bg-white p-6 border-b border-brand-tan z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-brand-charcoal">Create New User</h2>
            <button
              onClick={onClose}
              className="text-brand-brown-light hover:text-brand-charcoal transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-brand-charcoal mb-1">
              <User className="w-4 h-4 inline mr-1" />
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent shadow-soft"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-charcoal mb-1">
              <Mail className="w-4 h-4 inline mr-1" />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent shadow-soft"
              required
              disabled={loading}
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sendInvitation}
                onChange={(e) => setSendInvitation(e.target.checked)}
                className="w-4 h-4 text-brand-terracotta border-brand-tan rounded focus:ring-brand-terracotta"
                disabled={loading}
              />
              <span className="text-sm font-semibold text-brand-charcoal">
                Send invitation email (user will set their own password)
              </span>
            </label>
            <p className="text-xs text-brand-brown-light mt-2 ml-6">
              If checked, an invitation email will be sent to the user. They will set their own password when they accept the invitation.
            </p>
          </div>

          {!sendInvitation && (
            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-1">
                <KeyRound className="w-4 h-4 inline mr-1" />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent shadow-soft"
                required={!sendInvitation}
                minLength={6}
                disabled={loading}
              />
              <p className="text-xs text-brand-brown-light mt-1 font-medium">Minimum 6 characters</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-brand-charcoal mb-1">
              <Shield className="w-4 h-4 inline mr-1" />
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'guide' | 'client')}
              className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent shadow-soft font-medium text-brand-charcoal"
              disabled={loading}
            >
              <option value="guide">Guide</option>
              <option value="client">Client</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-charcoal mb-1">
              <Phone className="w-4 h-4 inline mr-1" />
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent shadow-soft"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-charcoal mb-1">Job Title (Optional)</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g., Senior Tour Guide"
              className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent shadow-soft"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-charcoal mb-1">Bio (Optional)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief biography or description..."
              className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent shadow-soft"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="border-t border-brand-tan pt-4">
            <label className="block text-sm font-semibold text-brand-charcoal mb-2">
              <ImageIcon className="w-4 h-4 inline mr-1" />
              Profile Image (Optional)
            </label>

            {profileImagePreview ? (
              <div className="relative inline-block">
                <img
                  src={profileImagePreview}
                  alt="Profile preview"
                  className="w-32 h-32 rounded-lg object-cover border-2 border-brand-tan"
                />
                <button
                  type="button"
                  onClick={removeProfileImage}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                  disabled={loading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <input
                  ref={profileImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageSelect}
                  className="hidden"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => profileImageInputRef.current?.click()}
                  className="px-4 py-2 bg-brand-beige-light hover:bg-brand-tan text-brand-charcoal rounded-lg transition-colors flex items-center gap-2"
                  disabled={loading}
                >
                  <Upload className="w-4 h-4" />
                  Upload Profile Image
                </button>
                <p className="text-xs text-brand-brown-light mt-1">JPG, PNG - max 10MB</p>
              </div>
            )}
          </div>

          {role === 'guide' && (
            <div className="border-t border-brand-tan pt-4">
              <h3 className="text-lg font-semibold text-brand-charcoal mb-3">Tour License Information</h3>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Tour License Document (Optional)
                </label>

                {tourLicenseFile ? (
                  <div className="flex items-center gap-3 p-3 bg-brand-beige-light rounded-lg">
                    <FileText className="w-5 h-5 text-brand-chocolate" />
                    <span className="text-sm text-brand-charcoal flex-1">{tourLicenseFile.name}</span>
                    <button
                      type="button"
                      onClick={removeTourLicense}
                      className="text-red-600 hover:text-red-700 transition-colors"
                      disabled={loading}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={tourLicenseInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleTourLicenseSelect}
                      className="hidden"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => tourLicenseInputRef.current?.click()}
                      className="px-4 py-2 bg-brand-beige-light hover:bg-brand-tan text-brand-charcoal rounded-lg transition-colors flex items-center gap-2"
                      disabled={loading}
                    >
                      <Upload className="w-4 h-4" />
                      Upload License Document
                    </button>
                    <p className="text-xs text-brand-brown-light mt-1">PDF, Word, Image - max 10MB</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-charcoal mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  License Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={tourLicenseExpiry}
                  onChange={(e) => setTourLicenseExpiry(e.target.value)}
                  className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent shadow-soft"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4 border-t border-brand-tan">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-brand-tan text-brand-charcoal font-semibold hover:bg-brand-tan-light rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-brand-terracotta hover:bg-brand-terracotta-light text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-soft"
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose }: { user: UserType; onClose: () => void }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phoneNumber, setPhoneNumber] = useState(user.phone_number || '');
  const [tourLicenseUrl, setTourLicenseUrl] = useState(user.tour_license_url || '');
  const [tourLicenseExpiry, setTourLicenseExpiry] = useState(user.tour_license_expiry || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isLicenseExpiringSoon = () => {
    if (!tourLicenseExpiry) return false;
    const expiryDate = new Date(tourLicenseExpiry);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const isLicenseExpired = () => {
    if (!tourLicenseExpiry) return false;
    const expiryDate = new Date(tourLicenseExpiry);
    const today = new Date();
    return expiryDate < today;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name,
          email,
          phone_number: phoneNumber || null,
          tour_license_url: tourLicenseUrl || null,
          tour_license_expiry: tourLicenseExpiry || null
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      alert('User details updated successfully!');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-brand-brown bg-opacity-20 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-soft-lg">
        <div className="sticky top-0 bg-white border-b border-brand-tan p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-brand-charcoal">Edit User Details</h2>
              <p className="text-sm text-brand-chocolate mt-1">
                Update {user.name}'s profile information
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-brand-brown-light hover:text-brand-charcoal transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="bg-brand-beige-light p-4 rounded-lg mb-4">
            <p className="text-sm text-brand-chocolate font-medium">
              Role: <span className="text-brand-charcoal capitalize">{user.role}</span>
            </p>
            <p className="text-sm text-brand-chocolate font-medium mt-1">
              Status: <span className="text-brand-charcoal capitalize">{user.status}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-charcoal mb-1">
              <User className="w-4 h-4 inline mr-1" />
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent shadow-soft"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-charcoal mb-1">
              <Mail className="w-4 h-4 inline mr-1" />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent shadow-soft"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-charcoal mb-1">
              <Phone className="w-4 h-4 inline mr-1" />
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent shadow-soft"
              disabled={loading}
            />
          </div>

          {user.role === 'guide' && (
            <>
              <div className="border-t border-brand-tan pt-4 mt-4">
                <h3 className="text-lg font-semibold text-brand-charcoal mb-3">Tour License Information</h3>

                <div>
                  <label className="block text-sm font-semibold text-brand-charcoal mb-1">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Tour License URL
                  </label>
                  <input
                    type="url"
                    value={tourLicenseUrl}
                    onChange={(e) => setTourLicenseUrl(e.target.value)}
                    placeholder="https://example.com/license.pdf"
                    className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent shadow-soft"
                    disabled={loading}
                  />
                  <p className="text-xs text-brand-brown-light mt-1">URL to the tour license document</p>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-brand-charcoal mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    License Expiry Date
                  </label>
                  <input
                    type="date"
                    value={tourLicenseExpiry}
                    onChange={(e) => setTourLicenseExpiry(e.target.value)}
                    className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent shadow-soft"
                    disabled={loading}
                  />

                  {isLicenseExpired() && (
                    <div className="mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg flex items-start gap-2">
                      <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span className="text-xs font-medium">License has expired! Please update it.</span>
                    </div>
                  )}

                  {isLicenseExpiringSoon() && !isLicenseExpired() && (
                    <div className="mt-2 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-lg flex items-start gap-2">
                      <Bell className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span className="text-xs font-medium">License expires in less than 30 days!</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-brand-tan text-brand-charcoal font-semibold hover:bg-brand-tan-light rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-brand-terracotta hover:bg-brand-terracotta-light text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-soft"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
