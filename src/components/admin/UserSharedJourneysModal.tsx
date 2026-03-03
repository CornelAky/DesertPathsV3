import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Calendar, ExternalLink, Eye, Edit3, Loader, Trash2 } from 'lucide-react';
import type { User as UserType } from '../../lib/database.types';
import { ConfirmDialog } from './ConfirmDialog';

interface SharedJourney {
  id: string;
  journey_id: string;
  permission_level: 'view' | 'edit';
  created_at: string;
  journey: {
    id: string;
    journey_name: string;
    start_date: string;
    end_date: string;
    status: string;
  };
}

interface UserSharedJourneysModalProps {
  user: UserType;
  onClose: () => void;
  onNavigateToJourney: (journeyId: string) => void;
}

export function UserSharedJourneysModal({ user, onClose, onNavigateToJourney }: UserSharedJourneysModalProps) {
  const [sharedJourneys, setSharedJourneys] = useState<SharedJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ shareId: string; journeyName: string } | null>(null);

  useEffect(() => {
    fetchSharedJourneys();
    checkUserRole();
  }, [user.id]);

  const checkUserRole = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', currentUser.id)
        .maybeSingle();

      setIsAdmin(userData?.role === 'admin');
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const fetchSharedJourneys = async () => {
    try {
      const { data, error } = await supabase
        .from('journey_shares')
        .select(`
          id,
          journey_id,
          permission_level,
          created_at,
          journeys:journey_id (
            id,
            journey_name,
            start_date,
            end_date,
            status
          )
        `)
        .eq('shared_with', user.id)
        .eq('is_active', true)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out any null journeys and flatten the structure
      const formattedJourneys = (data || [])
        .filter((share: any) => share.journeys)
        .map((share: any) => ({
          id: share.id,
          journey_id: share.journey_id,
          permission_level: share.permission_level,
          created_at: share.created_at,
          journey: share.journeys,
        }));

      setSharedJourneys(formattedJourneys);
    } catch (error) {
      console.error('Error fetching shared journeys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShare = async (shareId: string) => {
    try {
      console.log('Attempting to delete share:', shareId);
      const { data, error } = await supabase
        .from('journey_shares')
        .delete()
        .eq('id', shareId)
        .select();

      console.log('Delete result:', { data, error });

      if (error) {
        console.error('Delete error details:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('Share not found or you do not have permission to delete it');
      }

      setConfirmDelete(null);
      await fetchSharedJourneys();
    } catch (error: any) {
      console.error('Error deleting share:', error);
      alert(`Failed to delete share: ${error.message || 'Unknown error'}`);
    }
  };

  const getPermissionBadge = (permission: 'view' | 'edit') => {
    if (permission === 'edit') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-brand-terracotta-light text-brand-chocolate text-xs font-semibold rounded-full">
          <Edit3 className="w-3 h-3" />
          Editor
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-brand-tan text-brand-brown-warm text-xs font-semibold rounded-full">
        <Eye className="w-3 h-3" />
        Viewer
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      completed: 'bg-green-100 text-green-700',
      in_progress: 'bg-brand-cyan bg-opacity-30 text-brand-brown',
      paid: 'bg-green-100 text-green-700',
      draft: 'bg-slate-100 text-slate-600',
      planning: 'bg-brand-tan text-brand-brown-warm',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || statusColors.planning}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-brand-brown bg-opacity-20 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-soft-lg">
        {/* Header */}
        <div className="p-6 border-b border-brand-tan">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-brand-charcoal mb-1">Shared Journeys</h2>
              <p className="text-sm text-brand-chocolate">
                Journeys shared with <span className="font-semibold">{user.name}</span> ({user.email})
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader className="w-8 h-8 text-brand-terracotta animate-spin mb-3" />
              <p className="text-brand-chocolate font-medium">Loading shared journeys...</p>
            </div>
          ) : sharedJourneys.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-brand-brown-light mx-auto mb-4" />
              <p className="text-brand-chocolate font-medium mb-2">No shared journeys</p>
              <p className="text-sm text-brand-brown-light">
                This user doesn't have access to any journeys yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sharedJourneys.map((share) => (
                <div
                  key={share.id}
                  className="bg-brand-tan-light rounded-xl p-5 border border-brand-tan shadow-soft hover:shadow-soft-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-brand-charcoal mb-2 truncate">
                        {share.journey.journey_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {getPermissionBadge(share.permission_level)}
                        {getStatusBadge(share.journey.status)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-brand-chocolate mb-4">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">
                      {new Date(share.journey.start_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      -{' '}
                      {new Date(share.journey.end_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-brand-tan">
                    <p className="text-xs text-brand-brown-light">
                      Shared on {new Date(share.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete({ shareId: share.id, journeyName: share.journey.journey_name });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-lg transition-colors"
                          title="Remove this journey from user's shared journeys"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToJourney(share.journey_id);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-terracotta hover:bg-brand-terracotta-light text-white font-semibold text-sm rounded-lg transition-colors"
                      >
                        View Journey
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && sharedJourneys.length > 0 && (
          <div className="p-4 border-t border-brand-tan bg-brand-beige-light">
            <p className="text-sm text-brand-chocolate text-center">
              Total: <span className="font-semibold">{sharedJourneys.length}</span> shared {sharedJourneys.length === 1 ? 'journey' : 'journeys'}
            </p>
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Remove Shared Journey"
          message={`Are you sure you want to remove "${confirmDelete.journeyName}" from ${user.name}'s shared journeys? This will revoke their access to this journey.`}
          confirmLabel="Remove Access"
          onConfirm={() => handleDeleteShare(confirmDelete.shareId)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
