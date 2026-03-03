import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Clock,
  MapPin,
  Hotel,
  Utensils,
  Activity as ActivityIcon,
  GripVertical,
  Calendar,
  AlertCircle,
  Download,
  FileDown,
  Users,
} from 'lucide-react';
import type { Trip, ItineraryDay, Accommodation, Activity, Dining } from '../../lib/database.types';
import { exportTimelineToPDF, exportTimelineToExcel } from '../../lib/exportUtils';

interface TimelineViewProps {
  trip: Trip;
}

interface TimelineItem {
  id: string;
  type: 'accommodation' | 'activity' | 'dining';
  dayNumber: number;
  date: string;
  time: string;
  title: string;
  location: string;
  description?: string;
  status?: string;
  originalOrder: number;
  timelineOrder: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

interface DayGroup {
  dayNumber: number;
  date: string;
  cityDestination: string;
  dayId: string;
  items: TimelineItem[];
  guides: Array<{ id: string; name: string; email: string }>;
}

export function TimelineView({ trip }: TimelineViewProps) {
  const [dayGroups, setDayGroups] = useState<DayGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  useEffect(() => {
    fetchTimelineData();
  }, [trip.id]);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);

      // Fetch all days for this trip
      const { data: days, error: daysError } = await supabase
        .from('itinerary_days')
        .select('*')
        .eq('journey_id', trip.id)
        .order('day_number', { ascending: true });

      if (daysError) throw daysError;

      const groups: DayGroup[] = [];

