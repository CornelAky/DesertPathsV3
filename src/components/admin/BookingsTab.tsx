import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Hotel,
  Activity as ActivityIcon,
  Utensils,
  CheckCircle,
  Circle,
  AlertCircle,
  DollarSign,
  Calendar,
  MapPin,
  ChevronDown,
  ChevronUp,
  Save,
  Upload,
  FileText,
  Download,
  Trash2,
  File,
  Image as ImageIcon,
  Paperclip,
} from 'lucide-react';

interface BookingsTabProps {
  journeyId: string;
}

type BookingStatus = 'booked' | 'unbooked' | 'n/a';

interface Accommodation {
  id: string;
  day_id: string;
  hotel_name: string;
  location_address: string;
  check_in_time: string | null;
  check_out_time: string | null;
  internal_booking_status: BookingStatus;
  internal_booking_notes: string;
}

interface Activity {
  id: string;
  day_id: string;
  activity_name: string;
  location: string;
  activity_time: string;
  internal_booking_status: BookingStatus;
  internal_booking_notes: string;
}

interface Dining {
  id: string;
  day_id: string;
  meal_type: string;
  restaurant_name: string;
  location_address: string;
  reservation_time: string;
  internal_booking_status: BookingStatus;
  internal_booking_notes: string;
}

interface DayInfo {
  id: string;
  day_number: number;
  date: string;
  city_destination: string;
}

