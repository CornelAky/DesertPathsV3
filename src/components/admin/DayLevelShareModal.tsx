import { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Loader, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DayLevelShareModalProps {
  journeyId: string;
  dayId: string;
  dayNumber: number;
  journeyName: string;
  onClose: () => void;
}

interface DayShare {
  id: string;
  shared_with: string;
  user_email: string;
  user_name: string;
  permission_level: 'view' | 'edit';
}

export function DayLevelShareModal({ journeyId, dayId, dayNumber, journeyName, onClose }: DayLevelShareModalProps) {
  const [shares, setShares] = useState<DayShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [sharing, setSharing] = useState(false);
  const [availableGuides, setAvailableGuides] = useState<Array<{id: string, email: string, name: string}>>([]);

  useEffect(() => {
    loadShares();
    loadGuides();
  }, [journeyId, dayId]);

  const loadShares = async () => {
    try {
      setLoading(true);

      const { data: dayShares, error: daySharesError } = await supabase
        .from('journey_share_days')
        .select(`
          journey_share_id,
          journey_shares!inner (
            id,
            shared_with,
            permission_level,
            is_active,
            users!journey_shares_shared_with_fkey (
              email,
              name,
              role
            )
          )
        `)
        .eq('day_id', dayId);

      if (daySharesError) throw daySharesError;

      const formattedShares: DayShare[] = (dayShares || [])
        .filter((ds: any) => ds.journey_shares?.is_active && ds.journey_shares.users?.role === 'guide')
        .map((ds: any) => ({
          id: ds.journey_shares.id,
          shared_with: ds.journey_shares.shared_with,
          user_email: ds.journey_shares.users?.email || 'Unknown',
          user_name: ds.journey_shares.users?.name || 'Unknown User',
          permission_level: ds.journey_shares.permission_level,
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
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role')
        .eq('role', 'guide')
        .in('status', ['active', 'pending'])
        .order('name', { ascending: true });

      if (error) throw error;
      setAvailableGuides(data || []);
    } catch (err) {
      console.error('Error loading guides:', err);
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmail.trim()) return;

    setSharing(true);
    setError(null);

    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', shareEmail.trim())
        .eq('role', 'guide')
        .maybeSingle();

      if (userError) throw userError;
      if (!userData) {
        setError('Guide not found. Please make sure the email is registered as a guide.');
        setSharing(false);
        return;
      }

      const alreadyShared = shares.find(s => s.shared_with === userData.id);
      if (alreadyShared) {
        setError('This day is already shared with this guide.');
        setSharing(false);
        return;
      }

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
        setError('User profile not found. Please contact support.');
        setSharing(false);
        return;
      }

      const { data: existingShare, error: existingShareError } = await supabase
        .from('journey_shares')
        .select('id, share_all_days')
        .eq('journey_id', journeyId)
        .eq('shared_with', userData.id)
        .eq('is_active', true)
        .maybeSingle();

      if (existingShareError && existingShareError.code !== 'PGRST116') throw existingShareError;

      let shareId: string;

      if (existingShare) {
        if (existingShare.share_all_days) {
          setError('This guide already has access to all days of this journey.');
          setSharing(false);
          return;
        }
        shareId = existingShare.id;

        const { data: existingDayShare } = await supabase
          .from('journey_share_days')
          .select('id')
          .eq('journey_share_id', shareId)
          .eq('day_id', dayId)
          .maybeSingle();

        if (existingDayShare) {
          setError('This day is already shared with this guide.');
          setSharing(false);
          return;
        }
      } else {
        const { data: newShare, error: shareError } = await supabase
          .from('journey_shares')
          .insert({
            journey_id: journeyId,
            shared_by: currentUser.id,
            shared_with: userData.id,
            permission_level: 'view',
            is_active: true,
            share_all_days: false,
          })
          .select()
          .single();

        if (shareError) throw shareError;
        shareId = newShare.id;
      }

      const { error: dayShareError } = await supabase
        .from('journey_share_days')
        .insert({
          journey_share_id: shareId,
          day_id: dayId,
        });

      if (dayShareError) throw dayShareError;

      await loadShares();
      setShareEmail('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSharing(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    if (!confirm('Remove this guide\'s access to this day?')) return;

    try {
      const { error: deleteDayError } = await supabase
        .from('journey_share_days')
        .delete()
        .eq('journey_share_id', shareId)
        .eq('day_id', dayId);

      if (deleteDayError) throw deleteDayError;

      const { data: remainingDays } = await supabase
        .from('journey_share_days')
        .select('id')
        .eq('journey_share_id', shareId);

      if (!remainingDays || remainingDays.length === 0) {
        const { error: deactivateError } = await supabase
          .from('journey_shares')
          .update({
            is_active: false,
            revoked_at: new Date().toISOString(),
          })
          .eq('id', shareId);

        if (deactivateError) throw deactivateError;
      }

      await loadShares();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Share Day {dayNumber} with Guide (View Access)</h2>
            <p className="text-sm text-slate-600 mt-1">{journeyName}</p>
            <p className="text-xs text-blue-600 mt-1">This gives guides view-only access. To assign staff to work this day, use "Assign Staff".</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleShare} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Share with Guide
              </label>
              <div className="flex gap-2">
                <select
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a guide...</option>
                  {availableGuides.map((guide) => (
                    <option key={guide.id} value={guide.email}>
                      {guide.name} ({guide.email})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={sharing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {sharing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Sharing...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Share</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                This will share only Day {dayNumber} with the guide. Client information will not be visible. If this guide already has access to other days, this day will be added to their existing share.
              </p>
            </div>
          </form>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : shares.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Guides with Access to This Day
              </h3>
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{share.user_name}</p>
                      <p className="text-sm text-slate-600">{share.user_email}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveShare(share.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove access"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No guides have access to this day yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