      // Process each day - ensure every day appears in the timeline
      for (const day of days || []) {
        const dayItems: TimelineItem[] = [];

        // Fetch accommodations
        const { data: accommodations, error: accomError } = await supabase
          .from('accommodations')
          .select('*')
          .eq('day_id', day.id);

        if (accomError) throw accomError;

        // Fetch activities
        const { data: activities, error: actError } = await supabase
          .from('activities')
          .select('*')
          .eq('day_id', day.id)
          .order('activity_time', { ascending: true });

        if (actError) throw actError;

        // Fetch dining
        const { data: dining, error: diningError } = await supabase
          .from('dining')
          .select('*')
          .eq('day_id', day.id)
          .order('reservation_time', { ascending: true });

        if (diningError) throw diningError;

        // Process accommodations - show ALL accommodations
        accommodations?.forEach((accom, index) => {
          dayItems.push({
            id: `accom-${accom.id}`,
            type: 'accommodation',
            dayNumber: day.day_number,
            date: day.date,
            time: accom.check_in_time || 'TBD',
            title: accom.hotel_name || 'Unnamed Accommodation',
            location: accom.location_address || 'Location not specified',
            description: accom.guide_notes || '',
            status: accom.booking_status,
            originalOrder: index,
            timelineOrder: accom.timeline_order || index,
          });
        });

        // Process activities - show ALL activities
        activities?.forEach((activity, index) => {
          dayItems.push({
            id: `activity-${activity.id}`,
            type: 'activity',
            dayNumber: day.day_number,
            date: day.date,
            time: activity.activity_time || 'TBD',
            title: activity.activity_name || 'Unnamed Activity',
            location: activity.location || 'Location not specified',
            description: activity.guide_notes || '',
            status: activity.booking_status,
            originalOrder: activity.display_order || index,
            timelineOrder: activity.timeline_order || (accommodations?.length || 0) + index,
          });
        });

        // Process dining - show ALL dining entries
        dining?.forEach((meal, index) => {
          dayItems.push({
            id: `dining-${meal.id}`,
            type: 'dining',
            dayNumber: day.day_number,
            date: day.date,
            time: meal.reservation_time || 'TBD',
            title: meal.restaurant_name || 'Unnamed Restaurant',
            location: meal.location_address || 'Location not specified',
            description: meal.guide_notes || '',
            status: meal.confirmation_status,
            originalOrder: meal.display_order || index,
            timelineOrder: meal.timeline_order || (accommodations?.length || 0) + (activities?.length || 0) + index,
            mealType: meal.meal_type as 'breakfast' | 'lunch' | 'dinner' | 'snack' | undefined,
          });
        });

        // Smart sorting: Transportation -> Breakfast -> Morning Activities -> Lunch -> Afternoon Activities -> Dinner -> Accommodation
        dayItems.sort((a, b) => {
          // Handle TBD times - put them at the end
          if (a.time === 'TBD' && b.time !== 'TBD') return 1;
          if (a.time !== 'TBD' && b.time === 'TBD') return -1;
          if (a.time === 'TBD' && b.time === 'TBD') {
            return a.timelineOrder - b.timelineOrder;
          }

          // Parse times
          const timeA = a.time.split(':').map(Number);
          const timeB = b.time.split(':').map(Number);
          const timeAMinutes = timeA[0] * 60 + (timeA[1] || 0);
          const timeBMinutes = timeB[0] * 60 + (timeB[1] || 0);

          // Helper function to get meal priority
          const getMealPriority = (item: TimelineItem): number => {
            if (item.type !== 'dining' || !item.mealType) return 1;
            if (item.mealType === 'breakfast') return 0;
            if (item.mealType === 'lunch') return 2;
            if (item.mealType === 'dinner') return 4;
            return 1;
          };

          // Helper function to get type priority:
          // transportation=-1, breakfast=0, morning activities=1, lunch=2, afternoon activities=3, dinner=4, accommodation=5
          const getTypePriority = (item: TimelineItem): number => {
            if (item.type === 'dining') {
              if (item.mealType === 'breakfast') return 0;
              if (item.mealType === 'lunch') return 2;
              if (item.mealType === 'dinner') return 4;
              return 1;
            }
            if (item.type === 'activity') {
              if (!item.time || item.time === 'TBD' || !item.time.includes(':')) return 3;
              const minutes = item.time.split(':').map(Number);
              const timeInMinutes = minutes[0] * 60 + (minutes[1] || 0);
              if (timeInMinutes < 13 * 60) return 1;
              return 3;
            }
            if (item.type === 'accommodation') return 5;
            return 6;
          };

          const priorityA = getTypePriority(a);
          const priorityB = getTypePriority(b);

          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }

          // Within same priority, sort by time
          if (timeAMinutes !== timeBMinutes) {
            return timeAMinutes - timeBMinutes;
          }

          // If same time and priority, use timeline_order
          if (a.timelineOrder !== b.timelineOrder) {
            return a.timelineOrder - b.timelineOrder;
          }

          return a.originalOrder - b.originalOrder;
        });

        // Fetch guides for this day
        const { data: dayShares, error: guidesError } = await supabase
          .from('journey_share_days')
          .select(`
            journey_share_id,
            journey_shares!inner (
              id,
              shared_with,
              is_active,
              users!journey_shares_shared_with_fkey (
                id,
                email,
                name,
                role
              )
            )
          `)
          .eq('day_id', day.id);

        if (guidesError) {
          console.error('Error fetching guides for day:', guidesError);
        }

        const dayGuides = (dayShares || [])
          .filter((ds: any) =>
            ds.journey_shares?.is_active &&
            ds.journey_shares.users?.role === 'guide'
          )
          .map((ds: any) => ({
            id: ds.journey_shares.users.id,
            name: ds.journey_shares.users.name || 'Unknown Guide',
            email: ds.journey_shares.users.email,
          }));

        const uniqueGuides = Array.from(
          new Map(dayGuides.map((g: any) => [g.id, g])).values()
        );

