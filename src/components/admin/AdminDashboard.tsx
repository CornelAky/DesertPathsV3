import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Plus, Calendar, Users, Search, CircleUser as UserCircle, MapPin, Trash2, Share2, Copy, FileText, FileSpreadsheet, BookTemplate, BookCopy, BookOpen, Database, Pin, ArrowUpDown, Clock, DollarSign, UserCheck, Building2, Truck, Package, Hotel, Utensils, Settings } from 'lucide-react';
import type { Customer, Journey } from '../../lib/database.types';
import JourneyManager from './JourneyManager';
import UserManagement from './UserManagement';
import { ConfirmDialog } from './ConfirmDialog';
import { SharedJourneysView } from '../shared/SharedTripsView';
import { DuplicateJourneyModal } from './DuplicateJourneyModal';
import { CreateJourneyWithTemplate } from './CreateJourneyWithTemplate';
import { TemplateManager } from './TemplateManager';
import { TemplateEditor } from './TemplateEditor';
import { NewJourneyExcelImport } from './NewJourneyExcelImport';
import { TrashView } from './TrashView';
import { SimplifiedShareModal } from './SimplifiedShareModal';
import { GuideCopiesView } from './GuideCopiesView';
import { GuideAccessView } from './GuideAccessView';
import { GuidelineTab } from './GuidelineTab';
import { DatabaseManagement } from './DatabaseManagement';
import UserMenu from '../shared/UserMenu';
import { SettingsDashboard } from './SettingsDashboard';

interface ItineraryDayWithDetails {
  id: string;
  journey_id: string;
  day_number: number;
  date: string;
  city_destination: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  activities?: Array<{
    id: string;
    name: string;
    description: string | null;
    time: string | null;
  }>;
  accommodations?: Array<{
    id: string;
    name: string;
    location: string | null;
    phone: string | null;
  }>;
  dining?: Array<{
    id: string;
    meal_type: string;
    restaurant_name: string | null;
    location: string | null;
  }>;
  transportation?: Array<{
    id: string;
    type: string;
    details: string | null;
  }>;
}

interface JourneyWithGuides extends Journey {
  guideNames?: string[];
  cities?: string[];
  itineraryDays?: ItineraryDayWithDetails[];
  matchedDays?: ItineraryDayWithDetails[];
  unreadGuideUploads?: number;
}

