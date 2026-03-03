import { useState, useEffect } from 'react';
import { X, CheckCircle2, Edit2, Trash2, Check, AlertCircle, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { safeParseInt } from '../../lib/numberValidation';

interface ExtractedDataReviewProps {
  journeyId: string;
  onClose: () => void;
  onComplete: () => void;
}

interface ExtractedEntry {
  id: string;
  uploaded_file_id: string;
  trip_id: string;
  day_number: number | null;
  date: string | null;
  time: string | null;
  activity: string | null;
  location: string | null;
  hotel: string | null;
  restaurant: string | null;
  access_method: string | null;
  transportation: string | null;
  comments: string | null;
  confidence_score: number | null;
  is_reviewed: boolean;
  is_approved: boolean;
  row_order: number;
}

export function ExtractedDataReview({ journeyId, onClose, onComplete }: ExtractedDataReviewProps) {
  const [entries, setEntries] = useState<ExtractedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ExtractedEntry>>({});
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchExtractedData();
  }, [journeyId]);

  const fetchExtractedData = async () => {
    try {
      const { data, error } = await supabase
        .from('extracted_itinerary_data')
        .select('*')
        .eq('journey_id', journeyId)
        .order('row_order', { ascending: true });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching extracted data:', error);
      alert('Failed to load extracted data');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (entry: ExtractedEntry) => {
    setEditingId(entry.id);
    setEditForm(entry);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from('extracted_itinerary_data')
        .update({
          ...editForm,
          is_reviewed: true,
        })
        .eq('id', editingId);

      if (error) throw error;

      setEntries((prev) =>
        prev.map((e) =>
          e.id === editingId ? { ...e, ...editForm, is_reviewed: true } : e
        )
      );
      setEditingId(null);
      setEditForm({});
    } catch (error) {
      console.error('Error updating entry:', error);
      alert('Failed to update entry');
    }
  };

  const toggleApproval = async (entryId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('extracted_itinerary_data')
        .update({
          is_approved: !currentStatus,
          is_reviewed: true,
        })
        .eq('id', entryId);

      if (error) throw error;

      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? { ...e, is_approved: !currentStatus, is_reviewed: true }
            : e
        )
      );
    } catch (error) {
      console.error('Error toggling approval:', error);
      alert('Failed to update approval status');
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const { error } = await supabase
        .from('extracted_itinerary_data')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry');
    }
  };

  const approveAll = async () => {
    try {
      const { error } = await supabase
        .from('extracted_itinerary_data')
        .update({ is_approved: true, is_reviewed: true })
        .eq('journey_id', journeyId);

      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) => ({ ...e, is_approved: true, is_reviewed: true }))
      );
    } catch (error) {
      console.error('Error approving all:', error);
      alert('Failed to approve all entries');
    }
  };

  const insertApprovedEntries = async () => {
    const approvedEntries = entries.filter((e) => e.is_approved);

    if (approvedEntries.length === 0) {
      alert('No approved entries to insert');
      return;
    }

    if (!confirm(`Insert ${approvedEntries.length} approved entries into the itinerary?`)) {
      return;
    }

    setProcessing(true);

    try {
      const { data: tripData } = await supabase
        .from('journeys')
        .select('start_date')
        .eq('id', journeyId)
        .single();

      if (!tripData) throw new Error('Trip not found');

      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('Not authenticated');

      const dayGroups = new Map<number, ExtractedEntry[]>();
      approvedEntries.forEach((entry) => {
        const day = entry.day_number || 1;
        if (!dayGroups.has(day)) dayGroups.set(day, []);
        dayGroups.get(day)!.push(entry);
      });

      const sortedDays = Array.from(dayGroups.keys()).sort((a, b) => a - b);
      let totalInserted = 0;
      let totalErrors = 0;

      for (const dayNum of sortedDays) {
        const dayEntries = dayGroups.get(dayNum)!;
        const dayDate = new Date(tripData.start_date);
        dayDate.setDate(dayDate.getDate() + dayNum - 1);
        const formattedDate = dayDate.toISOString().split('T')[0];

        for (let i = 0; i < dayEntries.length; i++) {
          const entry = dayEntries[i];

          try {
            let accommodationId: string | null = null;
            let diningId: string | null = null;
            let activityId: string | null = null;

            if (entry.hotel) {
              const { data: existingAccommodation } = await supabase
                .from('accommodations')
                .select('id')
                .eq('hotel_name', entry.hotel)
                .maybeSingle();

              if (existingAccommodation) {
                accommodationId = existingAccommodation.id;
              }
            }

            if (entry.restaurant) {
              const { data: existingDining } = await supabase
                .from('dining')
                .select('id')
                .eq('restaurant_name', entry.restaurant)
                .maybeSingle();

              if (existingDining) {
                diningId = existingDining.id;
              }
            }

            if (entry.activity) {
              const { data: existingActivity } = await supabase
                .from('activities')
                .select('id')
                .eq('activity_name', entry.activity)
                .maybeSingle();

              if (existingActivity) {
                activityId = existingActivity.id;
              }
            }

            const isIncomplete = !entry.activity || (entry.confidence_score !== null && entry.confidence_score < 0.5);
            const incompleteReason = !entry.activity
              ? 'Missing activity description'
              : entry.confidence_score !== null && entry.confidence_score < 0.5
                ? 'Low confidence extraction'
                : '';

            const { error: insertError } = await supabase
              .from('itinerary_entries')
              .insert({
                journey_id: journeyId,
                day_number: dayNum,
                date: formattedDate,
                time: entry.time || null,
                activity: entry.activity || entry.hotel || entry.restaurant || entry.transportation || '',
                location: entry.location || '',
                accommodation_id: accommodationId,
                dining_id: diningId,
                activity_id: activityId,
                access_method: entry.access_method || '',
                transportation: entry.transportation || '',
                notes: entry.comments || '',
                sort_order: i,
                is_incomplete: isIncomplete,
                incomplete_reason: incompleteReason,
              });

            if (insertError) {
              console.error('Error inserting entry:', insertError);
              totalErrors++;
            } else {
              totalInserted++;
            }
          } catch (entryError) {
            console.error('Error processing entry:', entryError);
            totalErrors++;
          }
        }
      }

      await supabase
        .from('extracted_itinerary_data')
        .delete()
        .eq('journey_id', journeyId)
        .eq('is_approved', true);

      if (totalErrors > 0) {
        alert(`Inserted ${totalInserted} entries successfully. ${totalErrors} entries had errors and were skipped.`);
      } else {
        alert(`Successfully inserted ${totalInserted} entries into the itinerary!`);
      }

      onComplete();
      onClose();
    } catch (error) {
      console.error('Error inserting entries:', error);
      alert('Failed to insert entries. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getConfidenceColor = (score: number | null) => {
    if (!score) return 'bg-slate-100 text-slate-600';
    if (score >= 0.8) return 'bg-green-100 text-green-700';
    if (score >= 0.5) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-brand-brown bg-opacity-20 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="text-slate-700">Loading extracted data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-brand-brown bg-opacity-20 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Review Extracted Data</h2>
            <p className="text-sm text-slate-600 mt-1">
              Review, edit, and approve entries before inserting into the itinerary
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No extracted data found</p>
              <p className="text-sm text-slate-500 mt-2">
                Upload files to extract itinerary data
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className={`border rounded-lg p-4 ${
                    entry.is_approved
                      ? 'border-green-300 bg-green-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {editingId === entry.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          placeholder="Day Number"
                          value={editForm.day_number || ''}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              day_number: safeParseInt(e.target.value, null),
                            })
                          }
                          className="px-3 py-2 border border-slate-300 rounded-lg"
                        />
                        <input
                          type="date"
                          value={editForm.date || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, date: e.target.value })
                          }
                          className="px-3 py-2 border border-slate-300 rounded-lg"
                        />
                        <input
                          type="time"
                          placeholder="Time"
                          value={editForm.time || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, time: e.target.value })
                          }
                          className="px-3 py-2 border border-slate-300 rounded-lg"
                        />
                        <input
                          type="text"
                          placeholder="Location"
                          value={editForm.location || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, location: e.target.value })
                          }
                          className="px-3 py-2 border border-slate-300 rounded-lg"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Activity"
                        value={editForm.activity || ''}
                        onChange={(e) =>
                          setEditForm({ ...editForm, activity: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Hotel"
                          value={editForm.hotel || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, hotel: e.target.value })
                          }
                          className="px-3 py-2 border border-slate-300 rounded-lg"
                        />
                        <input
                          type="text"
                          placeholder="Restaurant"
                          value={editForm.restaurant || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, restaurant: e.target.value })
                          }
                          className="px-3 py-2 border border-slate-300 rounded-lg"
                        />
                        <input
                          type="text"
                          placeholder="Transportation"
                          value={editForm.transportation || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, transportation: e.target.value })
                          }
                          className="px-3 py-2 border border-slate-300 rounded-lg"
                        />
                        <input
                          type="text"
                          placeholder="Access Method"
                          value={editForm.access_method || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, access_method: e.target.value })
                          }
                          className="px-3 py-2 border border-slate-300 rounded-lg"
                        />
                      </div>
                      <textarea
                        placeholder="Comments"
                        value={editForm.comments || ''}
                        onChange={(e) =>
                          setEditForm({ ...editForm, comments: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        rows={2}
                      />
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={saveEdit}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                            Day {entry.day_number || '?'}
                          </span>
                          {entry.confidence_score !== null && (
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${getConfidenceColor(
                                entry.confidence_score
                              )}`}
                            >
                              {Math.round(entry.confidence_score * 100)}% confidence
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() =>
                              toggleApproval(entry.id, entry.is_approved)
                            }
                            className={`p-2 rounded-lg transition-colors ${
                              entry.is_approved
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title={entry.is_approved ? 'Approved' : 'Click to approve'}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => startEdit(entry)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-slate-600" />
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {entry.date && (
                          <div>
                            <span className="text-slate-500">Date:</span>
                            <span className="ml-2 text-slate-900">{entry.date}</span>
                          </div>
                        )}
                        {entry.time && (
                          <div>
                            <span className="text-slate-500">Time:</span>
                            <span className="ml-2 text-slate-900">{entry.time}</span>
                          </div>
                        )}
                        {entry.activity && (
                          <div className="col-span-2">
                            <span className="text-slate-500">Activity:</span>
                            <span className="ml-2 text-slate-900">{entry.activity}</span>
                          </div>
                        )}
                        {entry.location && (
                          <div>
                            <span className="text-slate-500">Location:</span>
                            <span className="ml-2 text-slate-900">{entry.location}</span>
                          </div>
                        )}
                        {entry.hotel && (
                          <div>
                            <span className="text-slate-500">Hotel:</span>
                            <span className="ml-2 text-slate-900">{entry.hotel}</span>
                          </div>
                        )}
                        {entry.restaurant && (
                          <div>
                            <span className="text-slate-500">Restaurant:</span>
                            <span className="ml-2 text-slate-900">
                              {entry.restaurant}
                            </span>
                          </div>
                        )}
                        {entry.transportation && (
                          <div>
                            <span className="text-slate-500">Transportation:</span>
                            <span className="ml-2 text-slate-900">
                              {entry.transportation}
                            </span>
                          </div>
                        )}
                        {entry.access_method && (
                          <div>
                            <span className="text-slate-500">Access:</span>
                            <span className="ml-2 text-slate-900">
                              {entry.access_method}
                            </span>
                          </div>
                        )}
                        {entry.comments && (
                          <div className="col-span-2">
                            <span className="text-slate-500">Comments:</span>
                            <span className="ml-2 text-slate-900">
                              {entry.comments}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 p-6 flex items-center justify-between bg-slate-50">
          <div className="text-sm text-slate-600">
            {entries.filter((e) => e.is_approved).length} of {entries.length} entries
            approved
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={approveAll}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Approve All
            </button>
            <button
              onClick={insertApprovedEntries}
              disabled={
                processing ||
                entries.filter((e) => e.is_approved).length === 0
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Inserting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Insert into Itinerary</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
