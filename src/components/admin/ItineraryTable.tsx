import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Hotel, Utensils, Activity as ActivityIcon, AlertCircle } from 'lucide-react';

interface UnifiedEntry {
  id: string;
  type: 'accommodation' | 'activity' | 'dining';
  day_number: number;
  date: string;
  time: string;
  name: string;
  location: string;
  status: string;
  notes: string;
  originalId: string;
  originalTable: string;
  meal_type?: string;
}

interface ItineraryTableProps {
  journeyId: string;
}

export function ItineraryTable({ journeyId }: ItineraryTableProps) {
  const [entries, setEntries] = useState<UnifiedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [journeyId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all itinerary days for this trip
      const { data: days, error: daysError } = await supabase
        .from('itinerary_days')
        .select('id, day_number, date')
        .eq('journey_id', journeyId)
        .order('day_number', { ascending: true });

      if (daysError) throw daysError;

      if (!days || days.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      const dayIds = days.map(d => d.id);

      // Fetch all operational data in parallel
      const [accommodationsResult, activitiesResult, diningResult] = await Promise.all([
        supabase
          .from('accommodations')
          .select('*')
          .in('day_id', dayIds),
        supabase
          .from('activities')
          .select('*')
          .in('day_id', dayIds)
          .order('display_order', { ascending: true }),
        supabase
          .from('dining')
          .select('*')
          .in('day_id', dayIds)
          .order('display_order', { ascending: true })
      ]);

      if (accommodationsResult.error) throw accommodationsResult.error;
      if (activitiesResult.error) throw activitiesResult.error;
      if (diningResult.error) throw diningResult.error;

      // Create a map of day_id to day info
      const dayMap = new Map(days.map(d => [d.id, d]));

      // Combine all entries into unified format
      const unifiedEntries: UnifiedEntry[] = [];

      // Add accommodations
      accommodationsResult.data?.forEach(accom => {
        const day = dayMap.get(accom.day_id);
        if (day && accom.hotel_name) {
          unifiedEntries.push({
            id: `accom-${accom.id}`,
            type: 'accommodation',
            day_number: day.day_number,
            date: day.date || '',
            time: accom.check_in_time || '00:00',
            name: accom.hotel_name,
            location: accom.location_address || '',
            status: accom.booking_status || '',
            notes: accom.client_description || '',
            originalId: accom.id,
            originalTable: 'accommodations'
          });
        }
      });

      // Add activities
      activitiesResult.data?.forEach(activity => {
        const day = dayMap.get(activity.day_id);
        if (day && activity.activity_name) {
          unifiedEntries.push({
            id: `activity-${activity.id}`,
            type: 'activity',
            day_number: day.day_number,
            date: day.date || '',
            time: activity.activity_time || '00:00',
            name: activity.activity_name,
            location: activity.location || '',
            status: activity.booking_status || '',
            notes: activity.client_description || '',
            originalId: activity.id,
            originalTable: 'activities'
          });
        }
      });

      // Add dining
      diningResult.data?.forEach(meal => {
        const day = dayMap.get(meal.day_id);
        if (day && meal.restaurant_name) {
          unifiedEntries.push({
            id: `dining-${meal.id}`,
            type: 'dining',
            day_number: day.day_number,
            date: day.date || '',
            time: meal.reservation_time || '00:00',
            name: meal.restaurant_name,
            location: meal.location_address || '',
            status: meal.confirmation_status || '',
            notes: meal.client_notes || '',
            originalId: meal.id,
            originalTable: 'dining',
            meal_type: meal.meal_type || ''
          });
        }
      });

      // Sort by day, then time
      unifiedEntries.sort((a, b) => {
        if (a.day_number !== b.day_number) {
          return a.day_number - b.day_number;
        }
        if (a.date !== b.date) {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        const timeA = a.time.split(':').map(Number);
        const timeB = b.time.split(':').map(Number);
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
      });

      setEntries(unifiedEntries);
    } catch (err) {
      console.error('Error fetching itinerary data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load itinerary');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'accommodation':
        return <Hotel className="w-4 h-4" />;
      case 'activity':
        return <ActivityIcon className="w-4 h-4" />;
      case 'dining':
        return <Utensils className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'accommodation':
        return 'text-blue-600 bg-blue-50';
      case 'activity':
        return 'text-amber-600 bg-amber-50';
      case 'dining':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch {
      return time;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-orange border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Complete Itinerary Table</h2>
        <p className="text-sm text-slate-600 mt-1">Unified view of all accommodations, activities, and dining</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Day</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">No itinerary entries yet</p>
                    <p className="text-sm mt-1">Add activities, accommodations, or dining in the Day-by-Day view</p>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${getTypeColor(entry.type)}`}>
                        {getTypeIcon(entry.type)}
                        <span className="capitalize">{entry.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      Day {entry.day_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {entry.date ? new Date(entry.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {entry.time ? formatTime(entry.time) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      {entry.name}
                      {entry.meal_type && (
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded capitalize">
                          {entry.meal_type}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate" title={entry.location}>
                      {entry.location || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {entry.status ? (
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                          {entry.status}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate" title={entry.notes}>
                      {entry.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          About This View
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>This table shows all itinerary items from the Day-by-Day view</li>
          <li>Data is automatically synced from accommodations, activities, and dining entries</li>
          <li>To add or edit items, use the Day-by-Day editor</li>
          <li>Entries are sorted by day number, date, and time</li>
        </ul>
      </div>
    </div>
  );
}
