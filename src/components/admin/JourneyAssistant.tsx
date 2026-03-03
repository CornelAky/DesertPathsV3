import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Sparkles,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Lightbulb,
  Calendar,
  Loader,
} from 'lucide-react';
import type { Trip } from '../../lib/database.types';

interface JourneyAssistantProps {
  trip: Trip;
  onClose: () => void;
}

interface Suggestion {
  type: 'warning' | 'optimization' | 'tip';
  category: string;
  message: string;
  details?: string;
  dayNumber?: number;
}

export function JourneyAssistant({ trip, onClose }: JourneyAssistantProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    analyzeTripData();
  }, [trip.id]);

  const analyzeTripData = async () => {
    setLoading(true);
    setAnalyzing(true);
    const newSuggestions: Suggestion[] = [];

    try {
      const { data: days, error: daysError } = await supabase
        .from('itinerary_days')
        .select('*')
        .eq('journey_id', trip.id)
        .order('day_number', { ascending: true });

      if (daysError) throw daysError;

      if (!days || days.length === 0) {
        newSuggestions.push({
          type: 'warning',
          category: 'Setup',
          message: 'No days created yet',
          details: 'Start by generating days for this journey to begin planning.',
        });
        setSuggestions(newSuggestions);
        setLoading(false);
        setAnalyzing(false);
        return;
      }

      for (const day of days) {
        const [activitiesRes, diningRes, accommodationsRes] = await Promise.all([
          supabase.from('activities').select('*').eq('day_id', day.id).order('activity_time', { ascending: true }),
          supabase.from('dining').select('*').eq('day_id', day.id).order('reservation_time', { ascending: true }),
          supabase.from('accommodations').select('*').eq('day_id', day.id),
        ]);

        const activities = activitiesRes.data || [];
        const dining = diningRes.data || [];
        const accommodations = accommodationsRes.data || [];

        if (activities.length === 0 && dining.length === 0 && accommodations.length === 0) {
          newSuggestions.push({
            type: 'tip',
            category: 'Content',
            message: `Day ${day.day_number} is empty`,
            details: 'Consider adding activities, dining, or accommodations to this day.',
            dayNumber: day.day_number,
          });
        }

        const allEvents = [
          ...activities.map(a => ({
            time: a.activity_time,
            duration: a.duration_minutes || 60,
            type: 'activity',
            name: a.activity_name,
          })),
          ...dining.map(d => ({
            time: d.reservation_time,
            duration: 90,
            type: 'dining',
            name: d.restaurant_name,
          })),
        ].sort((a, b) => {
          const timeA = a.time.split(':').map(Number);
          const timeB = b.time.split(':').map(Number);
          return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
        });

        for (let i = 0; i < allEvents.length - 1; i++) {
          const current = allEvents[i];
          const next = allEvents[i + 1];

          const currentTime = current.time.split(':').map(Number);
          const currentEnd = currentTime[0] * 60 + currentTime[1] + current.duration;

          const nextTime = next.time.split(':').map(Number);
          const nextStart = nextTime[0] * 60 + nextTime[1];

          const gap = nextStart - currentEnd;

          if (gap < 0) {
            newSuggestions.push({
              type: 'warning',
              category: 'Timing Conflict',
              message: `Day ${day.day_number}: Overlapping events`,
              details: `"${current.name}" overlaps with "${next.name}". Consider adjusting times.`,
              dayNumber: day.day_number,
            });
          } else if (gap < 15) {
            newSuggestions.push({
              type: 'warning',
              category: 'Tight Schedule',
              message: `Day ${day.day_number}: Very tight timing`,
              details: `Only ${gap} minutes between "${current.name}" and "${next.name}". Consider adding buffer time.`,
              dayNumber: day.day_number,
            });
          } else if (gap > 180) {
            newSuggestions.push({
              type: 'tip',
              category: 'Large Gap',
              message: `Day ${day.day_number}: ${Math.floor(gap / 60)}hr+ gap`,
              details: `Large gap between "${current.name}" and "${next.name}". Consider adding an activity.`,
              dayNumber: day.day_number,
            });
          }
        }

        const activityCount = activities.length;
        if (activityCount > 5) {
          newSuggestions.push({
            type: 'warning',
            category: 'Overload',
            message: `Day ${day.day_number}: Very busy day`,
            details: `${activityCount} activities scheduled. Consider spreading some to other days.`,
            dayNumber: day.day_number,
          });
        }

        if (allEvents.length > 0) {
          const firstEvent = allEvents[0];
          const lastEvent = allEvents[allEvents.length - 1];

          const firstTime = firstEvent.time.split(':').map(Number);
          const firstMinutes = firstTime[0] * 60 + firstTime[1];

          const lastTime = lastEvent.time.split(':').map(Number);
          const lastEndMinutes = lastTime[0] * 60 + lastTime[1] + lastEvent.duration;

          const dayLength = (lastEndMinutes - firstMinutes) / 60;

          if (dayLength > 12) {
            newSuggestions.push({
              type: 'warning',
              category: 'Long Day',
              message: `Day ${day.day_number}: Very long day`,
              details: `Day runs for ${dayLength.toFixed(1)} hours. Guests may be tired. Consider reducing activities.`,
              dayNumber: day.day_number,
            });
          }

          if (firstMinutes < 7 * 60) {
            newSuggestions.push({
              type: 'tip',
              category: 'Early Start',
              message: `Day ${day.day_number}: Early morning start`,
              details: `First activity at ${firstEvent.time}. Ensure guests are informed.`,
              dayNumber: day.day_number,
            });
          }

          if (lastEndMinutes > 22 * 60) {
            newSuggestions.push({
              type: 'tip',
              category: 'Late End',
              message: `Day ${day.day_number}: Late evening activity`,
              details: `Last activity ends after 10 PM. Consider guest comfort.`,
              dayNumber: day.day_number,
            });
          }
        }

        const hasBreakfast = dining.some(d => d.meal_type === 'breakfast');
        const hasLunch = dining.some(d => d.meal_type === 'lunch');
        const hasDinner = dining.some(d => d.meal_type === 'dinner');

        if (activities.length > 0) {
          if (!hasBreakfast && !hasLunch && !hasDinner) {
            newSuggestions.push({
              type: 'tip',
              category: 'Dining',
              message: `Day ${day.day_number}: No meals scheduled`,
              details: 'Consider adding dining reservations or noting meal arrangements.',
              dayNumber: day.day_number,
            });
          }
        }

        if (accommodations.length === 0 && day.day_number !== days.length) {
          newSuggestions.push({
            type: 'tip',
            category: 'Accommodation',
            message: `Day ${day.day_number}: No accommodation`,
            details: 'Consider adding accommodation details for this day.',
            dayNumber: day.day_number,
          });
        }
      }

      if (newSuggestions.length === 0) {
        newSuggestions.push({
          type: 'optimization',
          category: 'All Good',
          message: 'Journey looks well organized',
          details: 'No major issues detected. Your itinerary appears balanced and well-timed.',
        });
      }

      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Error analyzing journey:', error);
      newSuggestions.push({
        type: 'warning',
        category: 'Error',
        message: 'Unable to analyze journey',
        details: 'An error occurred while analyzing your journey data.',
      });
      setSuggestions(newSuggestions);
    } finally {
      setLoading(false);
      setTimeout(() => setAnalyzing(false), 500);
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'optimization':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'tip':
        return <Lightbulb className="w-5 h-5 text-blue-600" />;
      default:
        return <Sparkles className="w-5 h-5 text-purple-600" />;
    }
  };

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'optimization':
        return 'bg-green-50 border-green-200';
      case 'tip':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-purple-50 border-purple-200';
    }
  };

  const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.category]) {
      acc[suggestion.category] = [];
    }
    acc[suggestion.category].push(suggestion);
    return acc;
  }, {} as { [key: string]: Suggestion[] });

  return (
    <div className="fixed inset-0 bg-brand-brown bg-opacity-20 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Journey Assistant</h2>
                <p className="text-white text-opacity-90 mt-1">
                  Smart suggestions for {trip.journey_name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading || analyzing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader className="w-12 h-12 text-purple-600 animate-spin mb-4" />
              <p className="text-slate-600 font-medium">Analyzing your journey...</p>
              <p className="text-sm text-slate-500 mt-2">
                Checking timing, conflicts, and optimization opportunities
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span className="font-semibold text-amber-900">Warnings</span>
                  </div>
                  <p className="text-3xl font-bold text-amber-600">
                    {suggestions.filter(s => s.type === 'warning').length}
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Lightbulb className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">Tips</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">
                    {suggestions.filter(s => s.type === 'tip').length}
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">Optimizations</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600">
                    {suggestions.filter(s => s.type === 'optimization').length}
                  </p>
                </div>
              </div>

              {Object.entries(groupedSuggestions).map(([category, categorySuggestions]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <span>{category}</span>
                    <span className="text-sm font-normal text-slate-500">
                      ({categorySuggestions.length})
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {categorySuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className={`rounded-lg border p-4 ${getSuggestionColor(suggestion.type)}`}
                      >
                        <div className="flex items-start space-x-3">
                          {getSuggestionIcon(suggestion.type)}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-1">
                              <p className="font-medium text-slate-900">{suggestion.message}</p>
                              {suggestion.dayNumber && (
                                <span className="flex items-center space-x-1 text-xs font-medium text-slate-600 bg-white px-2 py-1 rounded-full ml-2">
                                  <Calendar className="w-3 h-3" />
                                  <span>Day {suggestion.dayNumber}</span>
                                </span>
                              )}
                            </div>
                            {suggestion.details && (
                              <p className="text-sm text-slate-700 mt-1">{suggestion.details}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 p-6 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-900 mb-1">Suggestions are updated in real-time</p>
              <p>Automatically analyzes timing, conflicts, and optimization opportunities</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={analyzeTripData}
                disabled={analyzing}
                className="px-6 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{analyzing ? 'Analyzing...' : 'Re-analyze'}</span>
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
