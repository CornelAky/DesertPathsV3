import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Clock,
  MapPin,
  Hotel,
  Utensils,
  Activity as ActivityIcon,
  Calendar,
  X,
  Download,
  FileSpreadsheet,
  Truck,
  Info,
} from 'lucide-react';
import type { Journey, ItineraryDay, Accommodation, Activity, Dining, Transportation } from '../../lib/database.types';
import { exportDayByDayToPDF, exportDayByDayToExcel } from '../../lib/exportUtils';

interface ClientViewProps {
  journey: Journey;
  onClose: () => void;
}

interface DayWithData {
  day: ItineraryDay;
  accommodations: Accommodation[];
  activities: Activity[];
  dining: Dining[];
  transportation: Transportation[];
}

export function ClientView({ journey, onClose }: ClientViewProps) {
  const { userProfile } = useAuth();
  const [daysWithData, setDaysWithData] = useState<DayWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, [journey.id]);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      const [customerResult, daysResult, accommodationsResult, activitiesResult, diningResult, transportationResult] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .eq('id', journey.customer_id)
          .maybeSingle(),
        supabase
          .from('itinerary_days')
          .select('*')
          .eq('journey_id', journey.id)
          .order('day_number', { ascending: true }),
        supabase
          .from('accommodations')
          .select('*')
          .eq('journey_id', journey.id),
        supabase
          .from('activities')
          .select('*')
          .eq('journey_id', journey.id)
          .order('timeline_order', { ascending: true }),
        supabase
          .from('dining')
          .select('*')
          .eq('journey_id', journey.id)
          .order('timeline_order', { ascending: true }),
        supabase
          .from('transportation')
          .select('*')
          .eq('journey_id', journey.id),
      ]);

      if (customerResult.error) throw customerResult.error;
      if (daysResult.error) throw daysResult.error;
      if (accommodationsResult.error) throw accommodationsResult.error;
      if (activitiesResult.error) throw activitiesResult.error;
      if (diningResult.error) throw diningResult.error;
      if (transportationResult.error) throw transportationResult.error;

      setCustomer(customerResult.data);

      const days = daysResult.data || [];
      const accommodations = accommodationsResult.data || [];
      const activities = activitiesResult.data || [];
      const dining = diningResult.data || [];
      const transportation = transportationResult.data || [];

      const organized = days.map(day => ({
        day,
        accommodations: accommodations.filter(a => a.day_id === day.id),
        activities: activities.filter(a => a.day_id === day.id),
        dining: dining.filter(d => d.day_id === day.id),
        transportation: transportation.filter(t => t.day_id === day.id),
      }));

      setDaysWithData(organized);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    try {
      const daysForExport = daysWithData.map(dwd => ({
        ...dwd.day,
        accommodations: dwd.accommodations,
        activities: dwd.activities,
        dining: dwd.dining,
        transportation: dwd.transportation,
      }));
      exportDayByDayToPDF(journey.journey_name, daysForExport);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
    }
  };

  const handleExportExcel = () => {
    try {
      const daysForExport = daysWithData.map(dwd => ({
        ...dwd.day,
        accommodations: dwd.accommodations,
        activities: dwd.activities,
        dining: dwd.dining,
        transportation: dwd.transportation,
      }));
      exportDayByDayToExcel(journey.journey_name, daysForExport);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Failed to export Excel');
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-95 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-6xl w-full my-8 shadow-2xl">
        <div className="sticky top-0 bg-gradient-to-br from-brand-orange via-brand-orange to-brand-brown text-white p-8 rounded-t-2xl z-10 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-6">
                <img
                  src="/desert_paths_logo.png"
                  alt="Desert Paths"
                  className="h-16 w-auto bg-white rounded-xl p-2 shadow-md"
                />
                <div>
                  <h1 className="text-4xl font-bold tracking-tight">{journey.journey_name}</h1>
                  {customer && (
                    <p className="text-white text-opacity-95 mt-2 text-lg">Prepared for {customer.name}</p>
                  )}
                  {userProfile && (
                    <p className="text-white text-opacity-80 mt-1 text-sm">
                      Welcome, {userProfile.name || userProfile.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-6 text-sm bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
                {journey.start_date && journey.end_date && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span className="font-medium">
                      {formatDate(journey.start_date)} - {formatDate(journey.end_date)}
                    </span>
                  </div>
                )}
                {journey.duration_days && (
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5" />
                    <span className="font-medium">{journey.duration_days} Days</span>
                  </div>
                )}
              </div>
              {journey.description && (
                <p className="mt-5 text-white text-opacity-95 leading-relaxed text-base bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
                  {journey.description}
                </p>
              )}
            </div>
            <div className="flex items-start space-x-2 ml-4">
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl transition-all hover:scale-105"
                  title="Export"
                >
                  <Download className="w-5 h-5" />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-20">
                    <button
                      onClick={handleExportPDF}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center space-x-3 text-slate-700 transition-colors"
                    >
                      <Download className="w-4 h-4 text-brand-orange" />
                      <span className="font-medium">Export as PDF</span>
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center space-x-3 text-slate-700 border-t border-slate-100 transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Export as Excel</span>
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl transition-all hover:scale-105"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-10 bg-gradient-to-b from-slate-50 to-white">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-orange border-t-transparent mx-auto mb-4"></div>
              <p className="text-slate-600 text-lg">Loading your itinerary...</p>
            </div>
          ) : daysWithData.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-300">
              <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 text-lg">No itinerary days yet</p>
            </div>
          ) : (
            <div className="space-y-12">
              {daysWithData.map(({ day, accommodations, activities, dining, transportation }) => {
                const hasContent = accommodations.length > 0 || activities.length > 0 || dining.length > 0 || transportation.length > 0;

                return (
                  <div key={day.id} className="relative">
                    <div className="bg-gradient-to-r from-amber-100 via-amber-50 to-transparent rounded-2xl p-6 mb-8 shadow-sm border-l-4 border-brand-orange">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand-orange to-brand-brown text-white rounded-full font-bold text-2xl shadow-lg">
                          {day.day_number}
                        </div>
                        <div className="flex-1">
                          <h2 className="text-3xl font-bold text-brand-brown mb-1">
                            Day {day.day_number}
                          </h2>
                          <div className="flex items-center gap-4 flex-wrap">
                            {day.date && (
                              <p className="text-slate-700 text-lg">
                                {formatDate(day.date)}
                              </p>
                            )}
                            {day.city_destination && (
                              <p className="text-slate-600 text-base">
                                {day.city_destination}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {!hasContent ? (
                      <div className="ml-8 pl-8 text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                        <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-500">No activities scheduled for this day</p>
                      </div>
                    ) : (
                      <div className="space-y-6 ml-8 border-l-2 border-slate-200 pl-8">
                        {accommodations.map((accom) => (
                          <div key={accom.id} className="relative">
                            <div className="absolute -left-11 top-4 w-8 h-8 rounded-full flex items-center justify-center shadow-md bg-blue-600 text-white">
                              <Hotel className="w-5 h-5" />
                            </div>
                            <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-6 border-l-4 border-blue-500">
                              <div className="flex items-center space-x-3 mb-3">
                                <span className="px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-semibold rounded-lg">
                                  Accommodation
                                </span>
                                {accom.check_in_time && (
                                  <span className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                                    <Clock className="w-4 h-4 text-slate-600" />
                                    <span className="text-base font-bold text-slate-900">{formatTime(accom.check_in_time)}</span>
                                  </span>
                                )}
                              </div>
                              <h3 className="text-2xl font-bold text-slate-900 mb-3">{accom.hotel_name}</h3>
                              {accom.location_address && (
                                <div className="flex items-start space-x-2 text-slate-600 mb-3">
                                  <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0 text-brand-orange" />
                                  <span className="text-base">{accom.location_address}</span>
                                </div>
                              )}
                              {accom.client_description && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mt-3">
                                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{accom.client_description}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {dining
                          .filter(m => m.meal_type?.toLowerCase() === 'breakfast')
                          .map((meal) => (
                            <div key={meal.id} className="relative">
                              <div className="absolute -left-11 top-4 w-8 h-8 rounded-full flex items-center justify-center shadow-md bg-green-600 text-white">
                                <Utensils className="w-5 h-5" />
                              </div>
                              <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-6 border-l-4 border-green-500">
                                <div className="flex items-center space-x-3 mb-3">
                                  <span className="px-3 py-1.5 bg-green-600 text-white text-sm font-semibold rounded-lg capitalize">
                                    {meal.meal_type}
                                  </span>
                                  {meal.reservation_time && (
                                    <span className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                                      <Clock className="w-4 h-4 text-slate-600" />
                                      <span className="text-base font-bold text-slate-900">{formatTime(meal.reservation_time)}</span>
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-3">{meal.restaurant_name}</h3>
                                {meal.location_address && (
                                  <div className="flex items-start space-x-2 text-slate-600 mb-3">
                                    <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0 text-brand-orange" />
                                    <span className="text-base">{meal.location_address}</span>
                                  </div>
                                )}
                                {meal.client_notes && (
                                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mt-3">
                                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{meal.client_notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                        {activities.map((activity) => (
                          <div key={activity.id} className="relative">
                            <div className="absolute -left-11 top-4 w-8 h-8 rounded-full flex items-center justify-center shadow-md bg-amber-600 text-white">
                              <ActivityIcon className="w-5 h-5" />
                            </div>
                            <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-6 border-l-4 border-amber-500">
                              <div className="flex items-center space-x-3 mb-3">
                                <span className="px-3 py-1.5 bg-amber-100 text-amber-800 text-sm font-semibold rounded-lg">
                                  Activity
                                </span>
                                {activity.activity_time && (
                                  <span className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                                    <Clock className="w-4 h-4 text-slate-600" />
                                    <span className="text-base font-bold text-slate-900">{formatTime(activity.activity_time)}</span>
                                  </span>
                                )}
                              </div>
                              <h3 className="text-2xl font-bold text-slate-900 mb-3">{activity.activity_name}</h3>
                              {activity.location && (
                                <div className="flex items-start space-x-2 text-slate-600 mb-3">
                                  <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0 text-brand-orange" />
                                  <span className="text-base">{activity.location}</span>
                                </div>
                              )}
                              {activity.client_description && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mt-3">
                                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{activity.client_description}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {dining
                          .filter(m => m.meal_type?.toLowerCase() === 'lunch')
                          .map((meal) => (
                            <div key={meal.id} className="relative">
                              <div className="absolute -left-11 top-4 w-8 h-8 rounded-full flex items-center justify-center shadow-md bg-green-600 text-white">
                                <Utensils className="w-5 h-5" />
                              </div>
                              <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-6 border-l-4 border-green-500">
                                <div className="flex items-center space-x-3 mb-3">
                                  <span className="px-3 py-1.5 bg-green-600 text-white text-sm font-semibold rounded-lg capitalize">
                                    {meal.meal_type}
                                  </span>
                                  {meal.reservation_time && (
                                    <span className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                                      <Clock className="w-4 h-4 text-slate-600" />
                                      <span className="text-base font-bold text-slate-900">{formatTime(meal.reservation_time)}</span>
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-3">{meal.restaurant_name}</h3>
                                {meal.location_address && (
                                  <div className="flex items-start space-x-2 text-slate-600 mb-3">
                                    <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0 text-brand-orange" />
                                    <span className="text-base">{meal.location_address}</span>
                                  </div>
                                )}
                                {meal.client_notes && (
                                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mt-3">
                                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{meal.client_notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                        {dining
                          .filter(m => m.meal_type?.toLowerCase() === 'dinner')
                          .map((meal) => (
                            <div key={meal.id} className="relative">
                              <div className="absolute -left-11 top-4 w-8 h-8 rounded-full flex items-center justify-center shadow-md bg-green-600 text-white">
                                <Utensils className="w-5 h-5" />
                              </div>
                              <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-6 border-l-4 border-green-500">
                                <div className="flex items-center space-x-3 mb-3">
                                  <span className="px-3 py-1.5 bg-green-600 text-white text-sm font-semibold rounded-lg capitalize">
                                    {meal.meal_type}
                                  </span>
                                  {meal.reservation_time && (
                                    <span className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                                      <Clock className="w-4 h-4 text-slate-600" />
                                      <span className="text-base font-bold text-slate-900">{formatTime(meal.reservation_time)}</span>
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-3">{meal.restaurant_name}</h3>
                                {meal.location_address && (
                                  <div className="flex items-start space-x-2 text-slate-600 mb-3">
                                    <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0 text-brand-orange" />
                                    <span className="text-base">{meal.location_address}</span>
                                  </div>
                                )}
                                {meal.client_notes && (
                                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mt-3">
                                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{meal.client_notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                        {transportation.map((trans) => (
                          <div key={trans.id} className="relative">
                            <div className="absolute -left-11 top-4 w-8 h-8 rounded-full flex items-center justify-center shadow-md bg-slate-600 text-white">
                              <Truck className="w-5 h-5" />
                            </div>
                            <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-6 border-l-4 border-slate-500">
                              <div className="flex items-center space-x-3 mb-3">
                                <span className="px-3 py-1.5 bg-slate-100 text-slate-800 text-sm font-semibold rounded-lg">
                                  Transportation
                                </span>
                              </div>
                              <h3 className="text-2xl font-bold text-slate-900 mb-3">{trans.service_type || 'Transportation'}</h3>
                              <div className="space-y-2 text-slate-600">
                                {trans.pickup_location && (
                                  <div className="flex items-start space-x-2">
                                    <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0 text-green-600" />
                                    <div>
                                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Pickup</p>
                                      <p className="text-base">{trans.pickup_location}</p>
                                    </div>
                                  </div>
                                )}
                                {trans.dropoff_location && (
                                  <div className="flex items-start space-x-2">
                                    <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-600" />
                                    <div>
                                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Drop-off</p>
                                      <p className="text-base">{trans.dropoff_location}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {trans.notes && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mt-3 flex items-start space-x-2">
                                  <Info className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
                                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{trans.notes}</p>
                                </div>
                              )}
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

        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-10 py-8 rounded-b-2xl border-t-2 border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <img
                src="/desert_paths_logo.png"
                alt="Desert Paths"
                className="h-16 w-auto"
              />
              <div>
                <p className="font-bold text-slate-900 text-lg">Desert Paths</p>
                <p className="text-slate-600 text-sm">Creating Unforgettable Journeys</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-gradient-to-r from-brand-orange to-brand-brown hover:from-brand-orange-hover hover:to-brand-brown text-white rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl hover:scale-105"
            >
              Close
            </button>
          </div>
          <div className="text-center text-sm text-slate-500 border-t border-slate-300 pt-6">
            <p>Thank you for choosing us for your journey</p>
          </div>
        </div>
      </div>
    </div>
  );
}
