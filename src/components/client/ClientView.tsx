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
  MessageCircle,
  Send,
  StickyNote,
} from 'lucide-react';
import type { Trip, ItineraryDay, Accommodation, Activity, Dining, Transportation } from '../../lib/database.types';
import { exportDayByDayToPDF, exportDayByDayToExcel } from '../../lib/exportUtils';

interface ClientViewProps {
  trip: Trip;
  onClose: () => void;
}

interface DayWithData {
  day: ItineraryDay;
  accommodations: Accommodation[];
  activities: Activity[];
  dining: Dining[];
  transportation: Transportation[];
}

interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  user_name: string;
  is_admin_response: boolean;
  context_type: string;
  context_id: string | null;
}

interface Note {
  id: string;
  note_text: string;
  created_at: string;
  created_by_name: string;
  context_type: string;
  context_id: string | null;
}

export function ClientView({ trip, onClose }: ClientViewProps) {
  const { userProfile } = useAuth();
  const [daysWithData, setDaysWithData] = useState<DayWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newComment, setNewComment] = useState('');
  const [selectedContext, setSelectedContext] = useState<{ type: string; id: string | null; name: string } | null>(null);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    fetchAllData();
    fetchCommentsAndNotes();
  }, [trip.id]);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      const [customerResult, daysResult, accommodationsResult, activitiesResult, diningResult, transportationResult] = await Promise.all([
        supabase
          .from('customers')
          .select('id, name')
          .eq('id', trip.customer_id)
          .maybeSingle(),
        supabase
          .from('itinerary_days')
          .select('id, journey_id, day_number, date, city_destination')
          .eq('journey_id', trip.id)
          .order('day_number', { ascending: true }),
        supabase
          .from('accommodations')
          .select('id, journey_id, day_id, hotel_name, location_address, check_in_time, check_out_time, client_description')
          .eq('journey_id', trip.id),
        supabase
          .from('activities')
          .select('id, journey_id, day_id, activity_name, location, activity_time, client_description, timeline_order')
          .eq('journey_id', trip.id)
          .order('timeline_order', { ascending: true }),
        supabase
          .from('dining')
          .select('id, journey_id, day_id, meal_type, restaurant_name, location_address, reservation_time, client_notes, timeline_order')
          .eq('journey_id', trip.id)
          .order('timeline_order', { ascending: true }),
        supabase
          .from('transportation')
          .select('id, journey_id, day_id, service_type, pickup_location, dropoff_location, notes')
          .eq('journey_id', trip.id),
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

  const fetchCommentsAndNotes = async () => {
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from('journey_comments')
        .select(`
          id,
          user_id,
          comment_text,
          created_at,
          is_admin_response,
          context_type,
          context_id,
          users!journey_comments_user_id_fkey (name, email)
        `)
        .eq('journey_id', trip.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      const formattedComments = commentsData?.map(c => ({
        id: c.id,
        user_id: c.user_id,
        comment_text: c.comment_text,
        created_at: c.created_at,
        user_name: c.users?.name || c.users?.email || 'Unknown',
        is_admin_response: c.is_admin_response,
        context_type: c.context_type,
        context_id: c.context_id,
      })) || [];

      setComments(formattedComments);

      const { data: notesData, error: notesError } = await supabase
        .from('journey_notes')
        .select(`
          id,
          note_text,
          created_at,
          context_type,
          context_id,
          created_by,
          users!journey_notes_created_by_fkey (name, email)
        `)
        .eq('journey_id', trip.id)
        .eq('is_private', false)
        .order('created_at', { ascending: true });

      if (notesError) throw notesError;

      const formattedNotes = notesData?.map(n => ({
        id: n.id,
        note_text: n.note_text,
        created_at: n.created_at,
        created_by_name: n.users?.name || n.users?.email || 'Admin',
        context_type: n.context_type,
        context_id: n.context_id,
      })) || [];

      setNotes(formattedNotes);
    } catch (error) {
      console.error('Error fetching comments and notes:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedContext) return;

    try {
      const { error } = await supabase.from('journey_comments').insert({
        journey_id: trip.id,
        user_id: userProfile?.id,
        comment_text: newComment.trim(),
        context_type: selectedContext.type,
        context_id: selectedContext.id,
        is_admin_response: false,
      });

      if (error) throw error;

      setNewComment('');
      await fetchCommentsAndNotes();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    }
  };

  const getContextComments = (contextType: string, contextId: string | null) => {
    return comments.filter(c => c.context_type === contextType && c.context_id === contextId);
  };

  const getContextNotes = (contextType: string, contextId: string | null) => {
    return notes.filter(n => n.context_type === contextType && n.context_id === contextId);
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
      exportDayByDayToPDF(trip.journey_name, daysForExport);
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
      exportDayByDayToExcel(trip.journey_name, daysForExport);
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

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const CommentButton = ({ contextType, contextId, contextName }: { contextType: string; contextId: string | null; contextName: string }) => {
    const contextComments = getContextComments(contextType, contextId);
    const contextNotes = getContextNotes(contextType, contextId);
    const hasContent = contextComments.length > 0 || contextNotes.length > 0;

    return (
      <button
        onClick={() => {
          setSelectedContext({ type: contextType, id: contextId, name: contextName });
          setShowComments(true);
        }}
        className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          hasContent
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        <MessageCircle className="w-4 h-4" />
        <span>Chat {hasContent && `(${contextComments.length})`}</span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-95 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-6xl w-full my-8 shadow-2xl">
        <div className="sticky top-0 bg-gradient-to-br from-brand-orange via-brand-orange to-brand-brown text-white p-8 rounded-t-2xl z-10 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-6">
                <img
                  src="/all_white_-_used_on_website_header_and_url.png"
                  alt="Desert Paths"
                  className="h-16 w-auto drop-shadow-lg"
                />
                <div>
                  <h1 className="text-4xl font-bold tracking-tight">{trip.journey_name}</h1>
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
                {trip.start_date && trip.end_date && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span className="font-medium">
                      {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                    </span>
                  </div>
                )}
                {trip.duration_days && (
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5" />
                    <span className="font-medium">{trip.duration_days} Days</span>
                  </div>
                )}
              </div>
              {trip.description && (
                <p className="mt-5 text-white text-opacity-95 leading-relaxed text-base bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
                  {trip.description}
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
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
                        <CommentButton
                          contextType="day"
                          contextId={day.id}
                          contextName={`Day ${day.day_number}`}
                        />
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
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
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
                                <CommentButton
                                  contextType="accommodation"
                                  contextId={accom.id}
                                  contextName={accom.hotel_name}
                                />
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
                              {getContextNotes('accommodation', accom.id).map(note => (
                                <div key={note.id} className="bg-yellow-50 rounded-xl p-4 border border-yellow-200 mt-3 flex items-start space-x-2">
                                  <StickyNote className="w-4 h-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-sm text-yellow-900 font-medium">{note.created_by_name}</p>
                                    <p className="text-yellow-800 mt-1">{note.note_text}</p>
                                  </div>
                                </div>
                              ))}
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
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-3">
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
                                  <CommentButton
                                    contextType="dining"
                                    contextId={meal.id}
                                    contextName={`${meal.meal_type} - ${meal.restaurant_name}`}
                                  />
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
                                {getContextNotes('dining', meal.id).map(note => (
                                  <div key={note.id} className="bg-yellow-50 rounded-xl p-4 border border-yellow-200 mt-3 flex items-start space-x-2">
                                    <StickyNote className="w-4 h-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                                    <div className="flex-1">
                                      <p className="text-sm text-yellow-900 font-medium">{note.created_by_name}</p>
                                      <p className="text-yellow-800 mt-1">{note.note_text}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}

                        {activities.map((activity) => (
                          <div key={activity.id} className="relative">
                            <div className="absolute -left-11 top-4 w-8 h-8 rounded-full flex items-center justify-center shadow-md bg-amber-600 text-white">
                              <ActivityIcon className="w-5 h-5" />
                            </div>
                            <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-6 border-l-4 border-amber-500">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
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
                                <CommentButton
                                  contextType="activity"
                                  contextId={activity.id}
                                  contextName={activity.activity_name}
                                />
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
                              {getContextNotes('activity', activity.id).map(note => (
                                <div key={note.id} className="bg-yellow-50 rounded-xl p-4 border border-yellow-200 mt-3 flex items-start space-x-2">
                                  <StickyNote className="w-4 h-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-sm text-yellow-900 font-medium">{note.created_by_name}</p>
                                    <p className="text-yellow-800 mt-1">{note.note_text}</p>
                                  </div>
                                </div>
                              ))}
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
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-3">
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
                                  <CommentButton
                                    contextType="dining"
                                    contextId={meal.id}
                                    contextName={`${meal.meal_type} - ${meal.restaurant_name}`}
                                  />
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
                                {getContextNotes('dining', meal.id).map(note => (
                                  <div key={note.id} className="bg-yellow-50 rounded-xl p-4 border border-yellow-200 mt-3 flex items-start space-x-2">
                                    <StickyNote className="w-4 h-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                                    <div className="flex-1">
                                      <p className="text-sm text-yellow-900 font-medium">{note.created_by_name}</p>
                                      <p className="text-yellow-800 mt-1">{note.note_text}</p>
                                    </div>
                                  </div>
                                ))}
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
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-3">
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
                                  <CommentButton
                                    contextType="dining"
                                    contextId={meal.id}
                                    contextName={`${meal.meal_type} - ${meal.restaurant_name}`}
                                  />
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
                                {getContextNotes('dining', meal.id).map(note => (
                                  <div key={note.id} className="bg-yellow-50 rounded-xl p-4 border border-yellow-200 mt-3 flex items-start space-x-2">
                                    <StickyNote className="w-4 h-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                                    <div className="flex-1">
                                      <p className="text-sm text-yellow-900 font-medium">{note.created_by_name}</p>
                                      <p className="text-yellow-800 mt-1">{note.note_text}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}

                        {transportation.map((trans) => (
                          <div key={trans.id} className="relative">
                            <div className="absolute -left-11 top-4 w-8 h-8 rounded-full flex items-center justify-center shadow-md bg-slate-600 text-white">
                              <Truck className="w-5 h-5" />
                            </div>
                            <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-6 border-l-4 border-slate-500">
                              <div className="flex items-center justify-between mb-3">
                                <span className="px-3 py-1.5 bg-slate-100 text-slate-800 text-sm font-semibold rounded-lg">
                                  Transportation
                                </span>
                                <CommentButton
                                  contextType="transportation"
                                  contextId={trans.id}
                                  contextName={trans.service_type || 'Transportation'}
                                />
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
                              {getContextNotes('transportation', trans.id).map(note => (
                                <div key={note.id} className="bg-yellow-50 rounded-xl p-4 border border-yellow-200 mt-3 flex items-start space-x-2">
                                  <StickyNote className="w-4 h-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-sm text-yellow-900 font-medium">{note.created_by_name}</p>
                                    <p className="text-yellow-800 mt-1">{note.note_text}</p>
                                  </div>
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

        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-10 py-8 rounded-b-2xl border-t-2 border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <img
                src="/all_white_-_used_on_website_header_and_url.png"
                alt="Desert Paths"
                className="h-12 w-auto"
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

      {showComments && selectedContext && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="bg-gradient-to-r from-brand-orange to-brand-brown text-white p-6 rounded-t-2xl flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">Chat & Notes</h3>
                <p className="text-white text-opacity-90 mt-1">{selectedContext.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowComments(false);
                  setSelectedContext(null);
                }}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {getContextComments(selectedContext.type, selectedContext.id).length === 0 &&
               getContextNotes(selectedContext.type, selectedContext.id).length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <>
                  {getContextComments(selectedContext.type, selectedContext.id).map(comment => (
                    <div
                      key={comment.id}
                      className={`flex ${comment.user_id === userProfile?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-md rounded-xl p-4 ${
                          comment.user_id === userProfile?.id
                            ? 'bg-brand-orange text-white'
                            : comment.is_admin_response
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-sm font-semibold ${
                            comment.user_id === userProfile?.id ? 'text-white' : 'text-slate-900'
                          }`}>
                            {comment.user_id === userProfile?.id ? 'You' : comment.user_name}
                            {comment.is_admin_response && ' (Admin)'}
                          </p>
                          <p className={`text-xs ${
                            comment.user_id === userProfile?.id ? 'text-white text-opacity-75' : 'text-slate-500'
                          }`}>
                            {formatDateTime(comment.created_at)}
                          </p>
                        </div>
                        <p className={comment.user_id === userProfile?.id ? 'text-white' : 'text-slate-700'}>
                          {comment.comment_text}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="border-t border-slate-200 p-4 bg-slate-50 rounded-b-2xl">
              <div className="flex items-end space-x-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 resize-none border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-brand-orange to-brand-brown text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Send className="w-5 h-5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
