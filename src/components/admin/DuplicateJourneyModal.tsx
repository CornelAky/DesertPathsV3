import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Copy, Calendar, Users, Loader } from 'lucide-react';
import type { Trip, Customer } from '../../lib/database.types';

interface DuplicateJourneyModalProps {
  journey: Trip;
  onClose: () => void;
  onSuccess: () => void;
}

export function DuplicateJourneyModal({ journey, onClose, onSuccess }: DuplicateJourneyModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(journey.customer_id);
  const [journeyName, setJourneyName] = useState(`${journey.journey_name} (Copy)`);
  const [startDate, setStartDate] = useState(journey.start_date);
  const [endDate, setEndDate] = useState(journey.end_date);
  const [loading, setLoading] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      if (duration < journey.duration_days) {
        const newEnd = new Date(start);
        newEnd.setDate(newEnd.getDate() + journey.duration_days - 1);
        setEndDate(newEnd.toISOString().split('T')[0]);
      }
    }
  }, [startDate]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!journeyName || !startDate || !endDate || !selectedCustomerId) {
      alert('Please fill in all required fields');
      return;
    }

    setDuplicating(true);
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const { data: newJourney, error: journeyError } = await supabase
        .from('journeys')
        .insert({
          customer_id: selectedCustomerId,
          journey_name: journeyName,
          start_date: startDate,
          end_date: endDate,
          duration_days: durationDays,
          status: 'planning',
          description: journey.description,
        })
        .select()
        .single();

      if (journeyError) throw journeyError;

      const { data: days, error: daysError } = await supabase
        .from('itinerary_days')
        .select('*')
        .eq('journey_id', journey.id)
        .order('day_number', { ascending: true });

      if (daysError) throw daysError;

      if (days && days.length > 0) {
        const originalStartDate = new Date(journey.start_date);
        const newStartDate = new Date(startDate);
        const daysDifference = Math.floor((newStartDate.getTime() - originalStartDate.getTime()) / (1000 * 60 * 60 * 24));

        const dayIdMap = new Map<string, string>();

        for (const day of days) {
          const originalDate = new Date(day.date);
          const newDate = new Date(originalDate);
          newDate.setDate(newDate.getDate() + daysDifference);

          const { data: newDay, error: dayError } = await supabase
            .from('itinerary_days')
            .insert({
              journey_id: newJourney.id,
              day_number: day.day_number,
              date: newDate.toISOString().split('T')[0],
              city_destination: day.city_destination,
            })
            .select()
            .single();

          if (dayError) throw dayError;
          dayIdMap.set(day.id, newDay.id);

          const [accommodations, activities, dining] = await Promise.all([
            supabase.from('accommodations').select('*').eq('day_id', day.id),
            supabase.from('activities').select('*, activity_booking_fees(*)').eq('day_id', day.id),
            supabase.from('dining').select('*').eq('day_id', day.id),
          ]);

          if (accommodations.error) {
            console.error('Error fetching accommodations:', accommodations.error);
            throw new Error(`Failed to fetch accommodations: ${accommodations.error.message}`);
          }
          if (activities.error) {
            console.error('Error fetching activities:', activities.error);
            throw new Error(`Failed to fetch activities: ${activities.error.message}`);
          }
          if (dining.error) {
            console.error('Error fetching dining:', dining.error);
            throw new Error(`Failed to fetch dining: ${dining.error.message}`);
          }

          if (accommodations.data && accommodations.data.length > 0) {
            const newAccommodations = accommodations.data.map(({ id, day_id, created_at, updated_at, ...rest }) => ({
              ...rest,
              day_id: newDay.id,
            }));
            const { error: accomError } = await supabase.from('accommodations').insert(newAccommodations);
            if (accomError) {
              console.error('Error inserting accommodations:', accomError);
              throw new Error(`Failed to copy accommodations: ${accomError.message}`);
            }
          }

          if (activities.data && activities.data.length > 0) {
            for (const activity of activities.data) {
              const { id, day_id, created_at, updated_at, activity_booking_fees, ...activityRest } = activity;

              const { data: newActivity, error: activityError } = await supabase
                .from('activities')
                .insert({
                  ...activityRest,
                  day_id: newDay.id,
                })
                .select()
                .single();

              if (activityError) throw activityError;

              if (activity_booking_fees && activity_booking_fees.length > 0) {
                const newBookingFees = activity_booking_fees.map(({ id, activity_id, created_at, updated_at, ...feeRest }: any) => ({
                  ...feeRest,
                  activity_id: newActivity.id,
                }));
                const { error: feeError } = await supabase.from('activity_booking_fees').insert(newBookingFees);
                if (feeError) {
                  console.error('Error inserting booking fees:', feeError);
                  throw new Error(`Failed to copy booking fees: ${feeError.message}`);
                }
              }
            }
          }

          if (dining.data && dining.data.length > 0) {
            const newDining = dining.data.map(({ id, day_id, created_at, updated_at, ...rest }) => ({
              ...rest,
              day_id: newDay.id,
            }));
            const { error: diningError } = await supabase.from('dining').insert(newDining);
            if (diningError) {
              console.error('Error inserting dining:', diningError);
              throw new Error(`Failed to copy dining: ${diningError.message}`);
            }
          }
        }

        const { data: entries, error: entriesError } = await supabase
          .from('itinerary_entries')
          .select('*')
          .eq('journey_id', journey.id)
          .order('sort_order', { ascending: true });

        if (entriesError) throw entriesError;

        if (entries && entries.length > 0) {
          const newEntries = entries.map(({ id, journey_id, created_at, updated_at, date, ...rest }) => {
            let newDate = null;
            if (date) {
              const originalDate = new Date(date);
              const adjustedDate = new Date(originalDate);
              adjustedDate.setDate(adjustedDate.getDate() + daysDifference);
              newDate = adjustedDate.toISOString().split('T')[0];
            }

            return {
              ...rest,
              journey_id: newJourney.id,
              date: newDate,
            };
          });

          const { error: insertEntriesError } = await supabase.from('itinerary_entries').insert(newEntries);
          if (insertEntriesError) {
            console.error('Error inserting itinerary entries:', insertEntriesError);
            throw new Error(`Failed to copy itinerary entries: ${insertEntriesError.message}`);
          }
        }
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error duplicating journey:', error);
      const errorMessage = error?.message || 'Failed to duplicate journey. Please try again.';
      alert(errorMessage);
    } finally {
      setDuplicating(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Copy className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Duplicate Journey</h2>
              <p className="text-slate-600 mt-1">Create a copy with updated details</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">Original Journey:</span> {journey.journey_name}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              This will copy all days, activities, accommodations, dining, and timeline entries.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Client</span>
              </div>
            </label>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : (
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} {customer.contact_number ? `- ${customer.contact_number}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Journey Name
            </label>
            <input
              type="text"
              value={journeyName}
              onChange={(e) => setJourneyName(e.target.value)}
              placeholder="Enter new journey name"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>Start Date</span>
                </div>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>End Date</span>
                </div>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-900">
              <span className="font-medium">Duration:</span> {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
            </p>
            <p className="text-xs text-blue-700 mt-1">
              All dates in the itinerary will be adjusted based on the new start date
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex space-x-3">
          <button
            onClick={onClose}
            disabled={duplicating}
            className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDuplicate}
            disabled={duplicating || !journeyName || !startDate || !endDate}
            className="flex-1 flex items-center justify-center space-x-2 bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {duplicating ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Duplicating...</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                <span>Duplicate Journey</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