export default function AdminDashboard() {
  const { userProfile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [journeys, setJourneys] = useState<JourneyWithGuides[]>([]);
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'alphabetical' | 'client'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [activeTab, setActiveTab] = useState<'journeys' | 'users' | 'database' | 'guideline' | 'settings'>('journeys');
  const [journeysSubtab, setJourneysSubtab] = useState<'all' | 'templates' | 'shared' | 'trash'>('all');
  const [usersSubtab, setUsersSubtab] = useState<'users' | 'guide-copies' | 'guide-access'>('users');
  const [databaseSubtab, setDatabaseSubtab] = useState<'clients' | 'staff' | 'providers' | 'vehicles' | 'gear' | 'hotels' | 'restaurants' | 'sites'>('staff');
  const [settingsSubtab, setSettingsSubtab] = useState<'activities' | 'pricing'>('activities');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [deleteJourneyDialog, setDeleteJourneyDialog] = useState<{ isOpen: boolean; journey: Journey | null }>({
    isOpen: false,
    journey: null,
  });
  const [duplicateJourneyModal, setDuplicateJourneyModal] = useState<{ isOpen: boolean; journey: Journey | null }>({
    isOpen: false,
    journey: null,
  });
  const [shareJourneyModal, setShareJourneyModal] = useState<{ isOpen: boolean; journey: Journey | null }>({
    isOpen: false,
    journey: null,
  });
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [saveTemplateModal, setSaveTemplateModal] = useState<{ isOpen: boolean; journey: Journey | null }>({
    isOpen: false,
    journey: null,
  });
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchJourneys();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, contact_number, email, notes, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJourneys = async () => {
    try {
      const { data, error } = await supabase
        .from('journeys')
        .select('*, customers(*), creator:created_by(name, email)')
        .is('deleted_at', null)
        .or('is_driver_copy.is.null,is_driver_copy.eq.false')
        .order('start_date', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setJourneys([]);
        setLoading(false);
        return;
      }

      const journeyIds = data.map(t => t.id);

      const [assignmentsResult, itineraryDaysResult] = await Promise.all([
        supabase
          .from('journey_assignments')
          .select('journey_id, users(name)')
          .in('journey_id', journeyIds),
        supabase
          .from('itinerary_days')
          .select('journey_id, city_destination')
          .in('journey_id', journeyIds)
          .order('day_number', { ascending: true })
      ]);

      const assignmentsByJourney = new Map<string, string[]>();
      (assignmentsResult.data || []).forEach((assignment: any) => {
        const journeyId = assignment.journey_id;
        if (!assignmentsByJourney.has(journeyId)) {
          assignmentsByJourney.set(journeyId, []);
        }
        if (assignment.users?.name) {
          assignmentsByJourney.get(journeyId)!.push(assignment.users.name);
        }
      });

      const daysByJourney = new Map<string, any[]>();
      (itineraryDaysResult.data || []).forEach((day: any) => {
        const journeyId = day.journey_id;
        if (!daysByJourney.has(journeyId)) {
          daysByJourney.set(journeyId, []);
        }
        daysByJourney.get(journeyId)!.push(day);
      });

      const journeysWithGuides = data.map((journey) => {
        const guideNames = assignmentsByJourney.get(journey.id) || [];
        const itineraryDays = daysByJourney.get(journey.id) || [];
        const cities = itineraryDays.map(day => day.city_destination).filter(Boolean);
        const uniqueCities = Array.from(new Set(cities));

        return {
          ...journey,
          guideNames,
          cities: uniqueCities
        };
      });

      setJourneys(journeysWithGuides);
    } catch (error) {
      console.error('Error fetching journeys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveJourney = async () => {
    if (!deleteJourneyDialog.journey) return;

    try {
      const { error } = await supabase
        .from('journeys')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deleteJourneyDialog.journey.id);

      if (error) {
        console.error('Error archiving journey:', error);
        alert(`Failed to archive journey: ${error.message}`);
        return;
      }

      await fetchJourneys();
      setDeleteJourneyDialog({ isOpen: false, journey: null });
    } catch (error: any) {
      console.error('Error archiving journey:', error);
      alert(`Failed to archive journey: ${error?.message || 'Please try again.'}`);
    }
  };

  const togglePinJourney = async (journeyId: string, currentlyPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('journeys')
        .update({
          pinned: !currentlyPinned,
          pinned_at: !currentlyPinned ? new Date().toISOString() : null
        })
        .eq('id', journeyId);

      if (error) throw error;
      await fetchJourneys();
    } catch (error) {
      console.error('Error toggling pin:', error);
      alert('Failed to pin/unpin journey');
    }
  };

  const handleSaveAsTemplate = async (templateName: string) => {
    if (!saveTemplateModal.journey || savingTemplate) return;

    setSavingTemplate(true);
    try {
      const journey = saveTemplateModal.journey;
      const { data: user } = await supabase.auth.getUser();

      const { data: newTemplate, error: templateError } = await supabase
        .from('journey_templates')
        .insert({
          name: templateName,
          description: journey.description || `Template created from ${journey.journey_name}`,
          template_type: 'custom',
          duration_days: journey.duration_days,
          is_default: false,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      const { data: days, error: daysError } = await supabase
        .from('itinerary_days')
        .select('id, journey_id, day_number, date, city_destination, notes')
        .eq('journey_id', journey.id)
        .order('day_number');

      if (daysError) throw daysError;

      for (const day of days || []) {
        const { data: newDay, error: dayError } = await supabase
          .from('template_days')
          .insert({
            template_id: newTemplate.id,
            day_number: day.day_number,
            title: day.city_destination || '',
            description: day.notes || '',
          })
          .select()
          .single();

        if (dayError) throw dayError;

        const { data: activities } = await supabase
          .from('activities')
          .select('id, day_id, activity_name, location, start_time, end_time, notes, booking_status, booking_fee')
          .eq('day_id', day.id);

        if (activities && activities.length > 0) {
          await supabase.from('template_activities').insert(
            activities.map((act, idx) => ({
              template_day_id: newDay.id,
              activity_name: act.activity_name,
              location: act.location || '',
              start_time: act.start_time,
              end_time: act.end_time,
              notes: act.notes || '',
              booking_status: act.booking_status || 'pending',
              booking_fee: act.booking_fee || 0,
              order_index: idx,
            }))
          );
        }

        const { data: dining } = await supabase
          .from('dining')
          .select('id, day_id, restaurant_name, meal_type, location, reservation_time, notes')
          .eq('day_id', day.id);

        if (dining && dining.length > 0) {
          await supabase.from('template_dining').insert(
            dining.map((meal, idx) => ({
              template_day_id: newDay.id,
              restaurant_name: meal.restaurant_name,
              meal_type: meal.meal_type,
              location: meal.location || '',
              reservation_time: meal.reservation_time,
              notes: meal.notes || '',
              order_index: idx,
            }))
          );
        }

        const { data: accommodations } = await supabase
          .from('accommodations')
          .select('id, day_id, hotel_name, location_address, check_in_time, check_out_time, access_method, confirmation_number, notes')
          .eq('day_id', day.id);

        if (accommodations && accommodations.length > 0) {
          await supabase.from('template_accommodations').insert(
            accommodations.map((acc, idx) => ({
              template_day_id: newDay.id,
              hotel_name: acc.hotel_name,
              location_address: acc.location_address || '',
              check_in_time: acc.check_in_time,
              check_out_time: acc.check_out_time,
              access_method: acc.access_method || 'self_checkin',
              confirmation_number: acc.confirmation_number || '',
              notes: acc.notes || '',
              order_index: idx,
            }))
          );
        }
      }

      alert(`Template "${templateName}" created successfully!`);
      setSaveTemplateModal({ isOpen: false, journey: null });
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template. Please try again.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const filteredJourneys = journeys
    .filter(journey => {
      if (filterStatus === 'all') return true;
      return journey.status === filterStatus;
    })
    .map(journey => {
      if (!searchQuery.trim()) {
        return { ...journey, matchedDays: undefined };
      }

      const query = searchQuery.toLowerCase().trim();

    const customerData: any = journey.customers;
    const customerName = (customerData?.name || '').toLowerCase();
    const customerEmail = (customerData?.email || '').toLowerCase();
    const customerNotes = (customerData?.notes || '').toLowerCase();

    const journeyId = (journey.id || '').toLowerCase();
    const journeyName = (journey.journey_name || '').toLowerCase();
    const journeyDescription = (journey.description || '').toLowerCase();
    const status = (journey.status || '').toLowerCase();

    const statusExactMatch = status === query || status.replace('_', ' ') === query;

    const guideNames = (journey.guideNames || []).join(' ').toLowerCase();
    const cities = (journey.cities || []).join(' ').toLowerCase();

    const startDate = journey.start_date ? new Date(journey.start_date) : null;
    const endDate = journey.end_date ? new Date(journey.end_date) : null;

    const startMonthFull = startDate ? startDate.toLocaleString('en-US', { month: 'long' }).toLowerCase() : '';
    const startMonthShort = startDate ? startDate.toLocaleString('en-US', { month: 'short' }).toLowerCase() : '';
    const startYear = startDate ? startDate.getFullYear().toString() : '';
    const startDateString = startDate ? startDate.toLocaleDateString('en-US').toLowerCase() : '';

    const endMonthFull = endDate ? endDate.toLocaleString('en-US', { month: 'long' }).toLowerCase() : '';
    const endMonthShort = endDate ? endDate.toLocaleString('en-US', { month: 'short' }).toLowerCase() : '';
    const endYear = endDate ? endDate.getFullYear().toString() : '';
    const endDateString = endDate ? endDate.toLocaleDateString('en-US').toLowerCase() : '';

    const topLevelMatch = (
      statusExactMatch ||
      journeyId.includes(query) ||
      journeyName.includes(query) ||
      journeyDescription.includes(query) ||
      customerName.includes(query) ||
      customerEmail.includes(query) ||
      customerNotes.includes(query) ||
      status.includes(query) ||
      guideNames.includes(query) ||
      cities.includes(query) ||
      startMonthFull.includes(query) ||
      startMonthShort.includes(query) ||
      startYear.includes(query) ||
      startDateString.includes(query) ||
      endMonthFull.includes(query) ||
      endMonthShort.includes(query) ||
      endYear.includes(query) ||
      endDateString.includes(query)
    );

    const matchedDays = (journey.itineraryDays || []).filter(day => {
      const dayDate = day.date ? new Date(day.date) : null;
      const dayDateString = dayDate ? dayDate.toLocaleDateString('en-US').toLowerCase() : '';
      const dayDateISO = (day.date || '').toLowerCase();
      const dayMonthFull = dayDate ? dayDate.toLocaleString('en-US', { month: 'long' }).toLowerCase() : '';
      const dayMonthShort = dayDate ? dayDate.toLocaleString('en-US', { month: 'short' }).toLowerCase() : '';
      const dayYear = dayDate ? dayDate.getFullYear().toString() : '';
      const dayCity = (day.city_destination || '').toLowerCase();
      const dayNotes = (day.notes || '').toLowerCase();

      const dayMatch = (
        dayDateString.includes(query) ||
        dayDateISO.includes(query) ||
        dayMonthFull.includes(query) ||
        dayMonthShort.includes(query) ||
        dayYear.includes(query) ||
        dayCity.includes(query) ||
        dayNotes.includes(query)
      );

      if (dayMatch) return true;

      const activityMatch = (day.activities || []).some(activity => {
        const activityName = (activity.name || '').toLowerCase();
        const activityDescription = (activity.description || '').toLowerCase();
        const activityTime = (activity.time || '').toLowerCase();
        return activityName.includes(query) || activityDescription.includes(query) || activityTime.includes(query);
      });

      const accommodationMatch = (day.accommodations || []).some(accommodation => {
        const accommodationName = (accommodation.name || '').toLowerCase();
        const accommodationLocation = (accommodation.location || '').toLowerCase();
        return accommodationName.includes(query) || accommodationLocation.includes(query);
      });

      const diningMatch = (day.dining || []).some(dining => {
        const mealType = (dining.meal_type || '').toLowerCase();
        const restaurantName = (dining.restaurant_name || '').toLowerCase();
        const location = (dining.location || '').toLowerCase();
        return mealType.includes(query) || restaurantName.includes(query) || location.includes(query);
      });

      const transportationMatch = (day.transportation || []).some(transport => {
        const type = (transport.type || '').toLowerCase();
        const details = (transport.details || '').toLowerCase();
        return type.includes(query) || details.includes(query);
      });

      return activityMatch || accommodationMatch || diningMatch || transportationMatch;
    });

    const hasMatch = topLevelMatch || matchedDays.length > 0;

    return {
      ...journey,
      matchedDays: matchedDays.length > 0 ? matchedDays : undefined,
      _shouldDisplay: hasMatch
    };
  })
  .filter(journey => journey._shouldDisplay !== false)
  .sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (a.pinned && b.pinned) {
      const pinnedA = new Date(a.pinned_at || 0).getTime();
      const pinnedB = new Date(b.pinned_at || 0).getTime();
      return pinnedB - pinnedA;
    }

    let comparison = 0;
    if (sortBy === 'date') {
      const dateA = new Date(a.start_date || 0).getTime();
      const dateB = new Date(b.start_date || 0).getTime();
      comparison = dateB - dateA;
    } else if (sortBy === 'alphabetical') {
      comparison = (a.journey_name || '').localeCompare(b.journey_name || '');
    } else if (sortBy === 'client') {
      const customerA = (a.customers as any)?.name || '';
      const customerB = (b.customers as any)?.name || '';
      comparison = customerA.localeCompare(customerB);
    }
    return sortDirection === 'asc' ? -comparison : comparison;
  });

  if (selectedJourney) {
    return (
      <JourneyManager
        journey={selectedJourney}
        onBack={() => {
          setSelectedJourney(null);
          fetchJourneys();
        }}
        onUpdate={async () => {
          await fetchJourneys();
          const { data, error } = await supabase
            .from('journeys')
            .select('id, customer_id, journey_name, description, start_date, end_date, duration_days, created_by, status, is_template, template_name, is_driver_copy, is_guide_copy, is_pinned, is_deleted, created_at, updated_at, is_archived, pinned_at, pinned')
            .eq('id', selectedJourney.id)
            .maybeSingle();

          if (data && !error) {
            setSelectedJourney(data);
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-brand-off-white">
      <header className="bg-white border-b border-gray-200 safe-area-padding shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-3">
          <div className="grid grid-cols-3 items-center gap-2 md:gap-3">
            {/* Section 1: Logo Only */}
            <div className="flex items-center justify-start">
              <img
                src="/desert_paths_logo.png"
                alt="Desert Paths"
                className="h-8 sm:h-10 md:h-12 w-auto flex-shrink-0"
              />
            </div>

            {/* Section 2: Title Centered */}
            <div className="flex flex-col items-center justify-center text-center">
              <h1 className="text-sm sm:text-base md:text-xl font-bold text-brand-charcoal text-sharp leading-tight">Journey Management</h1>
              <p className="text-xs text-brand-brown-light font-medium enhanced-text hidden sm:block">Admin Dashboard</p>
            </div>

            {/* Section 3: User Menu */}
            <div className="flex items-center justify-end">
              <UserMenu variant="admin" />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex gap-1 bg-white rounded-lg p-1 border border-brand-gray-3 mb-4 shadow-sm">
            <button
              onClick={() => setActiveTab('journeys')}
              className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                activeTab === 'journeys'
                  ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                  : 'text-brand-brown hover:bg-brand-gray-4'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Journeys</span>
            </button>
            {userProfile?.role === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('database')}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                    activeTab === 'database'
                      ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                      : 'text-brand-brown hover:bg-brand-gray-4'
                  }`}
                >
                  <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Database</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('users');
                    setUsersSubtab('users');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                    activeTab === 'users'
                      ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                      : 'text-brand-brown hover:bg-brand-gray-4'
                  }`}
                >
                  <UserCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Users</span>
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                    activeTab === 'settings'
                      ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                      : 'text-brand-brown hover:bg-brand-gray-4'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Settings</span>
                </button>
                <button
                  onClick={() => setActiveTab('guideline')}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                    activeTab === 'guideline'
                      ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                      : 'text-brand-brown hover:bg-brand-gray-4'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">User Manual</span>
                </button>
              </>
            )}
          </div>

          {/* Journeys Sub-Navigation */}
          {activeTab === 'journeys' && (
            <div className="flex gap-1 bg-white rounded-lg p-1 border border-brand-gray-3 shadow-sm">
              <button
                onClick={() => setJourneysSubtab('all')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                  journeysSubtab === 'all'
                    ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                    : 'text-brand-brown hover:bg-brand-gray-4'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">All Journeys</span>
              </button>
              {userProfile?.role === 'admin' && (
                <button
                  onClick={() => {
                    setJourneysSubtab('templates');
                    setEditingTemplateId(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                    journeysSubtab === 'templates'
                      ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                      : 'text-brand-brown hover:bg-brand-gray-4'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Templates</span>
                </button>
              )}
              <button
                onClick={() => setJourneysSubtab('shared')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                  journeysSubtab === 'shared'
                    ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                    : 'text-brand-brown hover:bg-brand-gray-4'
                }`}
              >
                <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Shared with Me</span>
              </button>
              {userProfile?.role === 'admin' && (
                <button
                  onClick={() => setJourneysSubtab('trash')}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                    journeysSubtab === 'trash'
                      ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                      : 'text-brand-brown hover:bg-brand-gray-4'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Trash</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Users Sub-Navigation */}
        {userProfile?.role === 'admin' && activeTab === 'users' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 mb-4">
            <div className="flex gap-1 bg-white rounded-lg p-1 border border-brand-gray-3 shadow-sm">
              <button
                onClick={() => setUsersSubtab('users')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                  usersSubtab === 'users'
                    ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                    : 'text-brand-brown hover:bg-brand-gray-4'
                }`}
              >
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Users Management</span>
              </button>
              <button
                onClick={() => setUsersSubtab('guide-copies')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                  usersSubtab === 'guide-copies'
                    ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                    : 'text-brand-brown hover:bg-brand-gray-4'
                }`}
              >
                <BookCopy className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Guide Copies</span>
              </button>
              <button
                onClick={() => setUsersSubtab('guide-access')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                  usersSubtab === 'guide-access'
                    ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                    : 'text-brand-brown hover:bg-brand-gray-4'
                }`}
              >
                <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Guide Access</span>
              </button>
            </div>
          </div>
        )}

        {/* Database Sub-Navigation */}
        {userProfile?.role === 'admin' && activeTab === 'database' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 mb-4">
            <div className="flex gap-1 bg-white rounded-lg p-1 border border-brand-gray-3 shadow-sm">
              <button
                onClick={() => setDatabaseSubtab('staff')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                  databaseSubtab === 'staff'
                    ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                    : 'text-brand-brown hover:bg-brand-gray-4'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Staff</span>
              </button>
              <button
                onClick={() => setDatabaseSubtab('clients')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                  databaseSubtab === 'clients'
                    ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                    : 'text-brand-brown hover:bg-brand-gray-4'
                }`}
              >
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Clients</span>
              </button>
              <button
                onClick={() => setDatabaseSubtab('providers')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                  databaseSubtab === 'providers'
                    ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                    : 'text-brand-brown hover:bg-brand-gray-4'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Providers</span>
              </button>
              <button
                onClick={() => setDatabaseSubtab('vehicles')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                  databaseSubtab === 'vehicles'
                    ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                    : 'text-brand-brown hover:bg-brand-gray-4'
                }`}
              >
                <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Vehicles</span>
              </button>
              <button
                onClick={() => setDatabaseSubtab('gear')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                  databaseSubtab === 'gear'
                    ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                    : 'text-brand-brown hover:bg-brand-gray-4'
                }`}
              >
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Gear</span>
              </button>
              <button
                onClick={() => setDatabaseSubtab('hotels')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                  databaseSubtab === 'hotels'
                    ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                    : 'text-brand-brown hover:bg-brand-gray-4'
                }`}
              >
                <Hotel className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Hotels</span>
              </button>
              <button
                onClick={() => setDatabaseSubtab('restaurants')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                  databaseSubtab === 'restaurants'
                    ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                    : 'text-brand-brown hover:bg-brand-gray-4'
                }`}
              >
                <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Restaurants</span>
              </button>
              <button
                onClick={() => setDatabaseSubtab('sites')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                  databaseSubtab === 'sites'
                    ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                    : 'text-brand-brown hover:bg-brand-gray-4'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Touristic Sites</span>
              </button>
            </div>
          </div>
        )}

        {/* Settings Sub-Navigation */}
        {userProfile?.role === 'admin' && activeTab === 'settings' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 mb-4">
            <div className="flex gap-1 bg-white rounded-lg p-1 border border-brand-gray-3 shadow-sm">
              <button
                onClick={() => setSettingsSubtab('activities')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                  settingsSubtab === 'activities'
                    ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                    : 'text-brand-brown hover:bg-brand-gray-4'
                }`}
              >
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Time Periods</span>
              </button>
              <button
                onClick={() => setSettingsSubtab('pricing')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 sm:px-4 py-2 rounded-md font-medium transition-colors text-xs sm:text-sm ${
                  settingsSubtab === 'pricing'
                    ? 'bg-brand-orange bg-opacity-90 text-white shadow-sm border border-brand-orange'
                    : 'text-brand-brown hover:bg-brand-gray-4'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Pricing</span>
                <span className="ml-1 px-1.5 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full hidden sm:inline">
                  Soon
                </span>
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activeTab === 'users' ? (
          usersSubtab === 'guide-copies' ? (
            <GuideCopiesView />
          ) : usersSubtab === 'guide-access' ? (
            <GuideAccessView />
          ) : (
            <UserManagement
              onNavigateToTrip={(journeyId) => {
                const journey = journeys.find(t => t.id === journeyId);
                if (journey) {
                  setSelectedJourney(journey);
                  setActiveTab('journeys');
                  setJourneysSubtab('all');
                }
              }}
            />
          )
        ) : activeTab === 'guideline' ? (
          <GuidelineTab />
        ) : activeTab === 'settings' ? (
          <SettingsDashboard activeSection={settingsSubtab} />
        ) : activeTab === 'database' ? (
          <DatabaseManagement activeSection={databaseSubtab} />
        ) : activeTab === 'journeys' ? (
          journeysSubtab === 'templates' ? (
            editingTemplateId ? (
              <TemplateEditor
                templateId={editingTemplateId}
                onBack={() => setEditingTemplateId(null)}
              />
            ) : (
              <TemplateManager
                onEditTemplate={(id) => setEditingTemplateId(id)}
                onSwitchToTrips={() => {
                  setJourneysSubtab('all');
                  fetchJourneys();
                }}
              />
            )
          ) : journeysSubtab === 'shared' ? (
            <SharedJourneysView />
          ) : journeysSubtab === 'trash' ? (
            <TrashView />
          ) : (
          <>
            <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-brand-charcoal text-sharp flex items-center gap-2">
                <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-brand-terracotta" />
                Journey Management
              </h2>
              <p className="text-sm text-brand-chocolate mt-1">
                Create, edit, and manage journey itineraries
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => setShowExcelImport(true)}
                className="btn-enhanced flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-white hover:bg-brand-cream-dark text-brand-brown-warm border-2 border-gray-300 hover:border-brand-brown-warm rounded-lg touch-target font-semibold"
              >
                <FileSpreadsheet className="w-5 h-5 stroke-2" />
                <span className="text-sm sm:text-base enhanced-text">Import from Excel</span>
              </button>
              <button
                onClick={() => setShowNewCustomer(true)}
                className="btn-enhanced flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-brand-terracotta hover:bg-brand-terracotta-dark text-white rounded-lg touch-target font-semibold"
              >
                <Plus className="w-5 h-5 stroke-2" />
                <span className="text-sm sm:text-base enhanced-text">New Journey</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-brand-brown-light mb-1">Sort By</label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'alphabetical' | 'client')}
                  className="flex-1 px-3 py-2 text-sm text-brand-charcoal bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent shadow-soft"
                >
                  <option value="date">Start Date</option>
                  <option value="alphabetical">Alphabetically</option>
                  <option value="client">Client Name</option>
                </select>
                <button
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-brand-brown-light mb-1">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm text-brand-charcoal bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent shadow-soft"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="planning">Planning</option>
                <option value="confirmed">Confirmed</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="fully_paid">Fully Paid</option>
                <option value="live">LIVE</option>
                <option value="completed">Completed</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-brand-brown-light" />
            <input
              type="text"
              placeholder="Deep search: customer, city, date, activity, accommodation, dining, or any detail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-base sm:text-sm text-brand-charcoal bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-terracotta focus:border-transparent shadow-soft transition-shadow"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-brand-brown-light">Loading journeys...</p>
          </div>
        ) : filteredJourneys.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-soft">
            <Calendar className="w-12 h-12 text-brand-brown-light mx-auto mb-4" />
            <p className="text-brand-brown-light mb-4">No journeys found</p>
            <button
              onClick={() => setShowNewCustomer(true)}
              className="btn-enhanced inline-flex items-center space-x-2 px-5 py-3 bg-brand-terracotta hover:bg-brand-terracotta-dark text-white rounded-lg font-semibold"
            >
              <Plus className="w-5 h-5 stroke-2" />
              <span className="enhanced-text">Create First Journey</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredJourneys.map((journey) => {
              const customerData: any = journey.customers;
              const creatorData: any = journey.creator;
              return (
                <div
                  key={journey.id}
                  className="card-enhanced rounded-xl transition-all duration-300 group flex flex-col overflow-hidden relative border border-enhanced"
                >
                  {journey.unreadGuideUploads && journey.unreadGuideUploads > 0 && (
                    <div className="absolute top-2 right-2 z-10">
                      <div className="relative">
                        <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                          <span className="text-white text-xs font-bold">{journey.unreadGuideUploads}</span>
                        </div>
                        <div className="absolute inset-0 w-6 h-6 bg-red-500 rounded-full animate-ping opacity-75"></div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
                    <span
                      className={`status-badge-enhanced rounded-full whitespace-nowrap ${
                        journey.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : journey.status === 'live'
                          ? 'bg-blue-100 text-blue-800'
                          : journey.status === 'fully_paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : journey.status === 'partially_paid'
                          ? 'bg-teal-100 text-teal-800'
                          : journey.status === 'confirmed'
                          ? 'bg-indigo-100 text-indigo-800'
                          : journey.status === 'draft'
                          ? 'bg-slate-100 text-slate-700'
                          : journey.status === 'canceled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {journey.status === 'live' ? 'LIVE' : journey.status === 'partially_paid' ? 'Partially Paid' : journey.status === 'fully_paid' ? 'Fully Paid' : journey.status.charAt(0).toUpperCase() + journey.status.slice(1)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePinJourney(journey.id, journey.pinned || false);
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        journey.pinned
                          ? 'bg-brand-terracotta text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={journey.pinned ? 'Unpin journey' : 'Pin journey to top'}
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                  </div>

                  <div
                    onClick={() => setSelectedJourney(journey)}
                    className="cursor-pointer flex-1 px-4 sm:px-6 py-2 sm:py-3"
                  >
                    <div className="mb-3">
                      <div className="flex items-center gap-2 text-sm sm:text-base text-brand-charcoal mb-2 font-semibold">
                        <Users className="w-4 h-4 sm:w-4.5 sm:h-4.5 flex-shrink-0 stroke-2.5" />
                        <span className="truncate enhanced-text">{customerData?.name}</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-brand-charcoal group-hover:text-brand-terracotta transition-colors text-sharp line-clamp-2 min-h-[2.5rem]">
                        {journey.journey_name}
                      </h3>
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex items-center gap-2 text-brand-brown-light font-medium">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 stroke-2" />
                        <span className="truncate enhanced-text">
                          {new Date(journey.start_date).toLocaleDateString()} - {new Date(journey.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-brand-brown-light font-medium">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 stroke-2" />
                        <span className="enhanced-text">{journey.duration_days} days</span>
                      </div>
                      {journey.passenger_count && (
                        <div className="flex items-center gap-2 text-brand-brown-light font-medium">
                          <UserCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 stroke-2" />
                          <span className="enhanced-text">{journey.passenger_count} {journey.passenger_count === 1 ? 'participant' : 'participants'}</span>
                        </div>
                      )}
                      {creatorData && (
                        <div className="flex items-center gap-2 text-brand-brown-light font-medium text-xs">
                          <span className="enhanced-text">
                            Created {new Date(journey.created_at).toLocaleDateString()} by {creatorData.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {journey.matchedDays && journey.matchedDays.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <div className="text-xs font-semibold text-brand-terracotta mb-2">
                          Matched Days ({journey.matchedDays.length}):
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {journey.matchedDays.map((day) => (
                            <div
                              key={day.id}
                              className="bg-brand-cream bg-opacity-50 rounded-lg p-2 text-xs"
                            >
                              <div className="font-semibold text-brand-charcoal mb-1">
                                Day {day.day_number}: {day.city_destination}
                              </div>
                              <div className="text-brand-brown-light">
                                {new Date(day.date).toLocaleDateString()}
                              </div>
                              {day.activities && day.activities.length > 0 && (
                                <div className="mt-1 text-brand-brown-warm">
                                  {day.activities.length} activity(ies)
                                </div>
                              )}
                              {day.accommodations && day.accommodations.length > 0 && (
                                <div className="text-brand-brown-warm">
                                  Accommodation: {day.accommodations[0].name}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-end gap-1 sm:gap-2 bg-gray-50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSaveTemplateModal({ isOpen: true, journey });
                      }}
                      className="btn-enhanced p-2 sm:p-2.5 text-brand-brown-warm hover:text-white hover:bg-brand-cyan rounded-lg touch-manipulation border border-transparent hover:border-brand-cyan"
                      title="Save as template"
                    >
                      <BookTemplate className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-2" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareJourneyModal({ isOpen: true, journey });
                      }}
                      className="btn-enhanced p-2 sm:p-2.5 text-brand-brown-warm hover:text-white hover:bg-brand-terracotta rounded-lg touch-manipulation border border-transparent hover:border-brand-terracotta"
                      title="Share journey"
                    >
                      <Share2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-2" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDuplicateJourneyModal({ isOpen: true, journey });
                      }}
                      className="btn-enhanced p-2 sm:p-2.5 text-brand-brown-warm hover:text-white hover:bg-brand-brown-warm rounded-lg touch-manipulation border border-transparent hover:border-brand-brown-warm"
                      title="Duplicate journey"
                    >
                      <Copy className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-2" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteJourneyDialog({ isOpen: true, journey });
                      }}
                      className="btn-enhanced p-2 sm:p-2.5 text-brand-brown-warm hover:text-white hover:bg-red-600 rounded-lg touch-manipulation border border-transparent hover:border-red-600"
                      title="Move to trash"
                    >
                      <Trash2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-2" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </>
          )
        ) : null}
      </main>

      {showNewCustomer && (
        <CreateJourneyWithTemplate
          customers={customers}
          onClose={() => {
            setShowNewCustomer(false);
            fetchCustomers();
            fetchJourneys();
          }}
        />
      )}

      {showExcelImport && (
        <NewJourneyExcelImport
          onClose={() => setShowExcelImport(false)}
          onSuccess={() => {
            setShowExcelImport(false);
            fetchCustomers();
            fetchJourneys();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={deleteJourneyDialog.isOpen}
        onClose={() => setDeleteJourneyDialog({ isOpen: false, journey: null })}
        onConfirm={handleArchiveJourney}
        title="Move to Trash"
        message={`Are you sure you want to move "${deleteJourneyDialog.journey?.journey_name}" to trash? The journey will be hidden from your active journeys but can be restored later from the Trash tab.`}
        confirmText="Move to Trash"
        type="danger"
      />

      {duplicateJourneyModal.isOpen && duplicateJourneyModal.journey && (
        <DuplicateJourneyModal
          trip={duplicateJourneyModal.journey}
          onClose={() => setDuplicateJourneyModal({ isOpen: false, journey: null })}
          onSuccess={() => {
            fetchJourneys();
            setDuplicateJourneyModal({ isOpen: false, journey: null });
          }}
        />
      )}

      {shareJourneyModal.isOpen && shareJourneyModal.journey && (
        <SimplifiedShareModal
          journeyId={shareJourneyModal.journey.id}
          journeyName={shareJourneyModal.journey.journey_name}
          onClose={() => setShareJourneyModal({ isOpen: false, journey: null })}
        />
      )}

      {saveTemplateModal.isOpen && saveTemplateModal.journey && (
        <SaveAsTemplateModal
          journeyName={saveTemplateModal.journey.journey_name}
          onSave={handleSaveAsTemplate}
          onClose={() => setSaveTemplateModal({ isOpen: false, journey: null })}
          saving={savingTemplate}
        />
      )}
    </div>
  );
}

interface SaveAsTemplateModalProps {
  journeyName: string;
  onSave: (templateName: string) => void;
  onClose: () => void;
  saving: boolean;
}

function SaveAsTemplateModal({ journeyName, onSave, onClose, saving }: SaveAsTemplateModalProps) {
  const [templateName, setTemplateName] = useState(`${journeyName} Template`);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (templateName.trim()) {
      onSave(templateName.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-brand-brown bg-opacity-20 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Save as Template</h2>
          <p className="text-slate-600 mt-1">Create a reusable template from this trip</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Template Name
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
              placeholder="Enter template name"
              required
              disabled={saving}
            />
            <p className="text-xs text-slate-500 mt-2">
              This will copy all days, activities, dining, and accommodations to the template.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <BookTemplate className="w-4 h-4" />
                  <span>Save Template</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