interface ActivityAttachment {
  id: string;
  activity_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string;
}

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function BookingsTab({ journeyId }: BookingsTabProps) {
  const [accommodations, setAccommodations] = useState<(Accommodation & { day: DayInfo })[]>([]);
  const [activities, setActivities] = useState<(Activity & { day: DayInfo })[]>([]);
  const [dining, setDining] = useState<(Dining & { day: DayInfo })[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    hotels: true,
    activities: true,
    restaurants: true,
  });
  const [editingItem, setEditingItem] = useState<{
    type: 'accommodation' | 'activity' | 'dining';
    id: string;
    status: BookingStatus;
    notes: string;
  } | null>(null);
  const [attachments, setAttachments] = useState<Map<string, ActivityAttachment[]>>(new Map());
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [showAttachments, setShowAttachments] = useState<Set<string>>(new Set());
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    fetchBookings();
  }, [journeyId]);

  const loadAttachments = async (activityId: string) => {
    try {
      const { data, error } = await supabase
        .from('activity_booking_attachments')
        .select('id, activity_id, file_name, file_path, file_url, file_type, file_size, uploaded_at')
        .eq('activity_id', activityId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setAttachments(prev => new Map(prev).set(activityId, data as ActivityAttachment[]));
      }
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  };

  const uploadFile = async (activityId: string, file: File) => {
    try {
      setUploadingFiles(prev => new Set(prev).add(activityId));

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `activities/${activityId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('booking-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('booking-documents')
        .getPublicUrl(filePath);

      const { data: { user } } = await supabase.auth.getUser();

      const { error: dbError } = await supabase
        .from('activity_booking_attachments')
        .insert({
          activity_id: activityId,
          file_name: file.name,
          file_path: filePath,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user?.id,
        });

      if (dbError) throw dbError;

      await loadAttachments(activityId);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setUploadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(activityId);
        return newSet;
      });
    }
  };

  const deleteAttachment = async (activityId: string, attachment: ActivityAttachment) => {
    if (!confirm(`Delete ${attachment.file_name}?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('booking-documents')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('activity_booking_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      await loadAttachments(activityId);
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Failed to delete attachment');
    }
  };

  const handleFileSelect = async (activityId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert('File is too large. Maximum size is 10MB.');
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      alert('File type not supported. Please upload JPG, PNG, PDF, or DOC files.');
      return;
    }

    await uploadFile(activityId, file);
    e.target.value = '';
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <ImageIcon className="w-4 h-4 text-blue-600" />;
    } else if (ext === 'pdf') {
      return <FileText className="w-4 h-4 text-red-600" />;
    } else {
      return <File className="w-4 h-4 text-slate-600" />;
    }
  };

  const toggleAttachments = async (activityId: string) => {
    const newSet = new Set(showAttachments);
    if (newSet.has(activityId)) {
      newSet.delete(activityId);
    } else {
      newSet.add(activityId);
      if (!attachments.has(activityId)) {
        await loadAttachments(activityId);
      }
    }
    setShowAttachments(newSet);
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);

      const { data: days, error: daysError } = await supabase
        .from('itinerary_days')
        .select('id, day_number, date, city_destination')
        .eq('journey_id', journeyId)
        .order('day_number', { ascending: true });

      if (daysError) throw daysError;

      const dayMap = new Map(days?.map(d => [d.id, d]) || []);

      const { data: accomData, error: accomError } = await supabase
        .from('accommodations')
        .select('id, day_id, hotel_name, location_address, check_in_time, check_out_time, internal_booking_status, internal_booking_notes')
        .in('day_id', Array.from(dayMap.keys()));

      if (accomError) throw accomError;

      const { data: actData, error: actError } = await supabase
        .from('activities')
        .select('id, day_id, activity_name, location, activity_time, internal_booking_status, internal_booking_notes')
        .in('day_id', Array.from(dayMap.keys()));

      if (actError) throw actError;

      const { data: diningData, error: diningError } = await supabase
        .from('dining')
        .select('id, day_id, meal_type, restaurant_name, location_address, reservation_time, internal_booking_status, internal_booking_notes')
        .in('day_id', Array.from(dayMap.keys()));

      if (diningError) throw diningError;

      setAccommodations(
        (accomData || []).map(a => ({
          ...a,
          day: dayMap.get(a.day_id)!,
        }))
      );

      setActivities(
        (actData || []).map(a => ({
          ...a,
          day: dayMap.get(a.day_id)!,
        }))
      );

      setDining(
        (diningData || []).map(d => ({
          ...d,
          day: dayMap.get(d.day_id)!,
        }))
      );
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!editingItem) return;

    try {
      const table = editingItem.type === 'accommodation'
        ? 'accommodations'
        : editingItem.type === 'activity'
        ? 'activities'
        : 'dining';

      const { error } = await supabase
        .from(table)
        .update({
          internal_booking_status: editingItem.status,
          internal_booking_notes: editingItem.notes,
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      await fetchBookings();
      setEditingItem(null);
    } catch (err) {
      console.error('Error updating booking status:', err);
      alert('Failed to update booking status');
    }
  };

  const getStatusIcon = (status: BookingStatus) => {
    switch (status) {
      case 'booked':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'unbooked':
        return <Circle className="w-5 h-5 text-red-500" />;
      case 'n/a':
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: BookingStatus) => {
    switch (status) {
      case 'booked':
        return 'Book';
      case 'unbooked':
        return 'Unbook';
      case 'n/a':
        return 'N/A';
      default:
        return 'Unbook';
    }
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'booked':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'unbooked':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'n/a':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const calculateCompletion = () => {
    const total = accommodations.length + activities.length + dining.length;
    if (total === 0) return 100;

    const completed = [
      ...accommodations,
      ...activities,
      ...dining,
    ].filter(item => item.internal_booking_status === 'booked').length;

    return Math.round((completed / total) * 100);
  };

  const toggleSection = (section: 'hotels' | 'activities' | 'restaurants') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const completionPercentage = calculateCompletion();
  const isFullyCompleted = completionPercentage === 100;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-brand-gray-1">Loading bookings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-brand-gray-3 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-brand-brown mb-1">Booking Status</h2>
            <p className="text-sm text-brand-gray-1">Internal management view - track all bookings</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-brand-brown">{completionPercentage}%</div>
              <div className="text-xs text-brand-gray-1">Complete</div>
            </div>
            {isFullyCompleted && (
              <CheckCircle className="w-10 h-10 text-green-600" />
            )}
          </div>
        </div>
        <div className="mt-4 bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isFullyCompleted ? 'bg-green-600' : 'bg-blue-600'
            }`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-brand-gray-3 shadow-sm">
        <button
          onClick={() => toggleSection('hotels')}
          className="w-full flex items-center justify-between p-4 hover:bg-brand-gray-4 transition-colors border-b border-brand-gray-3"
        >
          <div className="flex items-center gap-3">
            <Hotel className="w-6 h-6 text-brand-brown" />
            <h3 className="text-lg font-semibold text-brand-brown">Hotels</h3>
            <span className="text-sm text-brand-gray-1">
              ({accommodations.filter(a => a.internal_booking_status === 'booked').length}/{accommodations.length} booked)
            </span>
          </div>
          {expandedSections.hotels ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {expandedSections.hotels && (
          <div className="p-4 space-y-3">
            {accommodations.length === 0 ? (
              <p className="text-center py-8 text-brand-gray-1 text-sm">No hotels added yet</p>
            ) : (
              accommodations.map(accom => (
                <div
                  key={accom.id}
                  className={`border rounded-lg p-4 ${
                    editingItem?.id === accom.id
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-brand-gray-3 hover:border-brand-gray-2'
                  } transition-colors`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(accom.internal_booking_status)}
                        <h4 className="font-semibold text-brand-brown">{accom.hotel_name}</h4>
                      </div>
                      <div className="space-y-1 text-sm text-brand-gray-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>Day {accom.day.day_number} - {new Date(accom.day.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{accom.location_address}</span>
                        </div>
                        {accom.check_in_time && (
                          <div className="text-xs">
                            Check-in: {accom.check_in_time} | Check-out: {accom.check_out_time}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {editingItem?.id === accom.id ? (
                        <div className="space-y-2 w-48">
                          <select
                            value={editingItem.status}
                            onChange={(e) =>
                              setEditingItem({ ...editingItem, status: e.target.value as BookingStatus })
                            }
                            className="w-full px-2 py-1 text-sm border border-brand-gray-3 rounded-md"
                          >
                            <option value="unbooked">Unbook</option>
                            <option value="booked">Book</option>
                            <option value="n/a">N/A</option>
                          </select>
                          <textarea
                            value={editingItem.notes}
                            onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                            placeholder="Internal notes..."
                            className="w-full px-2 py-1 text-sm border border-brand-gray-3 rounded-md"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleStatusUpdate}
                              className="flex-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center justify-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              Save
                            </button>
                            <button
                              onClick={() => setEditingItem(null)}
                              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            setEditingItem({
                              type: 'accommodation',
                              id: accom.id,
                              status: accom.internal_booking_status,
                              notes: accom.internal_booking_notes || '',
                            })
                          }
                          className={`px-3 py-1 rounded-md text-sm font-medium border ${getStatusColor(
                            accom.internal_booking_status
                          )}`}
                        >
                          {getStatusLabel(accom.internal_booking_status)}
                        </button>
                      )}
                    </div>
                  </div>
                  {accom.internal_booking_notes && editingItem?.id !== accom.id && (
                    <div className="mt-3 pt-3 border-t border-brand-gray-3">
                      <p className="text-xs text-brand-gray-1">
                        <strong>Notes:</strong> {accom.internal_booking_notes}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-brand-gray-3 shadow-sm">
        <button
          onClick={() => toggleSection('activities')}
          className="w-full flex items-center justify-between p-4 hover:bg-brand-gray-4 transition-colors border-b border-brand-gray-3"
        >
          <div className="flex items-center gap-3">
            <ActivityIcon className="w-6 h-6 text-brand-brown" />
            <h3 className="text-lg font-semibold text-brand-brown">Activities</h3>
            <span className="text-sm text-brand-gray-1">
              ({activities.filter(a => a.internal_booking_status === 'booked').length}/{activities.length} booked)
            </span>
          </div>
          {expandedSections.activities ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {expandedSections.activities && (
          <div className="p-4 space-y-3">
            {activities.length === 0 ? (
              <p className="text-center py-8 text-brand-gray-1 text-sm">No activities added yet</p>
            ) : (
              activities.map(activity => (
                <div
                  key={activity.id}
                  className={`border rounded-lg p-4 ${
                    editingItem?.id === activity.id
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-brand-gray-3 hover:border-brand-gray-2'
                  } transition-colors`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(activity.internal_booking_status)}
                        <h4 className="font-semibold text-brand-brown">{activity.activity_name}</h4>
                      </div>
                      <div className="space-y-1 text-sm text-brand-gray-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>Day {activity.day.day_number} - {new Date(activity.day.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{activity.location}</span>
                        </div>
                        <div className="text-xs">Time: {activity.activity_time}</div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {editingItem?.id === activity.id ? (
                        <div className="space-y-2 w-48">
                          <select
                            value={editingItem.status}
                            onChange={(e) =>
                              setEditingItem({ ...editingItem, status: e.target.value as BookingStatus })
                            }
                            className="w-full px-2 py-1 text-sm border border-brand-gray-3 rounded-md"
                          >
                            <option value="unbooked">Unbook</option>
                            <option value="booked">Book</option>
                            <option value="n/a">N/A</option>
                          </select>
                          <textarea
                            value={editingItem.notes}
                            onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                            placeholder="Internal notes..."
                            className="w-full px-2 py-1 text-sm border border-brand-gray-3 rounded-md"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleStatusUpdate}
                              className="flex-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center justify-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              Save
                            </button>
                            <button
                              onClick={() => setEditingItem(null)}
                              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            setEditingItem({
                              type: 'activity',
                              id: activity.id,
                              status: activity.internal_booking_status,
                              notes: activity.internal_booking_notes || '',
                            })
                          }
                          className={`px-3 py-1 rounded-md text-sm font-medium border ${getStatusColor(
                            activity.internal_booking_status
                          )}`}
                        >
                          {getStatusLabel(activity.internal_booking_status)}
                        </button>
                      )}
                    </div>
                  </div>
                  {activity.internal_booking_notes && editingItem?.id !== activity.id && (
                    <div className="mt-3 pt-3 border-t border-brand-gray-3">
                      <p className="text-xs text-brand-gray-1">
                        <strong>Notes:</strong> {activity.internal_booking_notes}
                      </p>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-brand-gray-3">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => toggleAttachments(activity.id)}
                        className="flex items-center gap-2 text-sm text-brand-brown hover:text-brand-brown-dark font-medium"
                      >
                        <Paperclip className="w-4 h-4" />
                        Attachments
                        {attachments.get(activity.id)?.length ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            {attachments.get(activity.id)?.length}
                          </span>
                        ) : null}
                        {showAttachments.has(activity.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      {showAttachments.has(activity.id) && (
                        <label className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md cursor-pointer text-xs font-medium transition-colors">
                          <Upload className="w-3 h-3" />
                          {uploadingFiles.has(activity.id) ? 'Uploading...' : 'Attach File'}
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileSelect(activity.id, e)}
                            disabled={uploadingFiles.has(activity.id)}
                            className="hidden"
                            ref={(el) => {
                              if (el) fileInputRefs.current.set(activity.id, el);
                            }}
                          />
                        </label>
                      )}
                    </div>

                    {showAttachments.has(activity.id) && (
                      <div className="mt-2 space-y-2">
                        {attachments.get(activity.id)?.length === 0 ? (
                          <div className="text-center py-4 bg-slate-50 rounded-md border border-dashed border-slate-300">
                            <p className="text-xs text-slate-600">No files attached</p>
                            <p className="text-xs text-slate-500 mt-1">Upload tickets, permits, or vouchers</p>
                          </div>
                        ) : (
                          attachments.get(activity.id)?.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {getFileIcon(attachment.file_name)}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-slate-900 truncate">
                                    {attachment.file_name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {attachment.file_size
                                      ? `${(attachment.file_size / 1024 / 1024).toFixed(2)} MB`
                                      : 'Size unknown'}{' '}
                                    • {new Date(attachment.uploaded_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <a
                                  href={attachment.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                  title="Download/View"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => deleteAttachment(activity.id, attachment)}
                                  className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-brand-gray-3 shadow-sm">
        <button
          onClick={() => toggleSection('restaurants')}
          className="w-full flex items-center justify-between p-4 hover:bg-brand-gray-4 transition-colors border-b border-brand-gray-3"
        >
          <div className="flex items-center gap-3">
            <Utensils className="w-6 h-6 text-brand-brown" />
            <h3 className="text-lg font-semibold text-brand-brown">Restaurants</h3>
            <span className="text-sm text-brand-gray-1">
              ({dining.filter(d => d.internal_booking_status === 'booked').length}/{dining.length} booked)
            </span>
          </div>
          {expandedSections.restaurants ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {expandedSections.restaurants && (
          <div className="p-4 space-y-3">
            {dining.length === 0 ? (
              <p className="text-center py-8 text-brand-gray-1 text-sm">No restaurant reservations added yet</p>
            ) : (
              dining.map(meal => (
                <div
                  key={meal.id}
                  className={`border rounded-lg p-4 ${
                    editingItem?.id === meal.id
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-brand-gray-3 hover:border-brand-gray-2'
                  } transition-colors`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(meal.internal_booking_status)}
                        <h4 className="font-semibold text-brand-brown">{meal.restaurant_name}</h4>
                        <span className="text-xs px-2 py-0.5 bg-brand-orange bg-opacity-20 text-brand-brown rounded-full">
                          {meal.meal_type}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-brand-gray-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>Day {meal.day.day_number} - {new Date(meal.day.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{meal.location_address}</span>
                        </div>
                        <div className="text-xs">Reservation: {meal.reservation_time}</div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {editingItem?.id === meal.id ? (
                        <div className="space-y-2 w-48">
                          <select
                            value={editingItem.status}
                            onChange={(e) =>
                              setEditingItem({ ...editingItem, status: e.target.value as BookingStatus })
                            }
                            className="w-full px-2 py-1 text-sm border border-brand-gray-3 rounded-md"
                          >
                            <option value="unbooked">Unbook</option>
                            <option value="booked">Book</option>
                            <option value="n/a">N/A</option>
                          </select>
                          <textarea
                            value={editingItem.notes}
                            onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                            placeholder="Internal notes..."
                            className="w-full px-2 py-1 text-sm border border-brand-gray-3 rounded-md"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleStatusUpdate}
                              className="flex-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center justify-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              Save
                            </button>
                            <button
                              onClick={() => setEditingItem(null)}
                              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            setEditingItem({
                              type: 'dining',
                              id: meal.id,
                              status: meal.internal_booking_status,
                              notes: meal.internal_booking_notes || '',
                            })
                          }
                          className={`px-3 py-1 rounded-md text-sm font-medium border ${getStatusColor(
                            meal.internal_booking_status
                          )}`}
                        >
                          {getStatusLabel(meal.internal_booking_status)}
                        </button>
                      )}
                    </div>
                  </div>
                  {meal.internal_booking_notes && editingItem?.id !== meal.id && (
                    <div className="mt-3 pt-3 border-t border-brand-gray-3">
                      <p className="text-xs text-brand-gray-1">
                        <strong>Notes:</strong> {meal.internal_booking_notes}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
