import { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Eye, Edit3, Loader, Mail, Calendar, CheckSquare, Square, Send, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SimplifiedShareModalProps {
  journeyId: string;
  journeyName: string;
  onClose: () => void;
}

interface JourneyShare {
  id: string;
  shared_with: string | null;
  master_staff_id: string | null;
  permission_level: 'view' | 'edit';
  created_at: string;
  user_email: string;
  user_name: string;
  share_all_days: boolean;
  shared_days?: string[];
  invitation_status: string;
  has_user_account: boolean;
}

interface JourneyDay {
  id: string;
  day_number: number;
  date: string;
  city_destination: string;
}

interface GuideStaff {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  has_user_account: boolean;
  user_id: string | null;
  availability: string;
  source: 'staff' | 'user';
}

export function SimplifiedShareModal({ journeyId, journeyName, onClose }: SimplifiedShareModalProps) {
  const [shares, setShares] = useState<JourneyShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('view');
  const [sharing, setSharing] = useState(false);
  const [availableGuides, setAvailableGuides] = useState<GuideStaff[]>([]);
  const [journeyDays, setJourneyDays] = useState<JourneyDay[]>([]);
  const [shareAllDays, setShareAllDays] = useState(true);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [sendingInvitations, setSendingInvitations] = useState(false);

  useEffect(() => {
    loadShares();
    loadGuides();
    loadJourneyDays();
  }, [journeyId]);

  const loadShares = async () => {
    try {
      const { data, error } = await supabase
        .from('journey_shares')
        .select(`
          id,
          shared_with,
          master_staff_id,
          permission_level,
          created_at,
          share_all_days,
          invitation_status,
          users!journey_shares_shared_with_fkey (
            email,
            name
          ),
          master_staff!journey_shares_master_staff_id_fkey (
            name,
            email,
            user_id
          )
        `)
        .eq('journey_id', journeyId)
        .eq('is_active', true)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedShares = await Promise.all((data || []).map(async (share: any) => {
        let sharedDayIds: string[] = [];

        if (!share.share_all_days) {
          const { data: dayData } = await supabase
            .from('journey_share_days')
            .select('day_id')
            .eq('journey_share_id', share.id);

          sharedDayIds = (dayData || []).map(d => d.day_id);
        }

        let userName = 'Unknown User';
        let userEmail = 'Unknown';
        let hasUserAccount = false;

        if (share.shared_with && share.users) {
          userName = share.users.name || 'Unknown User';
          userEmail = share.users.email || 'Unknown';
          hasUserAccount = true;
        } else if (share.master_staff_id && share.master_staff) {
          userName = share.master_staff.name || 'Unknown Staff';
          userEmail = share.master_staff.email || 'No email';
          hasUserAccount = share.master_staff.user_id !== null;
        }

        return {
          id: share.id,
          shared_with: share.shared_with,
          master_staff_id: share.master_staff_id,
          permission_level: share.permission_level,
          created_at: share.created_at,
          share_all_days: share.share_all_days,
          shared_days: sharedDayIds,
          user_email: userEmail,
          user_name: userName,
          invitation_status: share.invitation_status || 'not_needed',
          has_user_account: hasUserAccount,
        };
      }));

      setShares(formattedShares);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadGuides = async () => {
    try {
      const { data, error } = await supabase.rpc('get_shareable_guides');

      if (error) throw error;
      setAvailableGuides(data || []);
    } catch (err) {
      console.error('Error loading guides:', err);
    }
  };

  const loadJourneyDays = async () => {
    try {
      const { data, error } = await supabase
        .from('itinerary_days')
        .select('id, day_number, date, city_destination')
        .eq('journey_id', journeyId)
        .order('day_number', { ascending: true });

      if (error) throw error;
      const days = data || [];
      setJourneyDays(days);
      setSelectedDays(new Set(days.map(d => d.id)));
    } catch (err) {
      console.error('Error loading trip days:', err);
    }
  };

  const handleStaffSelect = (staffId: string) => {
    setSelectedStaffId(staffId);
    const selectedGuide = availableGuides.find(g => g.id === staffId);

    if (selectedGuide) {
      if (selectedGuide.email) {
        setEmailInput(selectedGuide.email);
        setShowEmailPrompt(false);
      } else if (selectedGuide.source === 'staff') {
        // Only show email prompt for staff without email
        setEmailInput('');
        setShowEmailPrompt(true);
      } else {
        // Users should always have emails
        setEmailInput('');
        setShowEmailPrompt(false);
      }
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setError('Please select a guide to share with.');
      return;
    }

    const selectedGuide = availableGuides.find(g => g.id === selectedStaffId);
    if (!selectedGuide) {
      setError('Selected user/guide not found.');
      return;
    }

    // Only require email for staff without email
    if (selectedGuide.source === 'staff' && !selectedGuide.email && !emailInput.trim()) {
      setError('Please provide an email address for this staff member.');
      return;
    }

    if (!shareAllDays && selectedDays.size === 0) {
      setError('Please select at least one day to share.');
      return;
    }

    setSharing(true);
    setError(null);

    try {
      // If email was provided and it's staff without email, update the master_staff record
      if (emailInput.trim() && !selectedGuide.email && selectedGuide.source === 'staff') {
        const { error: updateError } = await supabase
          .from('master_staff')
          .update({ email: emailInput.trim() })
          .eq('id', selectedStaffId);

        if (updateError) throw updateError;
      }

      // Check if already shared
      const alreadyShared = shares.find(s => {
        if (selectedGuide.source === 'user') {
          return s.shared_with === selectedStaffId;
        } else {
          return s.master_staff_id === selectedStaffId;
        }
      });

      if (alreadyShared) {
        setError('This journey is already shared with this user/guide.');
        setSharing(false);
        return;
      }

      // Check if there's an inactive share we can reactivate
      let existingShareQuery = supabase
        .from('journey_shares')
        .select('id')
        .eq('journey_id', journeyId);

      if (selectedGuide.source === 'user') {
        existingShareQuery = existingShareQuery.eq('shared_with', selectedStaffId);
      } else {
        existingShareQuery = existingShareQuery.eq('master_staff_id', selectedStaffId);
      }

      const { data: existingShare, error: existingShareError } = await existingShareQuery.maybeSingle();

      if (existingShareError) throw existingShareError;

      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setError('Not authenticated');
        setSharing(false);
        return;
      }

      const { data: currentUser, error: currentUserError } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUser.id)
        .maybeSingle();

      if (currentUserError) throw currentUserError;
      if (!currentUser) {
        setError('User profile not found.');
        setSharing(false);
        return;
      }

      let shareId: string;

      // Determine invitation status
      // Users always have accounts, staff may or may not
      let invitationStatus = 'not_needed';
      if (selectedGuide.source === 'user') {
        invitationStatus = 'not_needed';
      } else if (selectedGuide.source === 'staff' && !selectedGuide.has_user_account) {
        invitationStatus = 'pending';
      }

      if (existingShare) {
        // Reactivate existing share
        const { error: updateError } = await supabase
          .from('journey_shares')
          .update({
            is_active: true,
            revoked_at: null,
            permission_level: sharePermission,
            share_all_days: shareAllDays,
            shared_by: currentUser.id,
            invitation_status: invitationStatus,
          })
          .eq('id', existingShare.id);

        if (updateError) throw updateError;
        shareId = existingShare.id;

        // Delete old day shares
        const { error: deleteDaysError } = await supabase
          .from('journey_share_days')
          .delete()
          .eq('journey_share_id', shareId);

        if (deleteDaysError) throw deleteDaysError;
      } else {
        // Create new share
        const shareData: any = {
          journey_id: journeyId,
          shared_by: currentUser.id,
          permission_level: sharePermission,
          is_active: true,
          share_all_days: shareAllDays,
          invitation_status: invitationStatus,
        };

        // Assign either shared_with or master_staff_id based on source
        if (selectedGuide.source === 'user') {
          shareData.shared_with = selectedStaffId;
        } else {
          shareData.master_staff_id = selectedStaffId;
        }

        const { data: newShare, error: shareError } = await supabase
          .from('journey_shares')
          .insert(shareData)
          .select()
          .single();

        if (shareError) throw shareError;
        shareId = newShare.id;
      }

      if (!shareAllDays) {
        const dayInserts = Array.from(selectedDays).map(dayId => ({
          journey_share_id: shareId,
          day_id: dayId,
        }));

        const { error: daysError } = await supabase
          .from('journey_share_days')
          .insert(dayInserts);

        if (daysError) throw daysError;
      }

      await loadShares();
      setSelectedStaffId('');
      setEmailInput('');
      setSharePermission('view');
      setShareAllDays(true);
      setSelectedDays(new Set(journeyDays.map(d => d.id)));
      setShowEmailPrompt(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSharing(false);
    }
  };

  const handleSendInvitations = async () => {
    const pendingShares = shares.filter(s => s.invitation_status === 'pending');

    if (pendingShares.length === 0) {
      setError('No pending invitations to send.');
      return;
    }

    if (!confirm(`Send invitations to ${pendingShares.length} guide(s) without user accounts?`)) {
      return;
    }

    setSendingInvitations(true);
    setError(null);

    try {
      const now = new Date().toISOString();

      for (const share of pendingShares) {
        const { error: updateError } = await supabase
          .from('journey_shares')
          .update({
            invitation_status: 'sent',
            invitation_sent_at: now,
          })
          .eq('id', share.id);

        if (updateError) throw updateError;
      }

      await loadShares();
      alert(`Successfully marked ${pendingShares.length} invitation(s) as sent!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendingInvitations(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    if (!confirm('Remove access for this user?')) return;

    try {
      const { error } = await supabase
        .from('journey_shares')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
        })
        .eq('id', shareId);

      if (error) throw error;
      await loadShares();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdatePermission = async (shareId: string, newPermission: 'view' | 'edit') => {
    try {
      const { error } = await supabase
        .from('journey_shares')
        .update({ permission_level: newPermission })
        .eq('id', shareId);

      if (error) throw error;
      await loadShares();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleDaySelection = (dayId: string) => {
    const newSelected = new Set(selectedDays);
    if (newSelected.has(dayId)) {
      newSelected.delete(dayId);
    } else {
      newSelected.add(dayId);
    }
    setSelectedDays(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedDays.size === journeyDays.length) {
      setSelectedDays(new Set());
    } else {
      setSelectedDays(new Set(journeyDays.map(d => d.id)));
    }
  };

  const pendingInvitationsCount = shares.filter(s => s.invitation_status === 'pending').length;

  return (
    <div className="fixed inset-0 bg-brand-brown bg-opacity-20 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-soft-lg">
        <div className="p-6 border-b border-brand-tan flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-brand-charcoal mb-1">Share Journey</h2>
              <p className="text-sm text-brand-chocolate font-medium">{journeyName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-brand-brown-light hover:text-brand-charcoal transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 border-b border-brand-tan overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          {pendingInvitationsCount > 0 && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900">Pending Invitations</h4>
                  </div>
                  <p className="text-sm text-blue-800">
                    {pendingInvitationsCount} guide(s) without user accounts are waiting for invitations.
                  </p>
                </div>
                <button
                  onClick={handleSendInvitations}
                  disabled={sendingInvitations}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingInvitations ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Invitations
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleShare} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                Select User or Guide
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => handleStaffSelect(e.target.value)}
                className="w-full px-4 py-3 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent shadow-soft font-medium text-brand-charcoal bg-white"
                required
              >
                <option value="">-- Select a user or guide --</option>
                {availableGuides.map((guide) => (
                  <option key={guide.id} value={guide.id}>
                    {guide.name} {guide.email ? `(${guide.email})` : '(No email)'} - {guide.source === 'user' ? 'User' : 'Staff'} {!guide.has_user_account && '(No Account)'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-brand-brown-light mt-1 font-medium">
                All users and staff from the database are shown, including guides, drivers, and managers.
              </p>
            </div>

            {showEmailPrompt && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-1">Email Required</h4>
                    <p className="text-sm text-amber-800 mb-3">
                      This guide doesn't have an email address. Please provide one to continue.
                    </p>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-amber-600" />
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="guide@example.com"
                        className="w-full pl-10 pr-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedStaffId && !showEmailPrompt && emailInput && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800 font-medium">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Will share with: {emailInput}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                Permission Level
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSharePermission('view')}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all font-semibold ${
                    sharePermission === 'view'
                      ? 'border-brand-terracotta bg-brand-terracotta bg-opacity-10 text-brand-charcoal'
                      : 'border-brand-tan bg-white text-brand-chocolate hover:border-brand-terracotta'
                  }`}
                >
                  <Eye className="w-5 h-5" />
                  <span>Viewer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSharePermission('edit')}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all font-semibold ${
                    sharePermission === 'edit'
                      ? 'border-brand-terracotta bg-brand-terracotta bg-opacity-10 text-brand-charcoal'
                      : 'border-brand-tan bg-white text-brand-chocolate hover:border-brand-terracotta'
                  }`}
                >
                  <Edit3 className="w-5 h-5" />
                  <span>Editor</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-3">
                <Calendar className="w-4 h-4 inline mr-2" />
                Days to Share
              </label>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShareAllDays(!shareAllDays)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all font-semibold ${
                    shareAllDays
                      ? 'border-brand-terracotta bg-brand-terracotta bg-opacity-10 text-brand-charcoal'
                      : 'border-brand-tan bg-white text-brand-chocolate hover:border-brand-terracotta'
                  }`}
                >
                  {shareAllDays ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  <span>Share All Days</span>
                </button>

                {!shareAllDays && journeyDays.length > 0 && (
                  <div className="bg-brand-tan-light rounded-lg p-4 space-y-2 max-h-80 overflow-y-auto">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-sm text-brand-terracotta hover:text-brand-terracotta-light font-semibold mb-2"
                    >
                      {selectedDays.size === journeyDays.length ? 'Deselect All' : 'Select All'}
                    </button>
                    {journeyDays.map((day) => (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleDaySelection(day.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white hover:bg-brand-beige-light border border-brand-tan transition-colors"
                      >
                        {selectedDays.has(day.id) ? (
                          <CheckSquare className="w-5 h-5 text-brand-terracotta flex-shrink-0" />
                        ) : (
                          <Square className="w-5 h-5 text-brand-brown-light flex-shrink-0" />
                        )}
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-brand-charcoal">
                            Day {day.day_number} - {day.city_destination}
                          </div>
                          <div className="text-xs text-brand-chocolate">
                            {new Date(day.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={sharing || !selectedStaffId}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-terracotta hover:bg-brand-terracotta-light text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-soft"
            >
              {sharing ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Share Journey
                </>
              )}
            </button>
          </form>
        </div>

        <div className="p-6 flex-shrink-0">
          <h3 className="text-lg font-bold text-brand-charcoal mb-4">People with Access</h3>
          <div className="max-h-48 overflow-y-auto pr-2 -mr-2 custom-scrollbar">

          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader className="w-8 h-8 text-brand-terracotta animate-spin mb-3" />
              <p className="text-brand-chocolate font-medium">Loading...</p>
            </div>
          ) : shares.length === 0 ? (
            <div className="text-center py-8 bg-brand-tan-light rounded-lg">
              <UserPlus className="w-12 h-12 text-brand-brown-light mx-auto mb-3" />
              <p className="text-brand-chocolate font-medium">No one has access yet</p>
              <p className="text-sm text-brand-brown-light mt-1">Share this journey using the form above</p>
            </div>
          ) : (
            <div className="space-y-3 pr-1">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="bg-brand-tan-light rounded-lg p-4 border border-brand-tan shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-brand-charcoal mb-1">
                        {share.user_name}
                        {!share.has_user_account && (
                          <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                            No Account
                          </span>
                        )}
                        {share.invitation_status === 'pending' && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            Invitation Pending
                          </span>
                        )}
                        {share.invitation_status === 'sent' && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            Invitation Sent
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-brand-chocolate font-medium mb-2">{share.user_email}</p>
                      {!share.share_all_days && share.shared_days && (
                        <div className="mb-2">
                          <p className="text-xs text-brand-terracotta font-semibold">
                            Shared Days: {share.shared_days.length} of {journeyDays.length}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {journeyDays
                              .filter(day => share.shared_days?.includes(day.id))
                              .map(day => (
                                <span
                                  key={day.id}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-terracotta bg-opacity-20 text-brand-charcoal"
                                >
                                  Day {day.day_number}
                                </span>
                              ))
                            }
                          </div>
                        </div>
                      )}
                      {share.share_all_days && (
                        <p className="text-xs text-brand-brown-light mb-2">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          Access to all days
                        </p>
                      )}
                      <p className="text-xs text-brand-brown-light">
                        Shared on {new Date(share.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={share.permission_level}
                        onChange={(e) => handleUpdatePermission(share.id, e.target.value as 'view' | 'edit')}
                        className="px-3 py-1.5 border border-brand-tan rounded-lg text-xs font-semibold text-brand-charcoal bg-white focus:ring-2 focus:ring-brand-terracotta focus:border-transparent shadow-soft"
                      >
                        <option value="view">Viewer</option>
                        <option value="edit">Editor</option>
                      </select>
                      <button
                        onClick={() => handleRemoveShare(share.id)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>

        {!loading && shares.length > 0 && (
          <div className="p-4 border-t border-brand-tan bg-brand-beige-light flex-shrink-0">
            <p className="text-sm text-brand-chocolate text-center font-medium mb-3">
              {shares.length} {shares.length === 1 ? 'person has' : 'people have'} access to this journey
            </p>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-brand-terracotta hover:bg-brand-terracotta-light text-white font-semibold rounded-lg transition-colors shadow-soft"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
