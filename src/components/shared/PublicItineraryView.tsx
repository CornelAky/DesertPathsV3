import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Clock,
  MapPin,
  Hotel,
  Utensils,
  Activity as ActivityIcon,
  Calendar,
  Truck,
  AlertCircle,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import type { Journey, ItineraryDay, Accommodation, Activity, Dining, Transportation } from '../../lib/database.types';
import { exportDayByDayToPDF, exportDayByDayToExcel } from '../../lib/exportUtils';

interface PublicItineraryViewProps {
  token: string;
}

interface DayWithData {
  day: ItineraryDay;
  accommodations: Accommodation[];
  activities: Activity[];
  dining: Dining[];
  transportation: Transportation[];
}

export function PublicItineraryView({ token }: PublicItineraryViewProps) {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [daysWithData, setDaysWithData] = useState<DayWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<any>(null);

  useEffect(() => {
    validateAndFetchData();
  }, [token]);

  const validateAndFetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Track view first
      await supabase.rpc('track_link_view', { share_token: token });

      // Fetch all data using the public function
      const { data: result, error: fetchError } = await supabase.rpc('get_public_journey_data', {
        share_token: token
      });

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        throw fetchError;
      }

      if (!result || !result.valid) {
        setError(result?.error || 'Invalid link. This share link does not exist or has expired.');
        setLoading(false);
        return;
      }

      if (!result.journey) {
        setError('Journey not found.');
        setLoading(false);
        return;
      }

      setJourney(result.journey);
      setCustomer(result.customer);

      const days = result.days || [];
      const accommodations = result.accommodations || [];
      const activities = result.activities || [];
      const dining = result.dining || [];
      const transportation = result.transportation || [];

      const organized = days.map((day: any) => ({
        day,
        accommodations: accommodations.filter((a: any) => a.day_id === day.id),
        activities: activities.filter((a: any) => a.day_id === day.id),
        dining: dining.filter((d: any) => d.day_id === day.id),
        transportation: transportation.filter((t: any) => t.day_id === day.id),
      }));

      setDaysWithData(organized);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load itinerary. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!journey) return;
    try {
      const daysForExport = daysWithData.map(dwd => ({
        ...dwd.day,
        accommodations: dwd.accommodations,
        activities: dwd.activities,
        dining: dwd.dining,
        transportation: dwd.transportation,
      }));
      exportDayByDayToPDF(journey.journey_name, daysForExport);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
    }
  };

  const handleExportExcel = () => {
    if (!journey) return;
    try {
      const daysForExport = daysWithData.map(dwd => ({
        ...dwd.day,
        accommodations: dwd.accommodations,
        activities: dwd.activities,
        dining: dwd.dining,
        transportation: dwd.transportation,
      }));
      exportDayByDayToExcel(journey.journey_name, daysForExport);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Itinerary</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!journey) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 bg-opacity-95">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-brand-orange via-brand-orange to-brand-brown text-white p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-4">
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
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={handleExportPDF}
                  className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors flex items-center gap-2 backdrop-blur-sm"
                  title="Export to PDF"
                >
                  <Download className="w-5 h-5" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
                <button
                  onClick={handleExportExcel}
                  className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors flex items-center gap-2 backdrop-blur-sm"
                  title="Export to Excel"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  <span className="hidden sm:inline">Excel</span>
                </button>
              </div>
            </div>
            {journey.trip_description && (
              <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-white text-opacity-90">{journey.trip_description}</p>
              </div>
            )}
          </div>

          <div className="p-6 md:p-8 space-y-8">
            {daysWithData.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No itinerary days available yet.</p>
              </div>
            ) : (
              daysWithData.map((dayData, index) => (
                <div
                  key={dayData.day.id}
                  className="border border-gray-200 rounded-xl overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-gray-50 to-white p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">
                          Day {dayData.day.day_number}
                        </h2>
                        <div className="flex items-center text-gray-600 space-x-4">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span>{formatDate(dayData.day.date)}</span>
                          </div>
                          {dayData.day.city_destination && (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-2" />
                              <span>{dayData.day.city_destination}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {dayData.transportation.length > 0 && (
                      <div>
                        <h3 className="flex items-center text-lg font-semibold text-gray-900 mb-3">
                          <Truck className="w-5 h-5 mr-2 text-blue-600" />
                          Transportation
                        </h3>
                        {dayData.transportation.map((trans) => (
                          <div key={trans.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                            {trans.vehicle_type && (
                              <h4 className="font-semibold text-gray-900 mb-2">{trans.vehicle_type}</h4>
                            )}
                            <div className="space-y-1 text-sm text-gray-600">
                              {trans.pickup_time && (
                                <p>
                                  <Clock className="w-4 h-4 inline mr-1" />
                                  <span className="font-medium">Pickup:</span> {formatTime(trans.pickup_time)}
                                </p>
                              )}
                              {trans.pickup_location && (
                                <p>
                                  <MapPin className="w-4 h-4 inline mr-1" />
                                  <span className="font-medium">From:</span> {trans.pickup_location}
                                </p>
                              )}
                              {trans.dropoff_location && (
                                <p>
                                  <MapPin className="w-4 h-4 inline mr-1" />
                                  <span className="font-medium">To:</span> {trans.dropoff_location}
                                </p>
                              )}
                            </div>
                            {trans.client_notes && (
                              <p className="text-sm text-gray-700 mt-2 border-t border-blue-200 pt-2">{trans.client_notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {dayData.accommodations.length > 0 && (
                      <div>
                        <h3 className="flex items-center text-lg font-semibold text-gray-900 mb-3">
                          <Hotel className="w-5 h-5 mr-2 text-purple-600" />
                          Accommodation
                        </h3>
                        {dayData.accommodations.map((accom) => (
                          <div key={accom.id} className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-3">
                            <h4 className="font-semibold text-gray-900 mb-2">{accom.hotel_name}</h4>
                            {accom.location_address && (
                              <p className="text-sm text-gray-600 flex items-center mb-2">
                                <MapPin className="w-4 h-4 mr-1" />
                                {accom.location_address}
                              </p>
                            )}
                            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                              {accom.check_in_time && (
                                <div>
                                  <span className="font-medium">Check-in:</span> {formatTime(accom.check_in_time)}
                                </div>
                              )}
                              {accom.check_out_time && (
                                <div>
                                  <span className="font-medium">Check-out:</span> {formatTime(accom.check_out_time)}
                                </div>
                              )}
                              {accom.room_type && (
                                <div className="col-span-2">
                                  <span className="font-medium">Room:</span> {accom.room_type}
                                </div>
                              )}
                            </div>
                            {accom.client_notes && (
                              <p className="text-sm text-gray-700 mt-2 border-t border-purple-200 pt-2">{accom.client_notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {dayData.activities.length > 0 && (
                      <div>
                        <h3 className="flex items-center text-lg font-semibold text-gray-900 mb-3">
                          <ActivityIcon className="w-5 h-5 mr-2 text-green-600" />
                          Activities
                        </h3>
                        {dayData.activities.map((activity) => (
                          <div key={activity.id} className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-900 text-lg">{activity.activity_name}</h4>
                              {activity.activity_time && (
                                <span className="text-sm font-medium text-gray-600 flex items-center whitespace-nowrap ml-2">
                                  <Clock className="w-4 h-4 mr-1" />
                                  {formatTime(activity.activity_time)}
                                </span>
                              )}
                            </div>
                            {activity.location && (
                              <p className="text-sm text-gray-600 flex items-center mb-2">
                                <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                                {activity.location}
                              </p>
                            )}
                            {activity.duration_hours && (
                              <p className="text-sm text-gray-600 mb-2">
                                <span className="font-medium">Duration:</span> {activity.duration_hours} hours
                              </p>
                            )}
                            {activity.client_description && (
                              <p className="text-sm text-gray-700 mt-2 border-t border-green-200 pt-2">{activity.client_description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {dayData.dining.length > 0 && (
                      <div>
                        <h3 className="flex items-center text-lg font-semibold text-gray-900 mb-3">
                          <Utensils className="w-5 h-5 mr-2 text-orange-600" />
                          Dining
                        </h3>
                        {dayData.dining.map((meal) => (
                          <div key={meal.id} className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 text-lg">{meal.restaurant_name}</h4>
                                {meal.meal_type && (
                                  <span className="inline-block px-2.5 py-1 bg-orange-200 text-orange-800 text-xs font-medium rounded mt-1 capitalize">
                                    {meal.meal_type}
                                  </span>
                                )}
                              </div>
                              {meal.reservation_time && (
                                <span className="text-sm font-medium text-gray-600 flex items-center whitespace-nowrap ml-2">
                                  <Clock className="w-4 h-4 mr-1" />
                                  {formatTime(meal.reservation_time)}
                                </span>
                              )}
                            </div>
                            {meal.location_address && (
                              <p className="text-sm text-gray-600 flex items-center mb-2">
                                <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                                {meal.location_address}
                              </p>
                            )}
                            {meal.cuisine_type && (
                              <p className="text-sm text-gray-600 mb-2">
                                <span className="font-medium">Cuisine:</span> {meal.cuisine_type}
                              </p>
                            )}
                            {meal.client_notes && (
                              <p className="text-sm text-gray-700 mt-2 border-t border-orange-200 pt-2">{meal.client_notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {dayData.accommodations.length === 0 &&
                      dayData.activities.length === 0 &&
                      dayData.dining.length === 0 &&
                      dayData.transportation.length === 0 && (
                        <p className="text-center text-gray-500 py-8">
                          No activities scheduled for this day yet.
                        </p>
                      )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-gray-50 border-t border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-600">
              This itinerary was shared with you by Desert Paths Tours
            </p>
            <p className="text-xs text-gray-500 mt-1">
              For questions or changes, please contact your journey coordinator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
