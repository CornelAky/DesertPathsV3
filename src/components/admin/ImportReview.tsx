import React, { useState } from 'react';
import { X, Save, AlertTriangle, Edit2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ImportedDay {
  day_number: number;
  title: string;
  description: string;
  accommodation?: {
    name: string;
    type: string;
    description?: string;
    check_in?: string;
    check_out?: string;
  };
  activities?: Array<{
    title: string;
    description: string;
    start_time?: string;
    end_time?: string;
    location?: string;
  }>;
  dining?: Array<{
    name: string;
    meal_type: string;
    cuisine_type?: string;
    description?: string;
    reservation_time?: string;
  }>;
}

interface ImportedItinerary {
  journey_name: string;
  destination: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  days: ImportedDay[];
}

interface ImportReviewProps {
  itinerary: ImportedItinerary;
  onClose: () => void;
  onSaveComplete: () => void;
}

export function ImportReview({ itinerary, onClose, onSaveComplete }: ImportReviewProps) {
  const [editedItinerary, setEditedItinerary] = useState<ImportedItinerary>(itinerary);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const updateField = (field: keyof ImportedItinerary, value: any) => {
    setEditedItinerary(prev => ({ ...prev, [field]: value }));
  };

  const updateDay = (dayIndex: number, updates: Partial<ImportedDay>) => {
    setEditedItinerary(prev => ({
      ...prev,
      days: prev.days.map((day, idx) =>
        idx === dayIndex ? { ...day, ...updates } : day
      )
    }));
  };

  const removeDay = (dayIndex: number) => {
    setEditedItinerary(prev => ({
      ...prev,
      days: prev.days.filter((_, idx) => idx !== dayIndex)
    }));
  };

  const addDay = () => {
    const newDayNumber = editedItinerary.days.length + 1;
    setEditedItinerary(prev => ({
      ...prev,
      days: [...prev.days, {
        day_number: newDayNumber,
        title: `Day ${newDayNumber}`,
        description: '',
        activities: []
      }]
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Calculate duration
      const startDate = editedItinerary.start_date
        ? new Date(editedItinerary.start_date)
        : new Date();
      const endDate = editedItinerary.end_date
        ? new Date(editedItinerary.end_date)
        : new Date(startDate.getTime() + (editedItinerary.days.length - 1) * 24 * 60 * 60 * 1000);
      const durationDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1);

      // Create the trip
      const { data: trip, error: tripError } = await supabase
        .from('journeys')
        .insert({
          journey_name: editedItinerary.journey_name,
          customer_id: null, // Will be assigned later by admin
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          duration_days: durationDays,
          description: editedItinerary.description || null,
          status: 'planning'
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Create days and their related items
      for (const day of editedItinerary.days) {
        const { data: dayData, error: dayError } = await supabase
          .from('itinerary_days')
          .insert({
            trip_id: trip.id,
            day_number: day.day_number,
            date: editedItinerary.start_date
              ? new Date(new Date(editedItinerary.start_date).getTime() + (day.day_number - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            city_destination: day.title
          })
          .select()
          .single();

        if (dayError) throw dayError;

        // Add accommodation if exists
        if (day.accommodation) {
          await supabase.from('accommodations').insert({
            day_id: dayData.id,
            hotel_name: day.accommodation.name,
            location_address: day.accommodation.description || 'To be determined',
            check_in_time: day.accommodation.check_in || null,
            check_out_time: day.accommodation.check_out || null,
            booking_status: 'pending'
          });
        }

        // Add activities
        if (day.activities && day.activities.length > 0) {
          for (let i = 0; i < day.activities.length; i++) {
            const activity = day.activities[i];
            await supabase.from('activities').insert({
              day_id: dayData.id,
              activity_name: activity.title,
              location: activity.location || 'To be determined',
              activity_time: activity.start_time || '09:00:00',
              duration_minutes: activity.start_time && activity.end_time
                ? Math.round((new Date(`1970-01-01T${activity.end_time}`).getTime() - new Date(`1970-01-01T${activity.start_time}`).getTime()) / 60000)
                : 60,
              guide_notes: activity.description || null,
              display_order: i,
              booking_status: 'pending'
            });
          }
        }

        // Add dining
        if (day.dining && day.dining.length > 0) {
          for (let i = 0; i < day.dining.length; i++) {
            const dining = day.dining[i];
            await supabase.from('dining').insert({
              day_id: dayData.id,
              restaurant_name: dining.name,
              meal_type: dining.meal_type,
              cuisine_type: dining.cuisine_type || null,
              location_address: dining.description || 'To be determined',
              reservation_time: dining.reservation_time || '12:00:00',
              guide_notes: dining.description || null,
              display_order: i,
              confirmation_status: 'not_booked'
            });
          }
        }
      }

      onSaveComplete();
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save itinerary');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-brand-brown bg-opacity-20 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Imported Itinerary</h2>
              <div className="flex items-center text-amber-600 text-sm">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Please review and edit any missing or incorrect information
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Trip Details */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-lg text-gray-900">Trip Details</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Journey Name *
              </label>
              <input
                type="text"
                value={editedItinerary.journey_name}
                onChange={(e) => updateField('journey_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destination *
              </label>
              <input
                type="text"
                value={editedItinerary.destination}
                onChange={(e) => updateField('destination', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={editedItinerary.start_date || ''}
                  onChange={(e) => updateField('start_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={editedItinerary.end_date || ''}
                  onChange={(e) => updateField('end_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={editedItinerary.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>

          {/* Days */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg text-gray-900">
                Days ({editedItinerary.days.length})
              </h3>
              <button
                onClick={addDay}
                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Day
              </button>
            </div>

            <div className="space-y-3">
              {editedItinerary.days.map((day, index) => (
                <div key={index} className="border border-gray-200 rounded-lg">
                  <div
                    className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setExpandedDay(expandedDay === index ? null : index)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          Day {day.day_number}: {day.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {day.description}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeDay(index);
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <Edit2 className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {expandedDay === index && (
                    <div className="p-4 border-t border-gray-200 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Title *
                        </label>
                        <input
                          type="text"
                          value={day.title}
                          onChange={(e) => updateDay(index, { title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={day.description}
                          onChange={(e) => updateDay(index, { description: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                      </div>

                      {day.accommodation && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-blue-900 mb-2">
                            Accommodation: {day.accommodation.name}
                          </p>
                          <p className="text-xs text-blue-700">
                            {day.accommodation.description}
                          </p>
                        </div>
                      )}

                      {day.activities && day.activities.length > 0 && (
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-green-900 mb-2">
                            Activities ({day.activities.length})
                          </p>
                          {day.activities.map((activity, actIdx) => (
                            <p key={actIdx} className="text-xs text-green-700 mb-1">
                              • {activity.title}
                            </p>
                          ))}
                        </div>
                      )}

                      {day.dining && day.dining.length > 0 && (
                        <div className="bg-amber-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-amber-900 mb-2">
                            Dining ({day.dining.length})
                          </p>
                          {day.dining.map((meal, mealIdx) => (
                            <p key={mealIdx} className="text-xs text-amber-700 mb-1">
                              • {meal.meal_type}: {meal.name}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !editedItinerary.journey_name || !editedItinerary.destination}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Itinerary
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
