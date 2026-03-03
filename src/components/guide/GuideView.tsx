import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Calendar,
  MapPin,
  Hotel,
  Truck,
  Activity as ActivityIcon,
  Utensils,
  Clock,
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronUp,
  FileText,
  Navigation,
  Image as ImageIcon,
  Table,
  Copy,
  Loader,
  Edit2,
  ArrowLeft,
  Trash2,
  Share2,
  BookCopy,
  BookOpen,
} from 'lucide-react';
import type { Journey, ItineraryDay, Accommodation, Activity, Dining, Transportation } from '../../lib/database.types';
import { ItineraryTable } from '../admin/ItineraryTable';
import { JourneyEditor } from '../admin/JourneyEditor';
import { ConfirmDialog } from '../admin/ConfirmDialog';
import { sortDayItemsChronologically, type ItineraryItem } from '../../lib/exportUtils';
import { GuideJourneyDocuments } from './GuideJourneyDocuments';
import { GuideGuidelineTab } from './GuideGuidelineTab';
import { TimelineView } from '../admin/TimelineView';
import UserMenu from '../shared/UserMenu';

interface DayDetails {
  day: ItineraryDay;
  accommodations: Accommodation[];
  transportation: Transportation[];
  activities: Activity[];
  dining: Dining[];
}

