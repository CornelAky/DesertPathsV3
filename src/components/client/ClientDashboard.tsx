import { useState, useEffect } from 'react';
import { Calendar, MapPin, Eye, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ClientView } from './ClientView';
import UserMenu from '../shared/UserMenu';
import type { Trip } from '../../lib/database.types';

interface SharedJourney extends Trip {
  permission_level: 'view' | 'edit';
  shared_at: string;
}

export function ClientDashboard() {
  const { userProfile } = useAuth();
  const [journeys, setJourneys] = useState<SharedJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJourney, setSelectedJourney] = useState<SharedJourney | null>(null);

  useEffect(() => {
    loadSharedJourneys();
  }, []);

  const loadSharedJourneys = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

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
            status,
            customer_id,
            created_by,
            created_at,
            updated_at
          )
        `)
        .eq('shared_with', user.id)
        .eq('is_active', true)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });

      if (sharesError) throw sharesError;

      const formattedJourneys = data?.map(share => ({
        ...share.journeys,
        permission_level: share.permission_level,
        shared_at: share.created_at
      })) || [];

      setJourneys(formattedJourneys);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
      case 'draft':
        return 'bg-slate-100 text-slate-700';
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

  if (selectedJourney) {
    return <ClientView trip={selectedJourney} onClose={() => setSelectedJourney(null)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-beige via-white to-brand-sand">
      <header className="bg-white border-b border-brand-tan shadow-soft sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center space-x-3 flex-shrink-0">
              <img
                src="/all_white_-_used_on_website_header_and_url.png"
                alt="Desert Paths"
                className="h-10 w-auto"
              />
            </div>

            <div className="flex-1 text-center">
              <h1 className="text-xl font-bold text-brand-charcoal">Journey Management</h1>
            </div>

            <div className="flex items-center space-x-3 flex-shrink-0">
              <UserMenu variant="client" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome, {userProfile?.name || 'Traveler'}
          </h2>
          <p className="text-slate-600">
            View and explore your upcoming journeys
          </p>
        </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-orange border-t-transparent mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading your journeys...</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            ) : journeys.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-300">
                <MapPin className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No Journeys Yet</h3>
                <p className="text-slate-600">
                  Your travel journeys will appear here once they are shared with you.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {journeys.map((journey) => (
                  <div
                    key={journey.id}
                    className="bg-white rounded-xl border border-slate-200 hover:border-brand-orange hover:shadow-xl transition-all cursor-pointer overflow-hidden group"
                    onClick={() => setSelectedJourney(journey)}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-bold text-slate-900 line-clamp-2 group-hover:text-brand-orange transition-colors">
                          {journey.journey_name}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ml-2 ${getStatusColor(journey.status)}`}>
                          {journey.status}
                        </span>
                      </div>

                      {journey.description && (
                        <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                          {journey.description}
                        </p>
                      )}

                      <div className="space-y-2 text-sm text-slate-600">
                        {journey.start_date && journey.end_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-brand-orange flex-shrink-0" />
                            <span>{formatDate(journey.start_date)} - {formatDate(journey.end_date)}</span>
                          </div>
                        )}
                        {journey.duration_days && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-brand-orange flex-shrink-0" />
                            <span>{journey.duration_days} days</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            View Access
                          </span>
                          <span className="text-xs text-slate-500">
                            Shared {formatDate(journey.shared_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-brand-orange to-brand-brown px-6 py-3 border-t border-slate-200">
                      <button className="text-sm font-semibold text-white flex items-center gap-2 group-hover:gap-3 transition-all">
                        View Journey Details →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
      </main>
    </div>
  );
}