        // Add this day group to the timeline (even if it has no items)
        groups.push({
          dayNumber: day.day_number,
          date: day.date,
          cityDestination: day.city_destination || 'No destination set',
          dayId: day.id,
          items: dayItems,
          guides: uniqueGuides,
        });
      }

      setDayGroups(groups);
    } catch (error) {
      console.error('Error fetching timeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportTimeline = (format: 'pdf' | 'excel') => {
    // Flatten day groups into a single array for export
    const allItems = dayGroups.flatMap(group => group.items);

    if (format === 'pdf') {
      exportTimelineToPDF(trip.journey_name, allItems);
    } else {
      exportTimelineToExcel(trip.journey_name, allItems);
    }
  };

  const handleMealTypeChange = async (itemId: string, newMealType: string) => {
    const [type, id] = itemId.split('-');

    if (type !== 'dining') return;

    try {
      await supabase
        .from('dining')
        .update({ meal_type: newMealType })
        .eq('id', id);

      setDayGroups(groups =>
        groups.map(group => ({
          ...group,
          items: group.items.map(item =>
            item.id === itemId
              ? { ...item, mealType: newMealType as 'breakfast' | 'lunch' | 'dinner' | 'snack' }
              : item
          ),
        }))
      );
    } catch (error) {
      console.error('Error updating meal type:', error);
    }
  };

  const handleDragStart = (itemId: string) => {
    setDraggedItemId(itemId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetItemId: string, targetDayNumber: number) => {
    if (!draggedItemId || draggedItemId === targetItemId) {
      setDraggedItemId(null);
      return;
    }

    // Find the dragged item and its day
    let draggedItem: TimelineItem | null = null;
    let draggedDayIndex = -1;
    let draggedItemIndex = -1;

    for (let i = 0; i < dayGroups.length; i++) {
      const idx = dayGroups[i].items.findIndex(item => item.id === draggedItemId);
      if (idx !== -1) {
        draggedItem = dayGroups[i].items[idx];
        draggedDayIndex = i;
        draggedItemIndex = idx;
        break;
      }
    }

    if (!draggedItem || draggedDayIndex === -1) {
      setDraggedItemId(null);
      return;
    }

    // Only allow reordering within the same day
    if (draggedItem.dayNumber !== targetDayNumber) {
      setDraggedItemId(null);
      alert('Items can only be reordered within the same day');
      return;
    }

    const targetDayIndex = dayGroups.findIndex(g => g.dayNumber === targetDayNumber);
    const targetItemIndex = dayGroups[targetDayIndex].items.findIndex(item => item.id === targetItemId);

    if (targetDayIndex === -1 || targetItemIndex === -1) {
      setDraggedItemId(null);
      return;
    }

    // Reorder items within the day
    const newGroups = [...dayGroups];
    const dayItems = [...newGroups[targetDayIndex].items];
    const [removed] = dayItems.splice(draggedItemIndex, 1);
    dayItems.splice(targetItemIndex, 0, removed);
    newGroups[targetDayIndex].items = dayItems;

    // Update timeline_order for all items in this day
    try {
      for (let i = 0; i < dayItems.length; i++) {
        const item = dayItems[i];
        const [type, id] = item.id.split('-');

        let tableName = '';
        if (type === 'accom') tableName = 'accommodations';
        else if (type === 'activity') tableName = 'activities';
        else if (type === 'dining') tableName = 'dining';

        if (tableName) {
          await supabase
            .from(tableName)
            .update({ timeline_order: i })
            .eq('id', id);
        }
      }

      setDayGroups(newGroups);
    } catch (error) {
      console.error('Error reordering timeline:', error);
    }

    setDraggedItemId(null);
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'accommodation':
        return <Hotel className="w-5 h-5 text-blue-600" />;
      case 'activity':
        return <ActivityIcon className="w-5 h-5 text-green-600" />;
      case 'dining':
        return <Utensils className="w-5 h-5 text-orange-600" />;
      default:
        return null;
    }
  };

  const getItemColor = (type: string) => {
    switch (type) {
      case 'accommodation':
        return 'border-l-blue-500 bg-blue-50';
      case 'activity':
        return 'border-l-green-500 bg-green-50';
      case 'dining':
        return 'border-l-orange-500 bg-orange-50';
      default:
        return 'border-l-slate-500 bg-slate-50';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading timeline...</div>
      </div>
    );
  }

  if (dayGroups.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Days Found</h3>
        <p className="text-slate-600">
          Create itinerary days in the Day by Day view to generate the timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={() => handleExportTimeline('pdf')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          title="Export to PDF"
        >
          <FileDown className="w-5 h-5" />
          <span>Export PDF</span>
        </button>
        <button
          onClick={() => handleExportTimeline('excel')}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          title="Export to Excel"
        >
          <Download className="w-5 h-5" />
          <span>Export Excel</span>
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-blue-900 mb-1">Complete Timeline View</h4>
            <p className="text-sm text-blue-800">
              This timeline shows every day of your trip with all activities, accommodations, and dining.
              You can reorder items within each day by dragging them. All changes sync across views.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {dayGroups.map((dayGroup, dayIndex) => (
          <div key={`day-${dayGroup.dayNumber}`} className="relative">
            <div className="flex items-center space-x-3 mb-4 sticky top-0 bg-white z-10 py-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white font-bold rounded-full">
                {dayGroup.dayNumber}
              </div>
              <div className="flex-1">
                <div className="flex items-center flex-wrap gap-2 mb-1">
                  <h3 className="text-xl font-bold text-slate-900">
                    Day {dayGroup.dayNumber} - {formatDate(dayGroup.date)}
                  </h3>
                  {dayGroup.guides.length > 0 && (
                    <div className="flex items-center gap-2">
                      {dayGroup.guides.map((guide) => (
                        <span
                          key={guide.id}
                          className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex items-center gap-1"
                          title={guide.email}
                        >
                          <Users className="w-3 h-3" />
                          {guide.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center text-sm text-slate-600">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>{dayGroup.cityDestination}</span>
                </div>
              </div>
              <div className="flex-1 border-t border-slate-300"></div>
            </div>

            {dayGroup.items.length === 0 ? (
              <div className="ml-14 bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
                <p className="text-slate-500 text-sm">
                  No activities scheduled for this day yet.
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  Add items in the Day by Day view to populate this day.
                </p>
              </div>
            ) : (
              <div className="ml-14 space-y-3">
                {dayGroup.items.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(item.id)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(item.id, dayGroup.dayNumber)}
                    className={`relative pl-4 border-l-4 ${getItemColor(item.type)} rounded-lg transition-all cursor-move ${
                      draggedItemId === item.id ? 'opacity-50 scale-95' : 'hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start space-x-3 p-4">
                      <div className="cursor-grab active:cursor-grabbing mt-1">
                        <GripVertical className="w-5 h-5 text-slate-400" />
                      </div>

                      <div className="flex-shrink-0 mt-1">
                        {getItemIcon(item.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-slate-500" />
                            <span className={`text-sm font-bold ${item.time === 'TBD' ? 'text-amber-600' : 'text-slate-900'}`}>
                              {item.time}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-full capitalize">
                            {item.type}
                          </span>
                          {item.type === 'dining' && (
                            <select
                              value={item.mealType || ''}
                              onChange={(e) => handleMealTypeChange(item.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="px-2 py-0.5 text-xs font-medium rounded-full border border-orange-200 bg-orange-50 text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 capitalize cursor-pointer"
                            >
                              <option value="">Meal Type</option>
                              <option value="breakfast">Breakfast</option>
                              <option value="lunch">Lunch</option>
                              <option value="dinner">Dinner</option>
                              <option value="snack">Snack</option>
                            </select>
                          )}
                          {item.status && (
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                item.status === 'confirmed'
                                  ? 'bg-green-100 text-green-700'
                                  : item.status === 'pending'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {item.status}
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-semibold text-slate-900 mb-1">
                          {item.title}
                        </h4>

                        <div className="flex items-center text-sm text-slate-600 mb-2">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span>{item.location}</span>
                        </div>

                        {item.description && (
                          <p className="text-sm text-slate-700 bg-white rounded px-3 py-2 border border-slate-200">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {dayIndex < dayGroups.length - 1 && (
              <div className="ml-5 mt-6 mb-2">
                <div className="w-px h-8 bg-gradient-to-b from-slate-300 to-transparent"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
