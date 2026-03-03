import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, MapPin, Edit2, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { ItineraryEntryFeeEditor } from './ItineraryEntryFeeEditor';
import { FilterBar } from './FilterBar';

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
  trip_id: string;
  journey_name: string;
  customer_id: string | null;
  customer_name: string | null;
  assigned_guides: Array<{ id: string; name: string }>;
  trip_status: string;
  trip_start_date: string | null;
}

interface Guide {
  id: string;
  name: string;
}

export function AllTripsFeesManager() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [collapsedTrips, setCollapsedTrips] = useState<Set<string>>(new Set());

  const [customerNameFilter, setCustomerNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState(0);
  const [yearFilter, setYearFilter] = useState(0);
  const [guideFilter, setGuideFilter] = useState('all');

  const [availableGuides, setAvailableGuides] = useState<Guide[]>([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      console.log('Fetching all activities across all trips...');

      const { data: tripsData, error: tripsError } = await supabase
        .from('journeys')
        .select(`
          id,
          journey_name,
          customer_id,
          status,
          start_date,
          customers (
            id,
            name
          )
        `)
        .order('start_date', { ascending: false });

      if (tripsError) {
        console.error('Error fetching trips:', tripsError);
        throw tripsError;
      }

      console.log('Found trips:', tripsData?.length || 0);

      const { data: guidesData, error: guidesError } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'guide')
        .order('name', { ascending: true });

      if (guidesError) {
        console.error('Error fetching guides:', guidesError);
      } else {
        setAvailableGuides(
          (guidesData || []).map((g) => ({
            id: g.id,
            name: g.name || 'Unknown Guide',
          }))
        );
      }

      if (!tripsData || tripsData.length === 0) {
        setEntries([]);
        return;
      }

      const allActivities: ActivityEntry[] = [];

      for (const trip of tripsData) {
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('journey_assignments')
          .select(`
            users (
              id,
              name
            )
          `)
          .eq('journey_id', trip.id);

        if (assignmentsError) {
          console.error('Error fetching assignments for trip:', trip.id, assignmentsError);
        }

        const assignedGuides =
          assignmentsData?.map((a: any) => ({
            id: a.users.id,
            name: a.users.name || 'Unknown Guide',
          })) || [];

        const { data: daysData, error: daysError } = await supabase
          .from('itinerary_days')
          .select('id, day_number, date')
          .eq('journey_id', trip.id)
          .order('day_number', { ascending: true });

        if (daysError) {
          console.error('Error fetching days for trip:', trip.id, daysError);
          continue;
        }

        if (!daysData || daysData.length === 0) {
          continue;
        }

        for (const day of daysData) {
          const { data: activities, error: activitiesError } = await supabase
            .from('activities')
            .select('id, activity_name, location, activity_time, guide_notes')
            .eq('day_id', day.id)
            .order('activity_time', { ascending: true });

          if (activitiesError) {
            console.error(
              'Error fetching activities for day:',
              day.day_number,
              activitiesError
            );
            continue;
          }

          for (const activity of activities || []) {
            const { data: fees, error: feesError } = await supabase
              .from('activity_booking_fees')
              .select('*')
              .eq('activity_id', activity.id);

            if (feesError) {
              console.error('Error fetching fees for activity:', activity.id, feesError);
            }

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
              booking_reference:
                guestFee?.booking_reference || guideFee?.booking_reference || null,
              fee_notes: guestFee?.notes || guideFee?.notes || null,
              fees: fees || [],
              trip_id: trip.id,
              journey_name: trip.journey_name || 'Untitled Trip',
              customer_id: trip.customer_id,
              customer_name: (trip.customers as any)?.name || null,
              assigned_guides: assignedGuides,
              trip_status: trip.status,
              trip_start_date: trip.start_date,
            });
          }
        }
      }

      console.log('Total activities with fees loaded:', allActivities.length);
      setEntries(allActivities);
    } catch (err) {
      console.error('Error fetching all trip entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFee = async () => {
    setEditingFeeId(null);
    await fetchAllData();
  };

  const getTotalForEntry = (entry: ActivityEntry) => {
    const guest = entry.guest_fee || 0;
    const guide = entry.guide_fee || 0;
    return guest + guide;
  };

  const hasFees = (entry: ActivityEntry) => {
    return entry.guest_fee !== null || entry.guide_fee !== null;
  };

  const toggleTripCollapse = (tripId: string) => {
    setCollapsedTrips((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tripId)) {
        newSet.delete(tripId);
      } else {
        newSet.add(tripId);
      }
      return newSet;
    });
  };

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (
        customerNameFilter &&
        !entry.customer_name?.toLowerCase().includes(customerNameFilter.toLowerCase())
      ) {
        return false;
      }

      if (statusFilter !== 'all' && entry.fee_status !== statusFilter) {
        return false;
      }

      if (monthFilter !== 0 && entry.date) {
        const entryMonth = new Date(entry.date).getMonth() + 1;
        if (entryMonth !== monthFilter) {
          return false;
        }
      }

      if (yearFilter !== 0 && entry.date) {
        const entryYear = new Date(entry.date).getFullYear();
        if (entryYear !== yearFilter) {
          return false;
        }
      }

      if (guideFilter !== 'all') {
        const hasGuide = entry.assigned_guides.some((g) => g.id === guideFilter);
        if (!hasGuide) {
          return false;
        }
      }

      return true;
    });
  }, [entries, customerNameFilter, statusFilter, monthFilter, yearFilter, guideFilter]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    entries.forEach((entry) => {
      if (entry.date) {
        years.add(new Date(entry.date).getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [entries]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (customerNameFilter) count++;
    if (statusFilter !== 'all') count++;
    if (monthFilter !== 0) count++;
    if (yearFilter !== 0) count++;
    if (guideFilter !== 'all') count++;
    return count;
  }, [customerNameFilter, statusFilter, monthFilter, yearFilter, guideFilter]);

  const handleClearFilters = () => {
    setCustomerNameFilter('');
    setStatusFilter('all');
    setMonthFilter(0);
    setYearFilter(0);
    setGuideFilter('all');
  };

  const groupedByTrip = useMemo(() => {
    const grouped = filteredEntries.reduce((acc, entry) => {
      if (!acc[entry.trip_id]) {
        acc[entry.trip_id] = {
          journey_name: entry.journey_name,
          customer_name: entry.customer_name,
          assigned_guides: entry.assigned_guides,
          trip_status: entry.trip_status,
          trip_start_date: entry.trip_start_date,
          entries: [],
        };
      }
      acc[entry.trip_id].entries.push(entry);
      return acc;
    }, {} as Record<string, { journey_name: string; customer_name: string | null; assigned_guides: Array<{ id: string; name: string }>; trip_status: string; trip_start_date: string | null; entries: ActivityEntry[] }>);

    return grouped;
  }, [filteredEntries]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-brand-gray-1">Loading activities...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar
        customerNameFilter={customerNameFilter}
        statusFilter={statusFilter}
        monthFilter={monthFilter}
        yearFilter={yearFilter}
        guideFilter={guideFilter}
        availableYears={availableYears}
        availableGuides={availableGuides}
        onCustomerNameChange={setCustomerNameFilter}
        onStatusChange={setStatusFilter}
        onMonthChange={setMonthFilter}
        onYearChange={setYearFilter}
        onGuideChange={setGuideFilter}
        onClearFilters={handleClearFilters}
        activeFilterCount={activeFilterCount}
        resultCount={filteredEntries.length}
        totalCount={entries.length}
      />

      {filteredEntries.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-sm text-yellow-800">
            {entries.length === 0
              ? 'No activities found across any trips. Please add activities to your itineraries.'
              : 'No activities match the selected filters. Try adjusting your filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByTrip).map(([tripId, tripData]) => {
            const isCollapsed = collapsedTrips.has(tripId);
            const groupedByDay = tripData.entries.reduce((acc, entry) => {
              if (!acc[entry.day_number]) {
                acc[entry.day_number] = [];
              }
              acc[entry.day_number].push(entry);
              return acc;
            }, {} as Record<number, ActivityEntry[]>);

            const totalTripFees = tripData.entries.reduce(
              (sum, entry) => sum + getTotalForEntry(entry),
              0
            );

            return (
              <div
                key={tripId}
                className="bg-white rounded-lg shadow-sm border border-brand-gray-3"
              >
                <div
                  className="bg-brand-orange bg-opacity-10 px-4 py-3 border-b border-brand-gray-3 cursor-pointer hover:bg-opacity-20 transition-colors"
                  onClick={() => toggleTripCollapse(tripId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      {isCollapsed ? (
                        <ChevronRight className="w-5 h-5 text-brand-brown" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-brand-brown" />
                      )}
                      <div>
                        <h3 className="text-base font-bold text-brand-brown">
                          {tripData.journey_name}
                        </h3>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-brand-gray-1">
                          {tripData.customer_name && (
                            <span>Customer: {tripData.customer_name}</span>
                          )}
                          {tripData.assigned_guides.length > 0 && (
                            <span>
                              Guide: {tripData.assigned_guides.map((g) => g.name).join(', ')}
                            </span>
                          )}
                          {tripData.trip_start_date && (
                            <span>
                              Start:{' '}
                              {new Date(tripData.trip_start_date).toLocaleDateString(
                                'en-US',
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                }
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-brand-orange">
                        Total Fees: {totalTripFees} SAR
                      </div>
                      <div className="text-xs text-brand-gray-1">
                        {tripData.entries.length} activit
                        {tripData.entries.length === 1 ? 'y' : 'ies'}
                      </div>
                    </div>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="p-4 space-y-4">
                    {Object.entries(groupedByDay).map(([dayNumber, dayEntries]) => (
                      <div
                        key={dayNumber}
                        className="bg-brand-gray-4 rounded-lg border border-brand-gray-3"
                      >
                        <div className="bg-brand-gray-4 px-4 py-2 border-b border-brand-gray-3">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-brand-gray-1" />
                            <h4 className="text-sm font-semibold text-brand-brown">
                              Day {dayNumber}
                              {dayEntries[0]?.date && (
                                <span className="ml-2 text-brand-gray-1 font-normal">
                                  {new Date(dayEntries[0].date).toLocaleDateString(
                                    'en-US',
                                    {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    }
                                  )}
                                </span>
                              )}
                            </h4>
                          </div>
                        </div>

                        <div className="divide-y divide-brand-gray-3">
                          {dayEntries.map((entry) => (
                            <div key={entry.id}>
                              <div className="p-4 bg-white hover:bg-brand-gray-4 transition-colors">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                      {entry.time && (
                                        <div className="flex items-center text-xs text-brand-gray-1">
                                          <Clock className="w-3 h-3 mr-1" />
                                          {entry.time}
                                        </div>
                                      )}
                                      <h5 className="text-sm font-semibold text-brand-brown">
                                        {entry.activity || 'Untitled Activity'}
                                      </h5>
                                    </div>

                                    {entry.location && (
                                      <div className="flex items-center text-xs text-brand-gray-1 mb-2">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        {entry.location}
                                      </div>
                                    )}

                                    {entry.notes && (
                                      <p className="text-xs text-brand-gray-1 mt-1">
                                        {entry.notes}
                                      </p>
                                    )}

                                    {hasFees(entry) && (
                                      <div className="mt-2 flex items-center space-x-4 text-xs">
                                        {entry.guest_fee && (
                                          <span className="text-brand-brown">
                                            Guest: {entry.guest_fee}{' '}
                                            {entry.fee_currency || 'SAR'}
                                          </span>
                                        )}
                                        {entry.guide_fee && (
                                          <span className="text-brand-brown">
                                            Guide: {entry.guide_fee}{' '}
                                            {entry.fee_currency || 'SAR'}
                                          </span>
                                        )}
                                        <span className="font-semibold text-brand-orange">
                                          Total: {getTotalForEntry(entry)}{' '}
                                          {entry.fee_currency || 'SAR'}
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
                                      setEditingFeeId(
                                        editingFeeId === entry.id ? null : entry.id
                                      )
                                    }
                                    className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-brand-orange hover:bg-brand-orange hover:bg-opacity-10 rounded transition-colors"
                                  >
                                    {hasFees(entry) ? (
                                      <>
                                        <Edit2 className="w-3 h-3" />
                                        <span>Edit</span>
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="w-3 h-3" />
                                        <span>Add</span>
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
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
