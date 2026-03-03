import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useJourneySync } from '../../hooks/useJourneySync';
import {
  ArrowLeft,
  Plus,
  Hotel,
  Activity as ActivityIcon,
  Utensils,
  Calendar,
  MapPin,
  Clock,
  Edit,
  Trash2,
  FileText,
  Table,
  Settings,
  Upload,
  Eye,
  LayoutList,
  Copy,
  GripVertical,
  Download,
  FileDown,
  Presentation,
  Sparkles,
  ClipboardList,
  Users,
  Truck,
  Home,
  CheckCircle2,
  Check,
} from 'lucide-react';
import type { Journey, ItineraryDay, Accommodation, Activity, Dining, Document } from '../../lib/database.types';
import DayEditor from './DayEditor';
import { EnhancedItineraryTable } from './EnhancedItineraryTable';
import { JourneyEditor } from './JourneyEditor';
import { FileUploadProcessor } from './FileUploadProcessor';
import { ExtractedDataReview } from './ExtractedDataReview';
import { TimelineView } from './TimelineView';
import { ShareButtons } from './ShareButtons';
import { ClientView } from './ClientView';
import { JourneyAssistant } from './JourneyAssistant';
import { ItineraryEntriesManager } from './ItineraryEntriesManager';
import { AllTripsFeesManager } from './AllTripsFeesManager';
import { BookingsTab } from './BookingsTab';
import { StaffTab } from './StaffTab';
import { TransportationTab } from './TransportationTab';
import { exportDayByDayToPDF, exportDayByDayToExcel } from '../../lib/exportUtils';
import { safeParseInt } from '../../lib/numberValidation';

interface JourneyManagerProps {
  journey: Journey;
  onBack: () => void;
  onUpdate?: () => void;
}