export default function GuideView() {
  const { userProfile } = useAuth();
  const [trips, setTrips] = useState<Journey[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Journey | null>(null);
  const [days, setDays] = useState<DayDetails[]>([]);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'days' | 'table' | 'timeline' | 'documents'>('days');
  const [viewType, setViewType] = useState<'shared' | 'copies' | 'guideline'>('shared');
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [editingTrip, setEditingTrip] = useState(false);
  const [deleteTripDialog, setDeleteTripDialog] = useState<{ isOpen: boolean; trip: Journey | null }>({
    isOpen: false,
    trip: null,
  });

  useEffect(() => {
    fetchAssignedTrips();
  }, [userProfile]);

  const fetchAssignedTrips = async () => {
    if (!userProfile) return;

    try {
      // Fetch shared trips
      const { data: sharedData, error: sharedError } = await supabase
        .from('journey_shares')
        .select('journeys(*, customers(*))')
        .eq('shared_with', userProfile.id)
        .eq('is_active', true)
        .is('revoked_at', null);

      if (sharedError) throw sharedError;

      const sharedTrips = sharedData.map((item: any) => item.journeys).filter(Boolean);

      // Fetch driver copies created by this guide
      const { data: driverCopies, error: driverError } = await supabase
        .from('journeys')
        .select('*, customers(*)')
        .eq('created_by', userProfile.id)
        .eq('is_driver_copy', true);

      if (driverError) throw driverError;

      // Combine both lists and sort by creation date (driver copies last)
      const allTrips = [...sharedTrips, ...(driverCopies || [])];
      setTrips(allTrips);

      const activeTrip = allTrips.find(
        (t: Journey) => t.status === 'in_progress' || t.status === 'paid'
      );
      if (activeTrip) {
        setSelectedTrip(activeTrip);
        await fetchTripDetails(activeTrip.id);
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTripDetails = async (tripId: string) => {
    try {
      const { data: daysData, error: daysError } = await supabase
        .from('itinerary_days')
        .select('id, journey_id, day_number, date, city_destination, notes')
        .eq('journey_id', tripId)
        .order('day_number', { ascending: true });

      if (daysError) throw daysError;

      const dayDetailsPromises = (daysData || []).map(async (day) => {
        const [accomData, transData, actData, diningData] = await Promise.all([
          supabase.from('accommodations').select('id, day_id, hotel_name, location_address, check_in_time, check_out_time, access_method, confirmation_number, guide_notes, map_link, images, breakfast_included, breakfast_location, lunch_included, lunch_location, dinner_included, dinner_location').eq('day_id', day.id),
          supabase.from('transportation').select('id, day_id, driver_name, car_type, driver_phone').eq('day_id', day.id),
          supabase
            .from('activities')
            .select('id, day_id, activity_name, location, activity_time, duration_minutes, is_completed, access_method, payment_status, guide_notes, map_link, images')
            .eq('day_id', day.id)
            .order('activity_time', { ascending: true }),
          supabase
            .from('dining')
            .select('id, day_id, restaurant_name, meal_type, location_address, reservation_time, cuisine_type, included_in_package, location_type, dietary_restrictions, guide_notes, map_link, images, is_completed')
            .eq('day_id', day.id)
            .order('reservation_time', { ascending: true }),
        ]);

        return {
          day,
          accommodations: accomData.data || [],
          transportation: transData.data || [],
          activities: actData.data || [],
          dining: diningData.data || [],
        };
      });

      const dayDetails = await Promise.all(dayDetailsPromises);
      setDays(dayDetails);

      const today = new Date().toISOString().split('T')[0];
      const todayDay = dayDetails.find((d) => d.day.date === today);
      if (todayDay) {
        setExpandedDays(new Set([todayDay.day.id]));
      } else if (dayDetails.length > 0) {
        setExpandedDays(new Set([dayDetails[0].day.id]));
      }
    } catch (error) {
      console.error('Error fetching trip details:', error);
    }
  };

  const toggleDay = (dayId: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dayId)) {
      newExpanded.delete(dayId);
    } else {
      newExpanded.add(dayId);
    }
    setExpandedDays(newExpanded);
  };

  const toggleActivityComplete = async (activityId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ is_completed: !currentStatus })
        .eq('id', activityId);

      if (error) throw error;

      if (selectedTrip) {
        await fetchTripDetails(selectedTrip.id);
      }
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const isToday = (date: string) => {
    const today = new Date().toISOString().split('T')[0];
    return date === today;
  };

  const handleDeleteTrip = async () => {
    if (!deleteTripDialog.trip) return;

    try {
      const { error } = await supabase
        .from('journeys')
        .delete()
        .eq('id', deleteTripDialog.trip.id);

      if (error) throw error;

      await fetchAssignedTrips();
      setDeleteTripDialog({ isOpen: false, trip: null });

      if (selectedTrip?.id === deleteTripDialog.trip.id) {
        setSelectedTrip(null);
      }
    } catch (error: any) {
      console.error('Error deleting trip:', error);
      alert(`Failed to delete guide copy: ${error?.message || 'Please try again.'}`);
    }
  };

  const handleCloneTrip = async () => {
    if (!selectedTrip || !userProfile) return;

    setCloning(true);
    try {
      const newTripName = `${selectedTrip.journey_name} (Guide Copy)`;
      const { data: newTrip, error: tripError } = await supabase
        .from('journeys')
        .insert({
          customer_id: selectedTrip.customer_id,
          journey_name: newTripName,
          start_date: selectedTrip.start_date,
          end_date: selectedTrip.end_date,
          duration_days: selectedTrip.duration_days,
          status: 'planning',
          description: selectedTrip.description,
          created_by: userProfile.id,
          is_driver_copy: true,
          original_trip_id: selectedTrip.id,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      const { data: days, error: daysError } = await supabase
        .from('itinerary_days')
        .select('id, journey_id, day_number, date, city_destination, notes')
        .eq('journey_id', selectedTrip.id)
        .order('day_number', { ascending: true });

      if (daysError) throw daysError;

      if (days && days.length > 0) {
        for (const day of days) {
          const { data: newDay, error: dayError } = await supabase
            .from('itinerary_days')
            .insert({
              journey_id: newTrip.id,
              day_number: day.day_number,
              date: day.date,
              city_destination: day.city_destination,
            })
            .select()
            .single();

          if (dayError) throw dayError;

          const [accommodations, transportation, activities, dining] = await Promise.all([
            supabase.from('accommodations').select('id, day_id, hotel_name, location_address, check_in_time, check_out_time, access_method, confirmation_number, guide_notes, map_link, images, breakfast_included, breakfast_location, lunch_included, lunch_location, dinner_included, dinner_location, created_at, updated_at').eq('day_id', day.id),
            supabase.from('transportation').select('id, day_id, driver_name, car_type, driver_phone, created_at, updated_at').eq('day_id', day.id),
            supabase.from('activities').select('id, day_id, activity_name, location, activity_time, duration_minutes, is_completed, access_method, payment_status, guide_notes, map_link, images, created_at, updated_at, activity_booking_fees(id, activity_id, fee_name, fee_amount, payment_status, guest_count, staff_count, created_at, updated_at)').eq('day_id', day.id),
            supabase.from('dining').select('id, day_id, restaurant_name, meal_type, location_address, reservation_time, cuisine_type, included_in_package, location_type, dietary_restrictions, guide_notes, map_link, images, is_completed, created_at, updated_at').eq('day_id', day.id),
          ]);

          if (accommodations.data && accommodations.data.length > 0) {
            const newAccommodations = accommodations.data.map(({ id, day_id, created_at, updated_at, ...rest }) => ({
              ...rest,
              day_id: newDay.id,
            }));
            await supabase.from('accommodations').insert(newAccommodations);
          }

          if (transportation.data && transportation.data.length > 0) {
            const newTransportation = transportation.data.map(({ id, day_id, created_at, updated_at, ...rest }) => ({
              ...rest,
              day_id: newDay.id,
            }));
            await supabase.from('transportation').insert(newTransportation);
          }

          if (activities.data && activities.data.length > 0) {
            for (const activity of activities.data) {
              const { id, day_id, created_at, updated_at, activity_booking_fees, is_completed, ...activityRest } = activity;

              const { data: newActivity, error: activityError } = await supabase
                .from('activities')
                .insert({
                  ...activityRest,
                  day_id: newDay.id,
                  is_completed: false,
                })
                .select()
                .single();

              if (activityError) throw activityError;

              if (activity_booking_fees && activity_booking_fees.length > 0) {
                const newBookingFees = activity_booking_fees.map(({ id, activity_id, created_at, updated_at, ...feeRest }: any) => ({
                  ...feeRest,
                  activity_id: newActivity.id,
                }));
                await supabase.from('activity_booking_fees').insert(newBookingFees);
              }
            }
          }

          if (dining.data && dining.data.length > 0) {
            const newDining = dining.data.map(({ id, day_id, created_at, updated_at, is_completed, ...rest }) => ({
              ...rest,
              day_id: newDay.id,
              is_completed: false,
            }));
            await supabase.from('dining').insert(newDining);
          }
        }

        const { data: entries, error: entriesError } = await supabase
          .from('itinerary_entries')
          .select('id, journey_id, entry_type, entry_data, sort_order, created_at, updated_at')
          .eq('journey_id', selectedTrip.id)
          .order('sort_order', { ascending: true });

        if (entriesError) throw entriesError;

        if (entries && entries.length > 0) {
          const newEntries = entries.map(({ id, journey_id, created_at, updated_at, ...rest }) => ({
            ...rest,
            journey_id: newTrip.id,
          }));
          await supabase.from('itinerary_entries').insert(newEntries);
        }
      }

      setShowCloneModal(false);
      await fetchAssignedTrips();
      alert(`Guide copy created! "${newTripName}" is now in your trips list. You can now edit this copy. Changes won't affect the original trip.`);
      setSelectedTrip(newTrip);
      await fetchTripDetails(newTrip.id);
    } catch (error) {
      console.error('Error cloning trip:', error);
      alert('Failed to clone trip. Please try again or contact support.');
    } finally {
      setCloning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-beige flex items-center justify-center">
        <p className="text-brand-charcoal font-medium">Loading...</p>
      </div>
    );
  }

  // If editing a guide copy, show the TripEditor
  if (editingTrip && selectedTrip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-950 via-orange-900 to-amber-950">
        <header className="bg-orange-950 border-b border-orange-800 p-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setEditingTrip(false)}
              className="flex items-center space-x-2 text-brand-brown-warm hover:text-brand-charcoal"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to View</span>
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-brand-charcoal">Editing: {selectedTrip.journey_name}</h1>
              <p className="text-xs text-brand-brown-light">
                Welcome, {userProfile?.name || userProfile?.email || 'User'}
              </p>
            </div>
            <div className="w-24"></div>
          </div>
        </header>
        <JourneyEditor
          trip={selectedTrip}
          onClose={() => setEditingTrip(false)}
          onSave={async () => {
            await fetchAssignedTrips();
            if (selectedTrip) {
              await fetchTripDetails(selectedTrip.id);
              const { data: updatedTrip, error } = await supabase
                .from('journeys')
                .select('id, customer_id, journey_name, start_date, end_date, duration_days, status, description, created_by, is_driver_copy, original_trip_id')
                .eq('id', selectedTrip.id)
                .maybeSingle();

              if (updatedTrip && !error) {
                setSelectedTrip(updatedTrip);
              }
            }
          }}
        />
      </div>
    );
  }

  if (!selectedTrip) {
    return (
      <div className="min-h-screen bg-brand-beige">
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
                <UserMenu variant="guide" />
              </div>
            </div>
          </div>
        </header>

        <div className="bg-brand-tan-light border-b border-brand-tan">
          <div className="flex items-center space-x-1 p-1 mx-4">
            <button
              onClick={() => setViewType('shared')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors flex-1 justify-center ${
                viewType === 'shared'
                  ? 'bg-brand-terracotta text-white'
                  : 'text-brand-chocolate hover:bg-brand-tan'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span className="text-sm font-medium">Shared with Me</span>
            </button>
            <button
              onClick={() => setViewType('copies')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors flex-1 justify-center ${
                viewType === 'copies'
                  ? 'bg-brand-terracotta text-white'
                  : 'text-brand-chocolate hover:bg-brand-tan'
              }`}
            >
              <BookCopy className="w-4 h-4" />
              <span className="text-sm font-medium">My Copies</span>
            </button>
            <button
              onClick={() => setViewType('guideline')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors flex-1 justify-center ${
                viewType === 'guideline'
                  ? 'bg-brand-terracotta text-white'
                  : 'text-brand-chocolate hover:bg-brand-tan'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="text-sm font-medium">Guideline</span>
            </button>
          </div>
        </div>

        <main className="p-4">
          {(() => {
            if (viewType === 'guideline') {
              return (
                <div className="bg-white rounded-lg p-4">
                  <GuideGuidelineTab />
                </div>
              );
            }

            const filteredTrips = trips.filter(trip => {
              if (viewType === 'shared') {
                return trip.is_driver_copy !== true;
              } else {
                return trip.is_driver_copy === true;
              }
            });

            if (filteredTrips.length === 0) {
              return (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-brand-brown-light mx-auto mb-4" />
                  <p className="text-brand-chocolate font-medium">
                    {viewType === 'shared' ? 'No trips shared with you' : 'No guide copies yet'}
                  </p>
                  {viewType === 'copies' && (
                    <p className="text-sm text-brand-brown-warm mt-2">
                      Open a shared trip and create a guide copy to get started
                    </p>
                  )}
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {filteredTrips.map((trip) => {
                  const customerData: any = trip.customers;
                  const isGuideCopy = trip.is_driver_copy === true;
                  return (
                    <div
                      key={trip.id}
                      className={`rounded-xl p-4 border transition-all shadow-soft hover:shadow-soft-md ${
                        isGuideCopy
                          ? 'bg-brand-tan-light border-brand-terracotta'
                          : 'bg-brand-tan-light border-brand-tan hover:border-brand-terracotta'
                      }`}
                    >
                      <div
                        onClick={() => {
                          setSelectedTrip(trip);
                          fetchTripDetails(trip.id);
                        }}
                        className="cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-lg font-bold text-brand-charcoal flex-1">{trip.journey_name}</h3>
                          {isGuideCopy && (
                            <span className="px-2 py-1 bg-brand-orange text-white text-xs font-semibold rounded-full whitespace-nowrap">
                              My Copy
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-brand-chocolate font-medium mb-2">{customerData?.name}</p>
                        <div className="flex items-center space-x-4 text-xs text-brand-brown-warm font-medium">
                          <span>
                            {new Date(trip.start_date).toLocaleDateString()} -{' '}
                            {new Date(trip.end_date).toLocaleDateString()}
                          </span>
                          <span className="capitalize">{trip.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                      {isGuideCopy && (
                        <div className="mt-3 pt-3 border-t border-brand-tan">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTripDialog({ isOpen: true, trip });
                            }}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete Copy</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-beige">
      <header className="bg-brand-cream-dark border-b border-brand-tan sticky top-0 z-10 shadow-soft">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex flex-col">
              <button
                onClick={() => setSelectedTrip(null)}
                className="text-brand-chocolate hover:text-brand-charcoal text-base font-semibold text-left"
              >
                ← All Trips
              </button>
              <p className="text-xs text-brand-brown-light mt-0.5">
                Welcome, {userProfile?.name || userProfile?.email || 'User'}
              </p>
            </div>
            <UserMenu variant="guide" />
          </div>
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-brand-charcoal inline">{selectedTrip.journey_name}</h1>
            {selectedTrip.is_driver_copy && (
              <span className="ml-2 px-2 py-1 bg-brand-orange text-white text-xs font-semibold rounded-full">
                My Copy
              </span>
            )}
          </div>
          <p className="text-base text-brand-chocolate font-medium mb-3">
            {new Date(selectedTrip.start_date).toLocaleDateString()} -{' '}
            {new Date(selectedTrip.end_date).toLocaleDateString()}
          </p>

          {!selectedTrip.is_driver_copy ? (
            <button
              onClick={() => setShowCloneModal(true)}
              className="w-full flex items-center justify-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors mb-4"
            >
              <Copy className="w-5 h-5" />
              <span>Create Guide Copy</span>
            </button>
          ) : (
            <div className="space-y-2 mb-4">
              <button
                onClick={() => setEditingTrip(true)}
                className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                <Edit2 className="w-5 h-5" />
                <span>Edit This Copy</span>
              </button>
              <button
                onClick={() => setDeleteTripDialog({ isOpen: true, trip: selectedTrip })}
                className="w-full flex items-center justify-center space-x-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-3 px-4 rounded-lg transition-colors border border-red-200"
              >
                <Trash2 className="w-5 h-5" />
                <span>Delete This Copy</span>
              </button>
            </div>
          )}

          {selectedTrip.is_driver_copy && (
            <div className="bg-brand-tan-light border border-brand-terracotta rounded-lg p-3 mb-4">
              <p className="text-brand-chocolate text-sm font-semibold">
                This is your personal guide copy. You can edit this freely without affecting the original trip.
              </p>
            </div>
          )}

          <div className="flex space-x-1 bg-brand-tan rounded-lg p-1">
            <button
              onClick={() => setActiveTab('days')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md font-semibold text-base transition-colors flex-1 justify-center ${
                activeTab === 'days'
                  ? 'bg-brand-terracotta text-white'
                  : 'text-brand-chocolate hover:bg-brand-tan-light'
              }`}
            >
              <Calendar className="w-5 h-5" />
              Days
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md font-semibold text-base transition-colors flex-1 justify-center ${
                activeTab === 'table'
                  ? 'bg-brand-terracotta text-white'
                  : 'text-brand-chocolate hover:bg-brand-tan-light'
              }`}
            >
              <Table className="w-5 h-5" />
              Table
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md font-semibold text-base transition-colors flex-1 justify-center ${
                activeTab === 'timeline'
                  ? 'bg-brand-terracotta text-white'
                  : 'text-brand-chocolate hover:bg-brand-tan-light'
              }`}
            >
              <Clock className="w-5 h-5" />
              Timeline
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md font-semibold text-base transition-colors flex-1 justify-center ${
                activeTab === 'documents'
                  ? 'bg-brand-terracotta text-white'
                  : 'text-brand-chocolate hover:bg-brand-tan-light'
              }`}
            >
              <FileText className="w-5 h-5" />
              Documents
            </button>
          </div>
        </div>
      </header>

      {signOutError && (
        <div className="px-4 pt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="font-medium">Sign Out Failed</p>
              <p className="text-sm mt-1">{signOutError}</p>
            </div>
            <button
              onClick={() => setSignOutError(null)}
              className="text-red-500 hover:text-red-700"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <main className="p-4 space-y-3 pb-20">
        {activeTab === 'documents' ? (
          <div className="bg-white rounded-lg p-4">
            <GuideJourneyDocuments tripId={selectedTrip.id} />
          </div>
        ) : activeTab === 'timeline' ? (
          <div className="bg-white rounded-lg p-4">
            <TimelineView trip={selectedTrip} />
          </div>
        ) : activeTab === 'days' ? (
          days.map((dayDetail) => {
          const isExpanded = expandedDays.has(dayDetail.day.id);
          const totalActivities = dayDetail.activities.length;
          const completedActivities = dayDetail.activities.filter((a) => a.is_completed).length;

          return (
            <div
              key={dayDetail.day.id}
              className={`rounded-xl border transition-all shadow-soft ${
                isToday(dayDetail.day.date)
                  ? 'bg-brand-tan-light border-brand-terracotta'
                  : 'bg-brand-tan-light border-brand-tan'
              }`}
            >
              <button
                onClick={() => toggleDay(dayDetail.day.id)}
                className="w-full p-5 text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl font-bold text-brand-charcoal">Day {dayDetail.day.day_number}</span>
                    {isToday(dayDetail.day.date) && (
                      <span className="px-3 py-1 bg-brand-terracotta text-white text-sm font-semibold rounded-full">
                        Today
                      </span>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-6 h-6 text-brand-chocolate" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-brand-chocolate" />
                  )}
                </div>

                <div className="flex items-center space-x-3 text-base text-brand-charcoal mb-2">
                  <MapPin className="w-5 h-5" />
                  <span className="font-semibold">{dayDetail.day.city_destination}</span>
                </div>

                <div className="flex items-center space-x-2 text-sm text-brand-chocolate">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">
                    {new Date(dayDetail.day.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {totalActivities > 0 && (
                  <div className="mt-3 text-sm text-brand-brown-warm font-semibold">
                    {completedActivities}/{totalActivities} activities completed
                  </div>
                )}
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 space-y-5">
                  {sortDayItemsChronologically(dayDetail).map((item) => {
                    if (item.type === 'accommodation') {
                      const accom = item.data as Accommodation;
                      return (
                    <div
                      key={accom.id}
                      className="bg-brand-beige rounded-lg p-5 border border-brand-terracotta"
                    >
                      <div className="flex items-start space-x-4">
                        <Hotel className="w-6 h-6 text-amber-400 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-lg font-bold text-brand-charcoal">{accom.hotel_name}</h4>
                            <span className="px-2.5 py-1 bg-brand-terracotta-light text-brand-brown-warm text-xs font-medium rounded-full">
                              {new Date(dayDetail.day.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="text-base text-brand-chocolate mb-3">{accom.location_address}</p>

                          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                            {accom.check_in_time && (
                              <div>
                                <p className="text-brand-brown-light font-medium">Check-in</p>
                                <p className="text-brand-charcoal text-base font-semibold">{accom.check_in_time}</p>
                              </div>
                            )}
                            {accom.check_out_time && (
                              <div>
                                <p className="text-brand-brown-light font-medium">Check-out</p>
                                <p className="text-brand-charcoal text-base font-semibold">{accom.check_out_time}</p>
                              </div>
                            )}
                          </div>

                          {(accom.breakfast_included ||
                            accom.lunch_included ||
                            accom.dinner_included) && (
                            <div className="mb-2">
                              <p className="text-xs text-brand-brown-light mb-1">Meals Included</p>
                              <div className="flex flex-wrap gap-1">
                                {accom.breakfast_included && (
                                  <span className="px-2 py-0.5 bg-lime-900 text-lime-300 text-xs rounded">
                                    Breakfast {accom.breakfast_location && `(${accom.breakfast_location === 'in_hotel' ? 'In Hotel' : 'External'})`}
                                  </span>
                                )}
                                {accom.lunch_included && (
                                  <span className="px-2 py-0.5 bg-lime-900 text-lime-300 text-xs rounded">
                                    Lunch {accom.lunch_location && `(${accom.lunch_location === 'in_hotel' ? 'In Hotel' : 'External'})`}
                                  </span>
                                )}
                                {accom.dinner_included && (
                                  <span className="px-2 py-0.5 bg-lime-900 text-lime-300 text-xs rounded">
                                    Dinner {accom.dinner_location && `(${accom.dinner_location === 'in_hotel' ? 'In Hotel' : 'External'})`}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 text-xs mb-2">
                            <span className="px-2 py-1 bg-orange-950 text-white rounded-full">
                              {accom.access_method.replace('_', ' ')}
                            </span>
                            {accom.confirmation_number && (
                              <span className="px-2 py-1 bg-orange-950 text-brand-brown-warm rounded-full">
                                {accom.confirmation_number}
                              </span>
                            )}
                          </div>

                          {accom.guide_notes && (
                            <div className="mt-2 p-2 bg-yellow-900 bg-opacity-40 border border-yellow-700 rounded text-xs text-yellow-200">
                              {accom.guide_notes}
                            </div>
                          )}

                          {accom.map_link && (
                            <a
                              href={accom.map_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-xs text-amber-400 hover:text-brand-chocolate mt-2"
                            >
                              <Navigation className="w-3 h-3" />
                              <span>Open in Maps</span>
                            </a>
                          )}

                          {accom.images && Array.isArray(accom.images) && accom.images.length > 0 && (
                            <div className="mt-3">
                              <div className="flex items-center space-x-2 mb-2">
                                <ImageIcon className="w-3 h-3 text-brand-brown-light" />
                                <span className="text-xs text-brand-brown-light">Hotel Images</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {accom.images.map((img: any, idx: number) => (
                                  <a
                                    key={idx}
                                    href={img.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block aspect-square rounded-lg overflow-hidden border border-brand-terracotta hover:border-amber-500 transition-colors"
                                  >
                                    <img
                                      src={img.file_url}
                                      alt={img.file_name}
                                      className="w-full h-full object-cover"
                                    />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                      );
                    }

                    if (item.type === 'transportation') {
                      const trans = item.data as Transportation;
                      return (
                        <div
                          key={trans.id}
                          className="bg-brand-beige rounded-lg p-5 border border-orange-600"
                        >
                          <div className="flex items-start space-x-4">
                            <Truck className="w-6 h-6 text-orange-600 mt-1 flex-shrink-0" />
                            <div className="flex-1">
                              <h4 className="text-lg font-bold text-brand-charcoal mb-3">Transportation</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                {trans.driver_name && (
                                  <div>
                                    <p className="text-brand-brown-light font-medium">Driver Name</p>
                                    <p className="text-brand-charcoal text-base font-semibold">{trans.driver_name}</p>
                                  </div>
                                )}
                                {trans.car_type && (
                                  <div>
                                    <p className="text-brand-brown-light font-medium">Vehicle</p>
                                    <p className="text-brand-charcoal text-base font-semibold">{trans.car_type}</p>
                                  </div>
                                )}
                                {trans.driver_phone && (
                                  <div className="col-span-1 sm:col-span-2">
                                    <p className="text-brand-brown-light font-medium">Contact</p>
                                    <a
                                      href={`tel:${trans.driver_phone}`}
                                      className="text-brand-charcoal text-base font-semibold hover:text-orange-600 transition-colors"
                                    >
                                      {trans.driver_phone}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (item.type === 'activity') {
                      const activity = item.data as Activity;
                      return (
                    <div
                      key={activity.id}
                      className={`rounded-lg p-5 border ${
                        activity.is_completed
                          ? 'bg-brand-beige bg-opacity-50 border-brand-terracotta'
                          : 'bg-brand-beige border-brand-terracotta'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <button
                          onClick={() =>
                            toggleActivityComplete(activity.id, activity.is_completed)
                          }
                          className="mt-1 flex-shrink-0"
                        >
                          {activity.is_completed ? (
                            <CheckCircle className="w-7 h-7 text-lime-400" />
                          ) : (
                            <Circle className="w-7 h-7 text-orange-600" />
                          )}
                        </button>

                        <ActivityIcon className="w-6 h-6 text-lime-400 mt-1 flex-shrink-0" />

                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Clock className="w-5 h-5 text-brand-brown-light" />
                            <span className="text-base font-semibold text-brand-charcoal">{activity.activity_time}</span>
                            {activity.duration_minutes && (
                              <span className="text-sm text-brand-brown-light">
                                ({activity.duration_minutes} min)
                              </span>
                            )}
                          </div>

                          <h4
                            className={`text-lg font-bold mb-2 ${
                              activity.is_completed ? 'text-orange-500 line-through' : 'text-brand-charcoal'
                            }`}
                          >
                            {activity.activity_name}
                          </h4>
                          <p className="text-base text-brand-chocolate mb-3">{activity.location}</p>

                          <div className="flex flex-wrap gap-2 text-xs mb-2">
                            <span className="px-2 py-1 bg-orange-950 text-brand-brown-warm rounded-full">
                              {activity.access_method.replace('_', ' ')}
                            </span>
                            {activity.payment_status !== 'pending' && (
                              <span
                                className={`px-2 py-1 rounded-full ${
                                  activity.payment_status === 'prepaid'
                                    ? 'bg-lime-900 text-lime-300'
                                    : 'bg-yellow-900 text-yellow-300'
                                }`}
                              >
                                {activity.payment_status.replace('_', ' ')}
                              </span>
                            )}
                          </div>

                          {activity.guide_notes && (
                            <div className="mt-2 p-2 bg-yellow-900 bg-opacity-40 border border-yellow-700 rounded text-xs text-yellow-200">
                              {activity.guide_notes}
                            </div>
                          )}

                          {activity.map_link && (
                            <a
                              href={activity.map_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-xs text-amber-400 hover:text-brand-chocolate mt-2"
                            >
                              <Navigation className="w-3 h-3" />
                              <span>Open in Maps</span>
                            </a>
                          )}

                          {activity.images && Array.isArray(activity.images) && activity.images.length > 0 && (
                            <div className="mt-3">
                              <div className="flex items-center space-x-2 mb-2">
                                <ImageIcon className="w-3 h-3 text-brand-brown-light" />
                                <span className="text-xs text-brand-brown-light">Access Method Images</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {activity.images.map((img: any, idx: number) => (
                                  <a
                                    key={idx}
                                    href={img.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block aspect-square rounded-lg overflow-hidden border border-brand-terracotta hover:border-lime-500 transition-colors"
                                  >
                                    <img
                                      src={img.file_url}
                                      alt={img.file_name}
                                      className="w-full h-full object-cover"
                                    />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                      );
                    }

                    if (item.type === 'dining') {
                      const meal = item.data as Dining;
                      return (
                    <div
                      key={meal.id}
                      className="bg-brand-beige rounded-lg p-4 border border-brand-terracotta"
                    >
                      <div className="flex items-start space-x-3">
                        <Utensils className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Clock className="w-3 h-3 text-brand-brown-light" />
                            <span className="text-sm text-brand-brown-warm">{meal.reservation_time}</span>
                            <span className="px-2 py-0.5 bg-orange-950 text-brand-brown-warm text-xs rounded-full capitalize">
                              {meal.meal_type}
                            </span>
                          </div>

                          <h4 className="font-semibold text-brand-charcoal mb-1">{meal.restaurant_name}</h4>
                          <p className="text-sm text-brand-brown-warm mb-2">
                            {meal.cuisine_type && `${meal.cuisine_type} • `}
                            {meal.location_address}
                          </p>

                          <div className="flex flex-wrap gap-2 text-xs mb-2">
                            {meal.included_in_package && (
                              <span className="px-2 py-1 bg-brand-terracotta-light text-brand-brown-warm rounded-full">
                                Included in package
                              </span>
                            )}
                            <span className="px-2 py-1 bg-orange-950 text-brand-brown-warm rounded-full capitalize">
                              {meal.location_type}
                            </span>
                          </div>

                          {meal.dietary_restrictions && (
                            <div className="mt-2 p-2 bg-brand-terracotta-light bg-opacity-40 border border-brand-terracotta rounded text-xs text-brand-brown-warm">
                              Dietary: {meal.dietary_restrictions}
                            </div>
                          )}

                          {meal.guide_notes && (
                            <div className="mt-2 p-2 bg-yellow-900 bg-opacity-40 border border-yellow-700 rounded text-xs text-yellow-200">
                              {meal.guide_notes}
                            </div>
                          )}

                          {meal.map_link && (
                            <a
                              href={meal.map_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-xs text-amber-400 hover:text-brand-chocolate mt-2"
                            >
                              <Navigation className="w-3 h-3" />
                              <span>Open in Maps</span>
                            </a>
                          )}

                          {meal.images && Array.isArray(meal.images) && meal.images.length > 0 && (
                            <div className="mt-3">
                              <div className="flex items-center space-x-2 mb-2">
                                <ImageIcon className="w-3 h-3 text-brand-brown-light" />
                                <span className="text-xs text-brand-brown-light">Restaurant Images</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {meal.images.map((img: any, idx: number) => (
                                  <a
                                    key={idx}
                                    href={img.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block aspect-square rounded-lg overflow-hidden border border-brand-terracotta hover:border-yellow-500 transition-colors"
                                  >
                                    <img
                                      src={img.file_url}
                                      alt={img.file_name}
                                      className="w-full h-full object-cover"
                                    />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                      );
                    }

                    return null;
                  })}
                </div>
              )}
            </div>
          );
        })
        ) : (
          <div className="bg-orange-900 rounded-lg p-4">
            <ItineraryTable tripId={selectedTrip.id} />
          </div>
        )}
      </main>

      {showCloneModal && (
        <div className="fixed inset-0 bg-brand-brown bg-opacity-20 flex items-center justify-center p-4 z-50">
          <div className="bg-orange-900 rounded-2xl max-w-lg w-full border border-brand-terracotta">
            <div className="p-6 border-b border-orange-800">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-brand-terracotta-light rounded-lg">
                  <Copy className="w-6 h-6 text-brand-brown-warm" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-brand-charcoal">Create Guide Copy</h2>
                  <p className="text-brand-brown-warm mt-1">Make a personal copy you can edit</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-brand-beige rounded-lg p-4 border border-brand-terracotta">
                <p className="text-base text-brand-chocolate">
                  <span className="font-bold text-brand-charcoal">Original Trip:</span> {selectedTrip.journey_name}
                </p>
                <p className="text-sm text-brand-brown-warm mt-2">
                  This creates your personal guide copy with the entire itinerary. The original trip remains unchanged.
                </p>
              </div>

              <div className="bg-green-900 bg-opacity-40 border border-green-700 rounded-lg p-4">
                <p className="text-sm text-green-200">
                  <span className="font-semibold">Your Copy Will:</span>
                </p>
                <ul className="text-sm text-green-200 mt-2 space-y-1 list-disc list-inside">
                  <li>Stay in your Guide View only</li>
                  <li>Not appear in admin's trip list</li>
                  <li>Be fully editable by you</li>
                  <li>Include all itinerary details</li>
                </ul>
              </div>
            </div>

            <div className="p-6 border-t border-orange-800 flex space-x-3">
              <button
                onClick={() => setShowCloneModal(false)}
                disabled={cloning}
                className="flex-1 px-4 py-3 border border-brand-terracotta text-brand-brown-warm hover:bg-orange-950 rounded-lg transition-colors disabled:opacity-50 font-medium text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleCloneTrip}
                disabled={cloning}
                className="flex-1 flex items-center justify-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base"
              >
                {cloning ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    <span>Create Guide Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTripDialog.isOpen}
        onClose={() => setDeleteTripDialog({ isOpen: false, trip: null })}
        onConfirm={handleDeleteTrip}
        title="Delete Guide Copy"
        message={`Are you sure you want to permanently delete "${deleteTripDialog.trip?.journey_name}"? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
