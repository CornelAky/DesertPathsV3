import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, Calendar, Clock, MapPin, Edit2, Plus, AlertCircle } from 'lucide-react';
import { ItineraryEntryFeeEditor } from './ItineraryEntryFeeEditor';

interface ItineraryEntriesManagerProps {
  tripId: string;
}

interface ActivityFee {
  id: string;
  applies_to: string;
  amount: number;
  currency: string;
  booking_required: boolean;
  status: string;
  booking_reference: string | null;
  notes: string | null;
}

interface ActivityEntry {
  id: string;
  day_number: number;
  date: string | null;
  time: string | null;
  activity: string;
  location: string;
  notes: string;
  guest_fee: number | null;
  guide_fee: number | null;
  fee_currency: string | null;
  fee_status: string | null;
  booking_reference: string | null;
  fee_notes: string | null;
  fees: ActivityFee[];
}

export function ItineraryEntriesManager({ tripId }: ItineraryEntriesManagerProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);

  useEffect(() => {
    fetchEntries();
  }, [tripId]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      console.log('Fetching activities for trip:', tripId);

      const { data: daysData, error: daysError } = await supabase
        .from('itinerary_days')
        .select('id, day_number, date')
        .eq('journey_id', tripId)
        .order('day_number', { ascending: true });

      if (daysError) {
        console.error('Error fetching days:', daysError);
        throw daysError;
      }

      console.log('Found days:', daysData?.length || 0);

      if (!daysData || daysData.length === 0) {
        setEntries([]);
        return;
      }

      const allActivities: ActivityEntry[] = [];

      for (const day of daysData) {
        const { data: activities, error: activitiesError } = await supabase
          .from('activities')
          .select('id, activity_name, location, activity_time, guide_notes')
          .eq('day_id', day.id)
          .order('activity_time', { ascending: true });

        if (activitiesError) {
          console.error('Error fetching activities for day:', day.day_number, activitiesError);
          continue;
        }

        console.log(`Day ${day.day_number}: Found ${activities?.length || 0} activities`);

        for (const activity of activities || []) {
          const { data: fees, error: feesError } = await supabase
            .from('activity_booking_fees')
            .select('*')
            .eq('activity_id', activity.id);

          if (feesError) {
            console.error('Error fetching fees for activity:', activity.id, feesError);
          }

          console.log(`Activity "${activity.activity_name}": Found ${fees?.length || 0} fees`);

          const guestFee = fees?.find((fee) => fee.applies_to === 'guest');
          const guideFee = fees?.find((fee) => fee.applies_to === 'guide');

          allActivities.push({
            id: activity.id,
            day_number: day.day_number,
            date: day.date,
            time: activity.activity_time,
            activity: activity.activity_name || 'Untitled Activity',
            location: activity.location || '',
            notes: activity.guide_notes || '',
            guest_fee: guestFee?.amount ? Number(guestFee.amount) : null,
            guide_fee: guideFee?.amount ? Number(guideFee.amount) : null,
            fee_currency: guestFee?.currency || guideFee?.currency || 'SAR',
            fee_status: guestFee?.status || guideFee?.status || null,
            booking_reference: guestFee?.booking_reference || guideFee?.booking_reference || null,
            fee_notes: guestFee?.notes || guideFee?.notes || null,
            fees: fees || [],
          });
        }
      }

      console.log('Total activities with fees loaded:', allActivities.length);
      setEntries(allActivities);
    } catch (err) {
      console.error('Error fetching itinerary entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFee = async () => {
    setEditingFeeId(null);
    await fetchEntries();
  };

  const getTotalForEntry = (entry: ActivityEntry) => {
    const guest = entry.guest_fee || 0;
    const guide = entry.guide_fee || 0;
    return guest + guide;
  };

  const hasFees = (entry: ActivityEntry) => {
    return entry.guest_fee !== null || entry.guide_fee !== null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-600">Loading entries...</div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-sm text-yellow-800">
          No itinerary entries found. Please add activities to your days first.
        </p>
      </div>
    );
  }

  const groupedByDay = entries.reduce((acc, entry) => {
    if (!acc[entry.day_number]) {
      acc[entry.day_number] = [];
    }
    acc[entry.day_number].push(entry);
    return acc;
  }, {} as Record<number, ActivityEntry[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDay).map(([dayNumber, dayEntries]) => (
        <div key={dayNumber} className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                Day {dayNumber}
                {dayEntries[0]?.date && (
                  <span className="ml-2 text-slate-500 font-normal">
                    {new Date(dayEntries[0].date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </h3>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {dayEntries.map((entry) => (
              <div key={entry.id}>
                <div className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {entry.time && (
                          <div className="flex items-center text-xs text-slate-600">
                            <Clock className="w-3 h-3 mr-1" />
                            {entry.time}
                          </div>
                        )}
                        <h4 className="text-sm font-semibold text-slate-900">
                          {entry.activity || 'Untitled Activity'}
                        </h4>
                      </div>

                      {entry.location && (
                        <div className="flex items-center text-xs text-slate-600 mb-2">
                          <MapPin className="w-3 h-3 mr-1" />
                          {entry.location}
                        </div>
                      )}

                      {entry.notes && (
                        <p className="text-xs text-slate-600 mt-1">{entry.notes}</p>
                      )}

                      {hasFees(entry) && (
                        <div className="mt-2 flex items-center space-x-4 text-xs">
                          {entry.guest_fee && (
                            <span className="text-slate-700">
                              Guest: {entry.guest_fee} {entry.fee_currency || 'SAR'}
                            </span>
                          )}
                          {entry.guide_fee && (
                            <span className="text-slate-700">
                              Guide: {entry.guide_fee} {entry.fee_currency || 'SAR'}
                            </span>
                          )}
                          <span className="font-semibold text-blue-600">
                            Total: {getTotalForEntry(entry)} {entry.fee_currency || 'SAR'}
                          </span>
                          {entry.fee_status && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs ${
                                entry.fee_status === 'booked'
                                  ? 'bg-green-100 text-green-700'
                                  : entry.fee_status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {entry.fee_status}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() =>
                        setEditingFeeId(editingFeeId === entry.id ? null : entry.id)
                      }
                      className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      {hasFees(entry) ? (
                        <>
                          <Edit2 className="w-3 h-3" />
                          <span>Edit Fees</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          <span>Add Fees</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {editingFeeId === entry.id && (
                  <ItineraryEntryFeeEditor
                    entryId={entry.id}
                    guestFee={entry.guest_fee}
                    guideFee={entry.guide_fee}
                    feeCurrency={entry.fee_currency}
                    feeStatus={entry.fee_status}
                    bookingReference={entry.booking_reference}
                    feeNotes={entry.fee_notes}
                    onSave={handleSaveFee}
                    onCancel={() => setEditingFeeId(null)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