export default function JourneyManager({ journey, onBack, onUpdate }: JourneyManagerProps) {
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<ItineraryDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<'itinerary' | 'bookings' | 'staff' | 'transportation'>('itinerary');
  const [activeTab, setActiveTab] = useState<'days' | 'table' | 'timeline' | 'fees'>('days');
  const [showJourneyEditor, setShowJourneyEditor] = useState(false);
  const [currentJourney, setCurrentJourney] = useState(journey);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showDataReview, setShowDataReview] = useState(false);
  const [extractedDataCount, setExtractedDataCount] = useState(0);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [draggedDay, setDraggedDay] = useState<number | null>(null);
  const [showClientView, setShowClientView] = useState(false);
  const [showJourneyAssistant, setShowJourneyAssistant] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [customerName, setCustomerName] = useState<string>('');

  const handleDataChange = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    setTableRefreshKey(prev => prev + 1);
  }, []);

  useJourneySync({
    journeyId: journey.id,
    onDataChange: handleDataChange,
    enabled: true
  });

  useEffect(() => {
    fetchDays();
    fetchJourney();
    checkExtractedData();
  }, [journey.id, refreshKey]);

  const fetchJourney = async () => {
    try {
      const { data, error } = await supabase
        .from('journeys')
        .select('*, customers(name)')
        .eq('id', journey.id)
        .single();

      if (error) throw error;
      if (data) {
        setCurrentJourney(data);
        if (data.customers && typeof data.customers === 'object' && 'name' in data.customers) {
          setCustomerName(data.customers.name);
        }
      }
    } catch (err) {
      console.error('Error fetching journey:', err);
    }
  };

  const checkExtractedData = async () => {
    try {
      const { count, error } = await supabase
        .from('extracted_itinerary_data')
        .select('*', { count: 'exact', head: true })
        .eq('journey_id', journey.id);

      if (error) throw error;
      setExtractedDataCount(count || 0);
    } catch (err) {
      console.error('Error checking extracted data:', err);
    }
  };

  const fetchDays = async () => {
    try {
      const { data, error } = await supabase
        .from('itinerary_days')
        .select('id, journey_id, day_number, date, city_destination, start_time, end_time, notes, is_completed, created_at')
        .eq('journey_id', journey.id)
        .order('day_number', { ascending: true });

      if (error) throw error;
      setDays(data || []);
    } catch (error) {
      console.error('Error fetching days:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDays = async () => {
    const startDate = new Date(currentJourney.start_date);
    const daysToCreate: any[] = [];

    for (let i = 0; i < currentJourney.duration_days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      daysToCreate.push({
        journey_id: currentJourney.id,
        day_number: i + 1,
        date: currentDate.toISOString().split('T')[0],
        city_destination: 'To be determined',
      });
    }

    try {
      const { error } = await supabase.from('itinerary_days').insert(daysToCreate);

      if (error) throw error;
      await fetchDays();
    } catch (error) {
      console.error('Error generating days:', error);
      alert('Failed to generate days');
    }
  };

  const handleDeleteDay = async (dayToDelete: ItineraryDay, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete Day ${dayToDelete.day_number}? This will also delete all associated accommodations, activities, dining, and itinerary entries.`)) {
      return;
    }

    try {
      // Delete the day and all related entries (cascade will handle related tables)
      const { error: deleteError } = await supabase
        .from('itinerary_days')
        .delete()
        .eq('id', dayToDelete.id);

      if (deleteError) throw deleteError;

      // Also delete itinerary entries for this day
      await supabase
        .from('itinerary_entries')
        .delete()
        .eq('journey_id', journey.id)
        .eq('day_number', dayToDelete.day_number);

      // Renumber subsequent days
      const subsequentDays = days.filter(d => d.day_number > dayToDelete.day_number);
      for (const day of subsequentDays) {
        const newDayNumber = day.day_number - 1;

        // Update itinerary_days table
        await supabase
          .from('itinerary_days')
          .update({ day_number: newDayNumber })
          .eq('id', day.id);

        // Update itinerary_entries table
        await supabase
          .from('itinerary_entries')
          .update({ day_number: newDayNumber })
          .eq('journey_id', journey.id)
          .eq('day_number', day.day_number);
      }

      await fetchDays();
      setTableRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting day:', error);
      alert('Failed to delete day');
    }
  };

  const handleDuplicateDay = async (dayToDuplicate: ItineraryDay, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const maxDay = Math.max(...days.map(d => d.day_number));
      const newDayNumber = maxDay + 1;

      // Calculate new date based on day number difference
      const dayDifference = newDayNumber - dayToDuplicate.day_number;
      const originalDate = new Date(dayToDuplicate.date);
      const newDate = new Date(originalDate);
      newDate.setDate(originalDate.getDate() + dayDifference);
      const formattedNewDate = newDate.toISOString().split('T')[0];

      // Create new day
      const { data: newDay, error: dayError } = await supabase
        .from('itinerary_days')
        .insert({
          journey_id: journey.id,
          day_number: newDayNumber,
          date: formattedNewDate,
          city_destination: `${dayToDuplicate.city_destination} (Copy)`
        })
        .select()
        .single();

      if (dayError) throw dayError;

      // Duplicate accommodations
      const { data: accommodations } = await supabase
        .from('accommodations')
        .select('id, day_id, hotel_name, location_address, check_in_time, check_out_time, access_method, confirmation_number, guide_notes, created_at, updated_at')
        .eq('day_id', dayToDuplicate.id);

      if (accommodations && accommodations.length > 0) {
        const newAccommodations = accommodations.map(({ id, day_id, created_at, updated_at, ...rest }) => ({
          ...rest,
          day_id: newDay.id
        }));
        const { error: accomError } = await supabase.from('accommodations').insert(newAccommodations);
        if (accomError) {
          console.error('Error duplicating accommodations:', accomError);
          throw accomError;
        }
      }

      // Duplicate activities with booking fees
      const { data: activities } = await supabase
        .from('activities')
        .select('id, day_id, activity_name, activity_time, location, guide_notes, booking_status, display_order, created_at, updated_at, activity_booking_fees(id, activity_id, amount, currency, status, booking_required, guest_count, staff_count, created_at, updated_at)')
        .eq('day_id', dayToDuplicate.id);

      if (activities && activities.length > 0) {
        for (const activity of activities) {
          const { id, day_id, created_at, updated_at, activity_booking_fees, ...activityRest } = activity;

          const { data: newActivity, error: actError } = await supabase
            .from('activities')
            .insert({
              ...activityRest,
              day_id: newDay.id
            })
            .select()
            .single();

          if (actError) {
            console.error('Error duplicating activity:', actError);
            throw actError;
          }

          if (activity_booking_fees && activity_booking_fees.length > 0) {
            const newBookingFees = activity_booking_fees.map(({ id, activity_id, created_at, updated_at, ...feeRest }: any) => ({
              ...feeRest,
              activity_id: newActivity.id
            }));
            const { error: feeError } = await supabase.from('activity_booking_fees').insert(newBookingFees);
            if (feeError) {
              console.error('Error duplicating booking fees:', feeError);
              throw feeError;
            }
          }
        }
      }

      // Duplicate dining
      const { data: dining } = await supabase
        .from('dining')
        .select('id, day_id, meal_type, restaurant_name, location_address, reservation_time, guide_notes, display_order, created_at, updated_at')
        .eq('day_id', dayToDuplicate.id);

      if (dining && dining.length > 0) {
        const newDining = dining.map(({ id, day_id, created_at, updated_at, ...rest }) => ({
          ...rest,
          day_id: newDay.id
        }));
        const { error: diningError } = await supabase.from('dining').insert(newDining);
        if (diningError) {
          console.error('Error duplicating dining:', diningError);
          throw diningError;
        }
      }

      // Duplicate itinerary entries
      const { data: entries } = await supabase
        .from('itinerary_entries')
        .select('id, journey_id, day_number, date, time, type, title, description, location, notes, sort_order, accommodation_id, dining_id, activity_id, created_at, updated_at')
        .eq('journey_id', journey.id)
        .eq('day_number', dayToDuplicate.day_number);

      if (entries && entries.length > 0) {
        const maxSortOrder = await supabase
          .from('itinerary_entries')
          .select('sort_order')
          .eq('journey_id', journey.id)
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle();

        const startingSortOrder = (maxSortOrder?.data?.sort_order || 0) + 1;

        const newEntries = entries.map(({ id, created_at, updated_at, accommodation_id, dining_id, activity_id, ...rest }, index) => ({
          ...rest,
          day_number: newDayNumber,
          date: formattedNewDate,
          accommodation_id: null,
          dining_id: null,
          activity_id: null,
          sort_order: startingSortOrder + index
        }));
        const { error: entriesError } = await supabase.from('itinerary_entries').insert(newEntries);
        if (entriesError) {
          console.error('Error duplicating itinerary entries:', entriesError);
          throw entriesError;
        }
      }

      await fetchDays();
      setTableRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Error duplicating day:', error);
      const errorMessage = error?.message || error?.error_description || 'Unknown error';
      alert(`Failed to duplicate day: ${errorMessage}`);
    }
  };

  const handleDayDragStart = (dayNumber: number, e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedDay(dayNumber);
  };

  const handleDayDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleExportDayByDay = async (format: 'pdf' | 'excel') => {
    try {
      const daysWithData = await Promise.all(
        days.map(async (day) => {
          const [accomData, actData, diningData] = await Promise.all([
            supabase.from('accommodations').select('id, hotel_name, location_address, check_in_time, check_out_time, guide_notes').eq('day_id', day.id),
            supabase.from('activities').select('id, activity_name, activity_time, location, guide_notes, booking_status').eq('day_id', day.id).order('activity_time', { ascending: true }),
            supabase.from('dining').select('id, meal_type, restaurant_name, location, reservation_time, guide_notes').eq('day_id', day.id).order('reservation_time', { ascending: true }),
          ]);

          return {
            ...day,
            accommodations: accomData.data || [],
            activities: actData.data || [],
            dining: diningData.data || [],
          };
        })
      );

      if (format === 'pdf') {
        exportDayByDayToPDF(currentJourney.journey_name, daysWithData);
      } else {
        exportDayByDayToExcel(currentJourney.journey_name, daysWithData);
      }
    } catch (error) {
      console.error('Error exporting day by day:', error);
      alert('Failed to export data');
    }
  };

  const handleDayDrop = async (targetDayNumber: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedDay === null || draggedDay === targetDayNumber) {
      setDraggedDay(null);
      return;
    }

    try {
      const sortedDays = [...days].sort((a, b) => a.day_number - b.day_number);
      const draggedDayObj = sortedDays.find(d => d.day_number === draggedDay);
      const targetIndex = sortedDays.findIndex(d => d.day_number === targetDayNumber);

      if (!draggedDayObj || targetIndex === -1) return;

      // Remove dragged day from array
      const withoutDragged = sortedDays.filter(d => d.day_number !== draggedDay);

      // Insert at target position
      const newOrder = [
        ...withoutDragged.slice(0, targetIndex),
        draggedDayObj,
        ...withoutDragged.slice(targetIndex)
      ];

      // Create a mapping of old day numbers to new day numbers
      const dayNumberMapping: { [key: string]: { oldNumber: number; newNumber: number; dayId: string } } = {};
      for (let i = 0; i < newOrder.length; i++) {
        const day = newOrder[i];
        const newDayNumber = i + 1;
        dayNumberMapping[day.id] = {
          oldNumber: day.day_number,
          newNumber: newDayNumber,
          dayId: day.id
        };
      }

      // Update all days and entries in batch
      for (const dayId in dayNumberMapping) {
        const { oldNumber, newNumber } = dayNumberMapping[dayId];

        if (oldNumber !== newNumber) {
          // Update itinerary_days
          await supabase
            .from('itinerary_days')
            .update({ day_number: newNumber })
            .eq('id', dayId);

          // Update itinerary_entries using the old day number
          await supabase
            .from('itinerary_entries')
            .update({ day_number: newNumber })
            .eq('journey_id', journey.id)
            .eq('day_number', oldNumber);
        }
      }

      await fetchDays();
      setTableRefreshKey(prev => prev + 1);
      setDraggedDay(null);
    } catch (error) {
      console.error('Error reordering days:', error);
      alert('Failed to reorder days');
      setDraggedDay(null);
    }
  };

  const handleEditDayNumber = async (day: ItineraryDay, newDayNumber: number) => {
    if (newDayNumber < 1 || isNaN(newDayNumber)) {
      alert('Day number must be a positive number');
      return;
    }

    if (newDayNumber === day.day_number) {
      return;
    }

    if (days.some(d => d.day_number === newDayNumber && d.id !== day.id)) {
      alert(`Day ${newDayNumber} already exists. Please choose a different number.`);
      return;
    }

    try {
      // Update itinerary_days
      await supabase
        .from('itinerary_days')
        .update({ day_number: newDayNumber })
        .eq('id', day.id);

      // Update itinerary_entries
      await supabase
        .from('itinerary_entries')
        .update({ day_number: newDayNumber })
        .eq('journey_id', journey.id)
        .eq('day_number', day.day_number);

      await fetchDays();
      setTableRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error updating day number:', error);
      alert('Failed to update day number');
    }
  };

  if (selectedDay) {
    return (
      <DayEditor
        key={`${selectedDay.id}-${refreshKey}`}
        day={selectedDay}
        journey={journey}
        allDays={days}
        onBack={() => {
          setSelectedDay(null);
          fetchDays();
        }}
        onHome={onBack}
        onNavigate={(newDay) => setSelectedDay(newDay)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-brand-beige">
      <header className="bg-brand-cream-dark border-b border-brand-tan shadow-soft">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-3">
          {/* Mobile: Stacked layout */}
          <div className="lg:hidden">
            {/* Top row: Title */}
            <div className="flex items-center gap-2 mb-2">
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-semibold text-brand-brown truncate">
                  {currentJourney.journey_name}{customerName && ` - ${customerName}`}
                </h1>
                <p className="text-xs text-brand-gray-1 truncate">
                  {new Date(currentJourney.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(currentJourney.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {currentJourney.passenger_count && ` • ${currentJourney.passenger_count} ${currentJourney.passenger_count === 1 ? 'participant' : 'participants'}`}
                </p>
              </div>
            </div>
            {/* Bottom row: Action buttons - compact icons only on mobile */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={onBack}
                className="p-2 bg-brand-gray-4 hover:bg-brand-gray-3 text-brand-brown rounded-lg transition-colors flex-shrink-0 border border-brand-gray-3"
                title="Go to home"
              >
                <Home className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowJourneyAssistant(true)}
                className="p-2 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-lg transition-colors flex-shrink-0"
                title="Journey Assistant"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowClientView(true)}
                className="p-2 bg-brand-cyan bg-opacity-40 hover:bg-opacity-50 text-brand-brown rounded-lg transition-colors flex-shrink-0 border border-brand-cyan"
                title="Client View"
              >
                <Presentation className="w-4 h-4" />
              </button>
              {extractedDataCount > 0 && (
                <button
                  onClick={() => setShowDataReview(true)}
                  className="p-2 bg-brand-green-light bg-opacity-60 hover:bg-opacity-80 text-brand-green border border-brand-green rounded-lg transition-colors relative flex-shrink-0"
                  title="Review Extracted Data"
                >
                  <Eye className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 px-1 py-0.5 bg-brand-orange text-white text-xs font-semibold rounded-full min-w-[18px] text-center">
                    {extractedDataCount}
                  </span>
                </button>
              )}
              <button
                onClick={() => setShowFileUpload(true)}
                className="p-2 bg-brand-gold bg-opacity-50 hover:bg-opacity-70 text-brand-brown-warm border border-brand-gold rounded-lg transition-colors flex-shrink-0"
                title="Upload Files"
              >
                <Upload className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowJourneyEditor(true)}
                className="p-2 bg-brand-gray-4 hover:bg-brand-gray-3 text-brand-brown rounded-lg transition-colors flex-shrink-0 border border-brand-gray-3"
                title="Edit Journey Details"
              >
                <Settings className="w-4 h-4" />
              </button>
              {days.length === 0 && !loading && (
                <button
                  onClick={generateDays}
                  className="p-2 bg-brand-orange-light bg-opacity-50 hover:bg-opacity-70 text-brand-brown rounded-lg transition-colors flex-shrink-0 border border-brand-orange"
                  title="Generate Days"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Desktop: Horizontal layout */}
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-gray-4 hover:bg-brand-gray-3 text-brand-brown rounded-lg transition-colors text-sm font-medium border border-brand-gray-3"
                title="Go to home"
              >
                <Home className="w-5 h-5" />
                <span>Home</span>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-brand-brown">
                  {currentJourney.journey_name}{customerName && ` - ${customerName}`}
                </h1>
                <p className="text-xs text-brand-gray-1">
                  {new Date(currentJourney.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(currentJourney.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ({currentJourney.duration_days} days){currentJourney.passenger_count && ` • ${currentJourney.passenger_count} ${currentJourney.passenger_count === 1 ? 'participant' : 'participants'}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowJourneyAssistant(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-lg transition-colors text-sm font-medium"
                title="AI Journey Assistant"
              >
                <Sparkles className="w-4 h-4" />
                <span>Assistant</span>
              </button>
              <button
                onClick={() => setShowClientView(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-cyan bg-opacity-40 hover:bg-opacity-50 text-brand-brown rounded-lg transition-colors text-sm font-medium border border-brand-cyan"
                title="View as Client"
              >
                <Presentation className="w-4 h-4" />
                <span>Client View</span>
              </button>
              {extractedDataCount > 0 && (
                <button
                  onClick={() => setShowDataReview(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-green-light bg-opacity-60 hover:bg-opacity-80 text-brand-green border border-brand-green rounded-lg transition-colors relative text-sm font-medium"
                >
                  <Eye className="w-4 h-4" />
                  <span>Review Data</span>
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-brand-orange text-white text-xs font-semibold rounded-full min-w-[20px] text-center">
                    {extractedDataCount}
                  </span>
                </button>
              )}
              <button
                onClick={() => setShowFileUpload(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-gold bg-opacity-50 hover:bg-opacity-70 text-brand-brown-warm border border-brand-gold rounded-lg transition-colors text-sm font-medium"
              >
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </button>
              <button
                onClick={() => setShowJourneyEditor(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-gray-4 hover:bg-brand-gray-3 text-brand-brown rounded-lg transition-colors text-sm font-medium border border-brand-gray-3"
              >
                <Settings className="w-4 h-4" />
                <span>Edit Journey</span>
              </button>
              {days.length === 0 && !loading && (
                <button
                  onClick={generateDays}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange-light bg-opacity-50 hover:bg-opacity-70 text-brand-brown rounded-lg transition-colors text-sm font-medium border border-brand-orange"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate Days</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        <div className="flex gap-1 bg-white rounded-lg p-1 border border-brand-gray-3 mb-4 shadow-sm">
          <button
            onClick={() => setMainTab('itinerary')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
              mainTab === 'itinerary'
                ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                : 'text-brand-brown hover:bg-brand-gray-4'
            }`}
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">Itinerary</span>
          </button>
          <button
            onClick={() => setMainTab('bookings')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
              mainTab === 'bookings'
                ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                : 'text-brand-brown hover:bg-brand-gray-4'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">Bookings</span>
          </button>
          <button
            onClick={() => setMainTab('staff')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
              mainTab === 'staff'
                ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                : 'text-brand-brown hover:bg-brand-gray-4'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">Staff</span>
          </button>
          <button
            onClick={() => setMainTab('transportation')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
              mainTab === 'transportation'
                ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                : 'text-brand-brown hover:bg-brand-gray-4'
            }`}
          >
            <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">Logistics</span>
          </button>
        </div>

        {mainTab === 'itinerary' && (
          <div className="flex gap-1 bg-white rounded-lg p-1 border border-brand-gray-3 mb-4 shadow-sm">
            <button
              onClick={() => setActiveTab('days')}
              className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                activeTab === 'days'
                  ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                  : 'text-brand-brown hover:bg-brand-gray-4'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Days</span>
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                activeTab === 'table'
                  ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                  : 'text-brand-brown hover:bg-brand-gray-4'
              }`}
            >
              <Table className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Table</span>
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                activeTab === 'timeline'
                  ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                  : 'text-brand-brown hover:bg-brand-gray-4'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Timeline</span>
            </button>
            <button
              onClick={() => setActiveTab('fees')}
              className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                activeTab === 'fees'
                  ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                  : 'text-brand-brown hover:bg-brand-gray-4'
              }`}
            >
              <ActivityIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Fees</span>
            </button>
          </div>
        )}
      </div>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-6">
        {mainTab === 'bookings' && <BookingsTab key={refreshKey} journeyId={journey.id} />}
        {mainTab === 'staff' && <StaffTab journeyId={journey.id} />}
        {mainTab === 'transportation' && <TransportationTab journeyId={journey.id} />}

        {mainTab === 'itinerary' && (
          <>
            {activeTab === 'days' ? (
              loading ? (
                <div className="text-center py-12">
                  <p className="text-sm text-brand-gray-1">Loading itinerary...</p>
                </div>
              ) : days.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-lg border border-brand-gray-3 shadow-sm">
                  <Calendar className="w-10 h-10 text-brand-gray-2 mx-auto mb-3" />
                  <p className="text-sm text-brand-gray-1 mb-4">No days created yet</p>
                  <button
                    onClick={generateDays}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Generate {currentJourney.duration_days} Days</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        onClick={() => handleExportDayByDay('pdf')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-brown-light bg-opacity-40 hover:bg-opacity-60 text-brand-brown rounded-lg transition-colors text-xs sm:text-sm font-medium border border-brand-brown-light"
                        title="Export to PDF"
                      >
                        <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>PDF</span>
                      </button>
                      <button
                        onClick={() => handleExportDayByDay('excel')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-green-light bg-opacity-40 hover:bg-opacity-60 text-brand-green rounded-lg transition-colors text-xs sm:text-sm font-medium border border-brand-green"
                        title="Export to Excel"
                      >
                        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>Excel</span>
                      </button>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const { data: lastDay, error: lastDayError } = await supabase
                            .from('itinerary_days')
                            .select('day_number, date')
                            .eq('journey_id', journey.id)
                            .order('day_number', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                          if (lastDayError) throw lastDayError;

                          const newDayNumber = lastDay ? lastDay.day_number + 1 : 1;
                          const lastDate = lastDay ? new Date(lastDay.date) : new Date(currentJourney.start_date);
                          const newDate = new Date(lastDate);
                          newDate.setDate(newDate.getDate() + 1);

                          const { error } = await supabase.from('itinerary_days').insert({
                            journey_id: journey.id,
                            day_number: newDayNumber,
                            date: newDate.toISOString().split('T')[0],
                            city_destination: 'To be determined',
                          });

                          if (error) throw error;
                          await fetchDays();
                        } catch (error) {
                          console.error('Error adding new day:', error);
                          alert('Failed to add new day');
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange-light bg-opacity-50 hover:bg-opacity-70 text-brand-brown rounded-lg transition-colors text-xs sm:text-sm font-medium w-full sm:w-auto justify-center border border-brand-orange"
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>Add New Day</span>
                    </button>
                  </div>
                  {days.map((day) => (
                    <DayCard
                      key={day.id}
                      day={day}
                      onEdit={() => setSelectedDay(day)}
                      onDelete={(e) => handleDeleteDay(day, e)}
                      onDuplicate={(e) => handleDuplicateDay(day, e)}
                      onEditDayNumber={(newNumber) => handleEditDayNumber(day, newNumber)}
                      onDragStart={(e) => handleDayDragStart(day.day_number, e)}
                      onDragOver={handleDayDragOver}
                      onDrop={(e) => handleDayDrop(day.day_number, e)}
                      isDragging={draggedDay === day.day_number}
                      onUpdate={fetchDays}
                    />
                  ))}
                </div>
              )
            ) : activeTab === 'table' ? (
              <EnhancedItineraryTable key={tableRefreshKey} journeyId={journey.id} />
            ) : activeTab === 'timeline' ? (
              <TimelineView key={refreshKey} journey={currentJourney} />
            ) : (
              <AllTripsFeesManager />
            )}
          </>
        )}
      </main>

      {showJourneyEditor && (
        <JourneyEditor
          journey={currentJourney}
          onClose={() => setShowJourneyEditor(false)}
          onSave={async () => {
            await fetchJourney();
            setShowJourneyEditor(false);
            // Don't call onUpdate here to prevent navigation
            // The data will be refreshed via useJourneySync
          }}
          onHome={onBack}
        />
      )}

      {showFileUpload && (
        <FileUploadProcessor
          journeyId={journey.id}
          onComplete={() => {
            checkExtractedData();
            setShowDataReview(true);
          }}
          onClose={() => setShowFileUpload(false)}
        />
      )}

      {showDataReview && (
        <ExtractedDataReview
          journeyId={journey.id}
          onClose={() => {
            setShowDataReview(false);
            checkExtractedData();
          }}
          onComplete={() => {
            fetchDays();
            checkExtractedData();
            setTableRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {selectedDay && (
        <DayEditor
          key={`${selectedDay?.id}-${refreshKey}`}
          day={selectedDay}
          journey={journey}
          onBack={() => {
            setSelectedDay(null);
            fetchDays();
          }}
          onHome={onBack}
        />
      )}

      {showClientView && (
        <ClientView
          journey={currentJourney}
          onClose={() => setShowClientView(false)}
        />
      )}

      {showJourneyAssistant && (
        <JourneyAssistant
          journey={currentJourney}
          onClose={() => setShowJourneyAssistant(false)}
        />
      )}
    </div>
  );
}

interface DayCardProps {
  day: ItineraryDay;
  onEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onDuplicate: (e: React.MouseEvent) => void;
  onEditDayNumber: (newNumber: number) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDragging: boolean;
  onUpdate?: () => void;
}

function DayCard({ day, onEdit, onDelete, onDuplicate, onEditDayNumber, onDragStart, onDragOver, onDrop, isDragging, onUpdate }: DayCardProps) {
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [dining, setDining] = useState<Dining[]>([]);
  const [staff, setStaff] = useState<Array<{ name: string; role: string }>>([]);
  const [guides, setGuides] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [isEditingDayNumber, setIsEditingDayNumber] = useState(false);
  const [editedDayNumber, setEditedDayNumber] = useState(day.day_number.toString());
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isCompleted, setIsCompleted] = useState(day.is_completed);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsCompleted(day.is_completed);
  }, [day.is_completed]);

  useEffect(() => {
    let isMounted = true;
    let observer: IntersectionObserver | null = null;

    const loadData = async () => {
      if (isMounted && !hasLoaded) {
        setHasLoaded(true);
        await fetchDayData();
      }
    };

    if (cardRef.current && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && isMounted && !hasLoaded) {
              loadData();
            }
          });
        },
        {
          root: null,
          rootMargin: '100px',
          threshold: 0.01,
        }
      );

      observer.observe(cardRef.current);
    } else {
      loadData();
    }

    return () => {
      isMounted = false;
      observer?.disconnect();
    };
  }, [day.id, hasLoaded]);

  const fetchStaffData = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const { data: staffData, error } = await supabase
        .from('journey_staff_day_assignments')
        .select('journey_staff(name, role, role_custom)')
        .eq('day_id', day.id)
        .limit(10)
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error) {
        if (error.name !== 'AbortError') {
          console.error('Error fetching staff data:', error);
        }
        return;
      }

      if (staffData) {
        const staffList = staffData
          .filter(item => item.journey_staff)
          .map(item => ({
            name: (item.journey_staff as any).name,
            role: (item.journey_staff as any).role_custom || (item.journey_staff as any).role,
          }));
        setStaff(staffList);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching staff:', err);
      }
    }
  };

  const fetchGuidesData = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const { data: dayShares, error } = await supabase
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
        .eq('day_id', day.id)
        .limit(10)
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error) {
        if (error.name !== 'AbortError') {
          console.error('Error fetching guides data:', error);
        }
        return;
      }

      if (dayShares) {
        const guidesList = dayShares
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
          new Map(guidesList.map(g => [g.id, g])).values()
        );

        setGuides(uniqueGuides);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching guides:', err);
      }
    }
  };

  const fetchDayData = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const [accomData, actData, diningData] = await Promise.all([
        supabase
          .from('accommodations')
          .select('id, hotel_name')
          .eq('day_id', day.id)
          .limit(10)
          .abortSignal(controller.signal),
        supabase
          .from('activities')
          .select('id, activity_name, activity_time')
          .eq('day_id', day.id)
          .order('activity_time', { ascending: true })
          .limit(20)
          .abortSignal(controller.signal),
        supabase
          .from('dining')
          .select('id, meal_type, restaurant_name, reservation_time')
          .eq('day_id', day.id)
          .order('reservation_time', { ascending: true })
          .limit(10)
          .abortSignal(controller.signal),
      ]);

      clearTimeout(timeoutId);

      if (accomData.error && accomData.error.name !== 'AbortError') throw accomData.error;
      if (actData.error && actData.error.name !== 'AbortError') throw actData.error;
      if (diningData.error && diningData.error.name !== 'AbortError') throw diningData.error;

      setAccommodations(accomData.data || []);
      setActivities(actData.data || []);
      setDining(diningData.data || []);

      Promise.all([fetchStaffData(), fetchGuidesData()]);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching day data:', error);
      }
    }
  };

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newCompletedState = !isCompleted;
    setIsCompleted(newCompletedState);

    try {
      const { error } = await supabase
        .from('itinerary_days')
        .update({ is_completed: newCompletedState })
        .eq('id', day.id);

      if (error) {
        setIsCompleted(!newCompletedState);
        throw error;
      }

      onUpdate?.();
    } catch (error) {
      console.error('Error toggling day completion:', error);
    }
  };

  const getCompletionBorderColor = () => {
    if (isCompleted) return 'border-l-green-500';
    return 'border-l-brand-orange';
  };

  const totalItems = accommodations.length + activities.length + dining.length;

  return (
    <div
      ref={cardRef}
      data-day-id={day.id}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`relative bg-white rounded-lg border border-brand-gray-3 border-l-4 ${getCompletionBorderColor()} p-3 sm:p-4 hover:shadow-md transition-all cursor-pointer group ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {isCompleted && (
        <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 rounded-bl-lg rounded-tr-lg text-xs font-semibold flex items-center gap-1 shadow-md">
          <CheckCircle2 className="w-3 h-3" />
          Complete
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0" onClick={onEdit}>
          <button
            className="cursor-grab active:cursor-grabbing text-brand-gray-2 hover:text-brand-brown transition-colors flex-shrink-0 touch-manipulation"
            title="Drag to reorder days"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              {isEditingDayNumber ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <span className="text-sm sm:text-base font-semibold text-brand-brown">Day</span>
                  <input
                    type="number"
                    value={editedDayNumber}
                    onChange={(e) => setEditedDayNumber(e.target.value)}
                    onBlur={() => {
                      const num = safeParseInt(editedDayNumber, null);
                      if (num !== null) {
                        onEditDayNumber(num);
                      }
                      setIsEditingDayNumber(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const num = safeParseInt(editedDayNumber, null);
                        if (num !== null) {
                          onEditDayNumber(num);
                        }
                        setIsEditingDayNumber(false);
                      } else if (e.key === 'Escape') {
                        setEditedDayNumber(day.day_number.toString());
                        setIsEditingDayNumber(false);
                      }
                    }}
                    autoFocus
                    className="w-16 px-2 py-0.5 text-sm sm:text-base font-semibold text-brand-brown border border-brand-orange rounded focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  />
                </div>
              ) : (
                <h3
                  className="text-sm sm:text-base font-semibold text-brand-brown cursor-pointer hover:text-brand-orange transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingDayNumber(true);
                  }}
                  title="Click to edit day number"
                >
                  Day {day.day_number}
                </h3>
              )}
              <span className="px-2 py-0.5 bg-brand-cyan bg-opacity-30 text-brand-brown text-xs font-medium rounded-full whitespace-nowrap">
                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              {guides.length > 0 && guides.map((guide) => (
                <span
                  key={guide.id}
                  className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex items-center gap-1 whitespace-nowrap"
                  title={guide.email}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Users className="w-3 h-3" />
                  {guide.name}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-brand-gray-1">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium truncate">{day.city_destination}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleToggleComplete}
            className={`p-1.5 rounded-lg transition-colors touch-manipulation ${
              isCompleted
                ? 'text-green-600 bg-green-50 hover:bg-green-100'
                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
            }`}
            title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
          >
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={onDuplicate}
            className="p-1.5 text-brand-brown hover:bg-brand-gray-4 rounded-lg transition-colors touch-manipulation"
            title="Duplicate this day"
          >
            <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 text-brand-orange hover:bg-brand-cyan hover:bg-opacity-20 rounded-lg transition-colors touch-manipulation"
            title="Edit this day"
          >
            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-manipulation"
            title="Delete this day"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      <div onClick={onEdit} className="pt-2 border-t border-brand-gray-4">
        {totalItems === 0 ? (
          <div className="text-xs sm:text-sm text-brand-gray-2 italic">No activities planned yet</div>
        ) : (
          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm flex-wrap">
            {accommodations.length > 0 && (
              <div className="flex items-center gap-1.5 text-brand-gray-1">
                <Hotel className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                <span>{accommodations.length} hotel{accommodations.length !== 1 ? 's' : ''}</span>
              </div>
            )}
            {activities.length > 0 && (
              <div className="flex items-center gap-1.5 text-brand-gray-1">
                <ActivityIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                <span>{activities.length} activit{activities.length !== 1 ? 'ies' : 'y'}</span>
              </div>
            )}
            {dining.length > 0 && (
              <div className="flex items-center gap-1.5 text-brand-gray-1">
                <Utensils className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                <span>{dining.length} meal{dining.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}

        {staff.length > 0 && (
          <div className="mt-2 pt-2 border-t border-brand-gray-4 flex flex-wrap gap-1.5">
            {staff.map((member, index) => {
              const isGuide = member.role.toLowerCase().includes('guide');
              return (
                <span
                  key={index}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                    isGuide
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-brand-cyan bg-opacity-20 text-brand-brown border border-brand-cyan'
                  }`}
                >
                  {member.name} ({member.role})
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
