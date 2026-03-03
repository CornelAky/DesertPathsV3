import { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Eye, Edit3, Clock, AlertCircle, Trash2, Share2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { EnhancedItineraryTable } from '../admin/EnhancedItineraryTable';
import { ConfirmDialog } from '../admin/ConfirmDialog';

interface SharedJourney {
  id: string;
  journey_name: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  description: string | null;
  status: string;
  permission_level: 'view' | 'edit';
  shared_at: string;
}

export function SharedJourneysView() {
  const [journeys, setTrips] = useState<SharedJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJourney, setSelectedTrip] = useState<SharedJourney | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; journeyId: string; journeyName: string; action: 'delete' | 'remove' } | null>(null);

  useEffect(() => {
    loadSharedJourneys();
  }, []);

  const loadSharedJourneys = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get journeys shared with this user
      const { data, error: sharesError } = await supabase
        .from('journey_shares')
        .select(`
          permission_level,
          created_at,
          journeys (
            id,
            journey_name,
            start_date,
            end_date,
            duration_days,
            description,
            status
          )
        `)
        .eq('shared_with', user.id)
        .eq('is_active', true)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });

      if (sharesError) throw sharesError;

      const formattedTrips = data?.map(share => ({
        id: share.journeys.id,
        journey_name: share.journeys.journey_name,
        start_date: share.journeys.start_date,
        end_date: share.journeys.end_date,
        duration_days: share.journeys.duration_days,
        description: share.journeys.description,
        status: share.journeys.status,
        permission_level: share.permission_level,
        shared_at: share.created_at
      })) || [];

      setTrips(formattedTrips);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJourney = async (journeyId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('journeys')
        .delete()
        .eq('id', journeyId);

      if (deleteError) throw deleteError;

      setConfirmDelete(null);
      await loadSharedJourneys();
    } catch (err: any) {
      alert(`Failed to delete trip: ${err.message}`);
    }
  };

  const handleDeleteShare = async (journeyId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: deleteError } = await supabase
        .from('journey_shares')
        .delete()
        .eq('journey_id', journeyId)
        .eq('shared_with', user.id);

      if (deleteError) throw deleteError;

      setConfirmDelete(null);
      await loadSharedJourneys();
    } catch (err: any) {
      alert(`Failed to remove trip: ${err.message}`);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'planned':
        return 'bg-blue-100 text-blue-700';
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'completed':
        return 'bg-slate-100 text-slate-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Loading shared journeys...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-900">Error</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (selectedJourney) {
    return (
      <div>
        <div className="mb-6">
          <button
            onClick={() => setSelectedTrip(null)}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
          >
            ← Back to Shared Journeys
          </button>
          <h2 className="text-2xl font-bold text-slate-900 mt-2">{selectedJourney.journey_name}</h2>
          <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(selectedJourney.start_date)} - {formatDate(selectedJourney.end_date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {selectedJourney.duration_days} days
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
              selectedJourney.permission_level === 'edit'
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {selectedJourney.permission_level === 'edit' ? (
                <><Edit3 className="w-3 h-3" /> Can Edit</>
              ) : (
                <><Eye className="w-3 h-3" /> View Only</>
              )}
            </span>
          </div>
        </div>

        <EnhancedItineraryTable journeyId={selectedJourney.id} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Share2 className="w-6 h-6 text-brand-terracotta" />
          Shared Journeys
        </h1>
        <p className="text-slate-600 mt-2">
          View and manage journeys that have been shared with you
        </p>
      </div>

      {journeys.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No Shared Journeys</h3>
          <p className="text-slate-600">
            You don't have any journeys shared with you yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {journeys.map((trip) => (
            <div
              key={trip.id}
              className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all cursor-pointer overflow-hidden"
              onClick={() => setSelectedTrip(trip)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-900 line-clamp-2">
                    {trip.journey_name}
                  </h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ml-2 ${getStatusColor(trip.status)}`}>
                    {trip.status}
                  </span>
                </div>

                {trip.description && (
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    {trip.description}
                  </p>
                )}

                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{formatDate(trip.start_date)} - {formatDate(trip.end_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{trip.duration_days} days</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                  <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                    trip.permission_level === 'edit'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {trip.permission_level === 'edit' ? (
                      <><Edit3 className="w-3 h-3" /> Can Edit</>
                    ) : (
                      <><Eye className="w-3 h-3" /> View Only</>
                    )}
                  </span>
                  <span className="text-xs text-slate-500">
                    Shared {formatDate(trip.shared_at)}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
                <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  View Itinerary →
                </button>
                <div className="flex items-center gap-2">
                  {trip.permission_level === 'edit' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete({ show: true, journeyId: trip.id, journeyName: trip.journey_name, action: 'delete' });
                      }}
                      className="text-sm font-medium text-red-700 hover:text-red-800 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                      title="Delete journey permanently"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Journey
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete({ show: true, journeyId: trip.id, journeyName: trip.journey_name, action: 'remove' });
                    }}
                    className="text-sm font-medium text-slate-600 hover:text-slate-700 hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                    title="Remove from my journeys"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={confirmDelete.action === 'delete' ? 'Delete Journey' : 'Remove Shared Journey'}
          message={
            confirmDelete.action === 'delete'
              ? `Are you sure you want to delete "${confirmDelete.journeyName}"? This will permanently delete the journey and all its data for everyone. This action cannot be undone.`
              : `Are you sure you want to remove "${confirmDelete.journeyName}" from your shared journeys? This will not delete the journey, only remove your access to it.`
          }
          confirmLabel={confirmDelete.action === 'delete' ? 'Delete Journey' : 'Remove'}
          onConfirm={() => {
            if (confirmDelete.action === 'delete') {
              handleDeleteJourney(confirmDelete.journeyId);
            } else {
              handleDeleteShare(confirmDelete.journeyId);
            }
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
