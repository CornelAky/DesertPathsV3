import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Plus, Hotel, Truck, Activity as ActivityIcon, Utensils, CreditCard as Edit, Trash2, MapPin, Clock, CheckCircle, XCircle, FileText, Upload, GripVertical, Copy, MoreVertical, DollarSign, Image as ImageIcon, File, ExternalLink, Eye, EyeOff, Moon, Sunrise, Home, ChevronLeft, ChevronRight, Users, X, Phone, Calendar, Check, UserCircle, Download, FileSpreadsheet } from 'lucide-react';
import type { Journey, ItineraryDay, Accommodation, Activity, Dining, Transportation, Document } from '../../lib/database.types';
import AccommodationModal from './AccommodationModal';
import TransportationModal from './TransportationModal';
import ActivityModal from './ActivityModal';
import BulkActivityModal from './BulkActivityModal';
import PremiumTransportationCard from '../shared/PremiumTransportationCard';
import BulkAccommodationModal from './BulkAccommodationModal';
import BulkDiningModal from './BulkDiningModal';
import DiningModal from './DiningModal';
import { ConfirmDialog } from './ConfirmDialog';
import { DayStaffAssignmentModal } from './DayStaffAssignmentModal';
import { useAuth } from '../../contexts/AuthContext';
import { ImageLightbox } from '../shared/ImageLightbox';
import PremiumActivityCard from '../shared/PremiumActivityCard';
import PremiumDiningCard from '../shared/PremiumDiningCard';
import PremiumAccommodationCard from '../shared/PremiumAccommodationCard';
import { exportSingleDayToPDF, exportSingleDayToExcel } from '../../lib/exportUtils';

interface DayEditorProps {
  day: ItineraryDay;
  journey: Journey;
  onBack: () => void;
  onHome?: () => void;
  allDays?: ItineraryDay[];
  onNavigate?: (day: ItineraryDay) => void;
}

interface BookingFeeSummary {
  [activityId: string]: {
    totalAmount: number;
    currency: string;
    hasUnpaidFees: boolean;
  };
}

interface ImageAttachment {
  id?: string;
  file_name: string;
  file_url: string;
  file_path?: string;
  activity_id?: string;
  dining_id?: string;
  accommodation_id?: string;
  created_at?: string;
  uploaded_at?: string;
}

interface BookingFee {
  id?: string;
  activity_id?: string;
  amount: number;
  currency: string;
  fee_type: string;
  payment_status: string;
  created_at?: string;
  updated_at?: string;
}

export default function DayEditor({ day, journey, onBack, onHome, allDays = [], onNavigate }: DayEditorProps) {
  const { userProfile } = useAuth();
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [transportation, setTransportation] = useState<Transportation[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [dining, setDining] = useState<Dining[]>([]);
  const [bookingFees, setBookingFees] = useState<BookingFeeSummary>({});
  const [documents, setDocuments] = useState<Record<string, Document[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingDay, setEditingDay] = useState(false);
  const [cityDestination, setCityDestination] = useState(day.city_destination);
  const [isCompleted, setIsCompleted] = useState(day.is_completed);
  const [draggedActivityId, setDraggedActivityId] = useState<string | null>(null);
  const [draggedDiningId, setDraggedDiningId] = useState<string | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  const [showDayMenu, setShowDayMenu] = useState(false);
  const [dayStaff, setDayStaff] = useState<Array<{ name: string; role: string; phone?: string }>>([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [dayGuides, setDayGuides] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [lightbox, setLightbox] = useState<{ isOpen: boolean; images: ImageAttachment[]; currentIndex: number }>({
    isOpen: false,
    images: [],
    currentIndex: 0,
  });
  const [sectionToggles, setSectionToggles] = useState({
    early_morning: day.early_morning_section_enabled ?? true,
    breakfast: day.breakfast_section_enabled ?? true,
    morning: true,
    lunch: day.lunch_section_enabled ?? true,
    afternoon: true,
    dinner: day.dinner_section_enabled ?? true,
    night: day.night_section_enabled ?? true,
  });

  const isManagerOrAdmin = userProfile?.role === 'manager' || userProfile?.role === 'admin';

  const currentDayIndex = allDays.findIndex(d => d.id === day.id);
  const hasPreviousDay = currentDayIndex > 0;
  const hasNextDay = currentDayIndex >= 0 && currentDayIndex < allDays.length - 1;
  const previousDay = hasPreviousDay ? allDays[currentDayIndex - 1] : null;
  const nextDay = hasNextDay ? allDays[currentDayIndex + 1] : null;

  const getActivityTimeCategory = (time: string | null): 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night' => {
    if (!time) return 'morning';
    const [hours] = time.split(':').map(Number);
    if (hours < 7) return 'early_morning';
    if (hours < 12) return 'morning';
    if (hours < 18) return 'afternoon';
    if (hours < 21) return 'evening';
    return 'night';
  };

  const [showAccommodationModal, setShowAccommodationModal] = useState(false);
  const [showBulkAccommodationModal, setShowBulkAccommodationModal] = useState(false);
  const [showTransportationModal, setShowTransportationModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showBulkActivityModal, setShowBulkActivityModal] = useState(false);
  const [showDiningModal, setShowDiningModal] = useState(false);
  const [showBulkDiningModal, setShowBulkDiningModal] = useState(false);
  const [editingAccommodation, setEditingAccommodation] = useState<Accommodation | undefined>();
  const [editingTransportation, setEditingTransportation] = useState<Transportation | undefined>();
  const [editingActivity, setEditingActivity] = useState<Activity | undefined>();
  const [editingDining, setEditingDining] = useState<Dining | undefined>();
  const [activitySection, setActivitySection] = useState<'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night'>('morning');
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    table: string;
    id: string;
    name: string;
    type: string;
  }>({
    isOpen: false,
    table: '',
    id: '',
    name: '',
    type: '',
  });

  useEffect(() => {
    fetchDayData();
    fetchDayGuides();
    fetchStaffData();
    setIsCompleted(day.is_completed);
    setCityDestination(day.city_destination);
  }, [day.id, day.is_completed, day.city_destination]);

  const fetchStaffData = async () => {
    try {
      const { data: staffData, error } = await supabase
        .from('journey_staff_day_assignments')
        .select('journey_staff(name, role, role_custom, phone)')
        .eq('day_id', day.id);

      if (error) {
        console.error('Error fetching staff data:', error);
        return;
      }

      if (staffData) {
        const staffList = staffData
          .filter(item => item.journey_staff)
          .map(item => ({
            name: (item.journey_staff as any).name,
            role: (item.journey_staff as any).role_custom || (item.journey_staff as any).role,
            phone: (item.journey_staff as any).phone,
          }));
        setDayStaff(staffList);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  };

  const fetchDayGuides = async () => {
    try {
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
        .eq('day_id', day.id);

      if (error) {
        console.error('Error fetching day guides:', error);
        return;
      }

      if (dayShares) {
        const guides = dayShares
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
          new Map(guides.map(g => [g.id, g])).values()
        );

        setDayGuides(uniqueGuides);
      }
    } catch (err) {
      console.error('Error fetching day guides:', err);
    }
  };

  const fetchDayData = async () => {
    try {
      const [accomData, transData, actData, diningData] = await Promise.all([
        supabase.from('accommodations').select('id, day_id, hotel_name, location_address, check_in_time, check_out_time, access_method, confirmation_number, guide_notes, booking_status, payment_status, payment_type, payment_amount, breakfast_included, lunch_location, dinner_location, is_completed, images, created_at, updated_at').eq('day_id', day.id),
        supabase.from('transportation').select('id, day_id, contact_details, car_type, notes, pickup_time, dropoff_time, pickup_location, dropoff_location, pickup_location_link, dropoff_location_link, is_completed, images, created_at, updated_at').eq('day_id', day.id),
        supabase.from('activities').select('id, day_id, activity_name, activity_time, location, guide_notes, booking_status, paid_by, payment_status, access_method, is_completed, duration_minutes, display_order, images, created_at, updated_at, activity_booking_fees(id, activity_id, amount, currency, status, booking_required, guest_count, staff_count)').eq('day_id', day.id).order('display_order', { ascending: true }),
        supabase.from('dining').select('id, day_id, meal_type, restaurant_name, location_address, reservation_time, guide_notes, confirmation_status, paid_by, payment_status, payment_amount, dietary_restrictions, is_completed, display_order, images, created_at, updated_at').eq('day_id', day.id).order('display_order', { ascending: true }),
      ]);

      if (accomData.error) throw accomData.error;
      if (transData.error) throw transData.error;
      if (actData.error) throw actData.error;
      if (diningData.error) throw diningData.error;

      setAccommodations(accomData.data || []);
      setTransportation(transData.data || []);
      setActivities(actData.data || []);
      setDining(diningData.data || []);

      fetchStaffData();

      const allIds = [
        ...(accomData.data || []).map(a => ({ id: a.id, type: 'accommodation' as const })),
        ...(actData.data || []).map(a => ({ id: a.id, type: 'activity' as const })),
        ...(diningData.data || []).map(d => ({ id: d.id, type: 'dining' as const })),
      ];

      if (allIds.length > 0) {
        const { data: docsData, error: docsError } = await supabase
          .from('documents')
          .select('id, related_id, file_name, file_url, document_type, created_at')
          .in('related_id', allIds.map(item => item.id));

        if (!docsError && docsData) {
          const docsByRelatedId: Record<string, Document[]> = {};
          docsData.forEach(doc => {
            if (!docsByRelatedId[doc.related_id]) {
              docsByRelatedId[doc.related_id] = [];
            }
            docsByRelatedId[doc.related_id].push(doc);
          });
          setDocuments(docsByRelatedId);
        }
      }

      if (isManagerOrAdmin && actData.data && actData.data.length > 0) {
        const activityIds = actData.data.map(a => a.id);
        const { data: fees, error: feesError } = await supabase
          .from('activity_booking_fees')
          .select('activity_id, amount, currency, status, booking_required')
          .in('activity_id', activityIds);

        if (!feesError && fees) {
          const summary: BookingFeeSummary = {};
          fees.forEach(fee => {
            if (!summary[fee.activity_id]) {
              summary[fee.activity_id] = {
                totalAmount: 0,
                currency: fee.currency,
                hasUnpaidFees: false,
              };
            }
            summary[fee.activity_id].totalAmount += Number(fee.amount);
            if (fee.booking_required && fee.status !== 'booked') {
              summary[fee.activity_id].hasUnpaidFees = true;
            }
          });
          setBookingFees(summary);
        }
      }
    } catch (error) {
      console.error('Error fetching day data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDayDestination = async () => {
    try {
      const { error } = await supabase
        .from('itinerary_days')
        .update({ city_destination: cityDestination })
        .eq('id', day.id);

      if (error) throw error;
      setEditingDay(false);
    } catch (error) {
      console.error('Error updating day:', error);
      alert('Failed to update destination');
    }
  };

  const confirmDeleteItem = async () => {
    try {
      const { error } = await supabase
        .from(deleteDialog.table)
        .delete()
        .eq('id', deleteDialog.id);

      if (error) throw error;
      await fetchDayData();
      setDeleteDialog({ isOpen: false, table: '', id: '', name: '', type: '' });
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const openDeleteDialog = (table: string, id: string, name: string, type: string) => {
    setDeleteDialog({
      isOpen: true,
      table,
      id,
      name,
      type,
    });
  };

  const handleDuplicateActivity = async (activity: Activity) => {
    try {
      const { id, created_at, updated_at, activity_booking_fees, images, ...activityData } = activity as Activity & { activity_booking_fees?: BookingFee[]; images?: ImageAttachment[] };

      const { data: newActivity, error: activityError } = await supabase
        .from('activities')
        .insert({
          ...activityData,
          activity_name: `${activityData.activity_name} (Copy)`
        })
        .select()
        .single();

      if (activityError) throw activityError;

      if (activity_booking_fees && Array.isArray(activity_booking_fees) && activity_booking_fees.length > 0) {
        const newBookingFees = activity_booking_fees.map((fee) => {
          const { id, activity_id, created_at, updated_at, ...feeData } = fee;
          return {
            ...feeData,
            activity_id: newActivity.id
          };
        });

        const { error: feesError } = await supabase
          .from('activity_booking_fees')
          .insert(newBookingFees);

        if (feesError) throw feesError;
      }

      if (images && Array.isArray(images) && images.length > 0) {
        const newImages = images.map((img) => {
          const { id, activity_id, created_at, uploaded_at, ...imgData } = img;
          return {
            ...imgData,
            activity_id: newActivity.id
          };
        });

        const { error: imagesError } = await supabase
          .from('activity_attachments')
          .insert(newImages);

        if (imagesError) console.error('Error duplicating activity attachments:', imagesError);
      }

      await fetchDayData();
      alert('Activity duplicated successfully');
    } catch (error) {
      console.error('Error duplicating activity:', error);
      alert(`Failed to duplicate activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };


  // Enhanced drag and drop handlers for activities with cross-section support
  const handleActivityDragStart = (activityId: string) => {
    setDraggedActivityId(activityId);
  };

  const handleActivityDragOver = (e: React.DragEvent, section?: string) => {
    e.preventDefault();
    if (section) {
      setDragOverSection(section);
    }
  };

  const handleActivityDragEnd = () => {
    setDraggedActivityId(null);
    setDragOverSection(null);
  };

  const handleSectionDrop = async (section: 'early_morning' | 'morning' | 'afternoon' | 'night') => {
    if (!draggedActivityId) return;

    const draggedActivity = activities.find(a => a.id === draggedActivityId);
    if (!draggedActivity) {
      setDraggedActivityId(null);
      setDragOverSection(null);
      return;
    }

    let newTime = draggedActivity.activity_time;
    switch (section) {
      case 'early_morning':
        newTime = '05:00';
        break;
      case 'morning':
        newTime = '09:00';
        break;
      case 'afternoon':
        newTime = '14:00';
        break;
      case 'night':
        newTime = '20:00';
        break;
    }

    try {
      const { error } = await supabase
        .from('activities')
        .update({ activity_time: newTime })
        .eq('id', draggedActivityId);

      if (error) throw error;
      await fetchDayData();
    } catch (error) {
      console.error('Error moving activity:', error);
      alert('Failed to move activity');
    }

    setDraggedActivityId(null);
    setDragOverSection(null);
  };

  const handleActivityDrop = async (targetActivityId: string) => {
    if (!draggedActivityId || draggedActivityId === targetActivityId) {
      setDraggedActivityId(null);
      return;
    }

    const draggedActivity = activities.find(a => a.id === draggedActivityId);
    const targetActivity = activities.find(a => a.id === targetActivityId);

    if (!draggedActivity || !targetActivity) {
      setDraggedActivityId(null);
      return;
    }

    const draggedSection = getActivityTimeCategory(draggedActivity.activity_time);
    const targetSection = getActivityTimeCategory(targetActivity.activity_time);

    if (draggedSection !== targetSection) {
      const confirmed = window.confirm(
        `Moving this activity will change its time from ${draggedActivity.activity_time || 'unset'} to match the ${targetSection} section (around ${targetActivity.activity_time}). Do you want to continue?\n\nClick OK to change time and move, or Cancel to keep current time.`
      );

      try {
        if (confirmed) {
          await supabase
            .from('activities')
            .update({ activity_time: targetActivity.activity_time })
            .eq('id', draggedActivityId);
        }

        await fetchDayData();
      } catch (error) {
        console.error('Error moving activity:', error);
        alert('Failed to move activity');
        await fetchDayData();
      }
    } else {
      const draggedIndex = activities.findIndex(a => a.id === draggedActivityId);
      const targetIndex = activities.findIndex(a => a.id === targetActivityId);

      if (draggedIndex === -1 || targetIndex === -1) {
        setDraggedActivityId(null);
        return;
      }

      const newActivities = [...activities];
      const [movedActivity] = newActivities.splice(draggedIndex, 1);
      newActivities.splice(targetIndex, 0, movedActivity);

      try {
        const updates = newActivities.map((activity, index) =>
          supabase
            .from('activities')
            .update({ display_order: index })
            .eq('id', activity.id)
        );

        await Promise.all(updates);
        setActivities(newActivities);
      } catch (error) {
        console.error('Error reordering activities:', error);
        alert('Failed to reorder activities');
        await fetchDayData();
      }
    }

    setDraggedActivityId(null);
  };

  // Drag and drop handlers for dining
  const handleDiningDragStart = (diningId: string) => {
    setDraggedDiningId(diningId);
  };

  const handleDiningDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDiningDrop = async (targetDiningId: string) => {
    if (!draggedDiningId || draggedDiningId === targetDiningId) {
      setDraggedDiningId(null);
      return;
    }

    const draggedIndex = dining.findIndex(d => d.id === draggedDiningId);
    const targetIndex = dining.findIndex(d => d.id === targetDiningId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedDiningId(null);
      return;
    }

    // Reorder dining array
    const newDining = [...dining];
    const [draggedDining] = newDining.splice(draggedIndex, 1);
    newDining.splice(targetIndex, 0, draggedDining);

    // Update display_order in database - use Promise.all for parallel execution
    try {
      const updates = newDining.map((meal, index) =>
        supabase
          .from('dining')
          .update({ display_order: index })
          .eq('id', meal.id)
      );

      await Promise.all(updates);
      setDining(newDining);
    } catch (error) {
      console.error('Error reordering dining:', error);
      alert('Failed to reorder dining');
      await fetchDayData();
    }

    setDraggedDiningId(null);
  };

  const toggleSection = async (section: keyof typeof sectionToggles) => {
    const newValue = !sectionToggles[section];
    setSectionToggles(prev => ({ ...prev, [section]: newValue }));

    const fieldMap: Record<string, string> = {
      early_morning: 'early_morning_section_enabled',
      breakfast: 'breakfast_section_enabled',
      lunch: 'lunch_section_enabled',
      dinner: 'dinner_section_enabled',
      night: 'night_section_enabled',
    };

    const dbField = fieldMap[section];
    if (dbField) {
      try {
        const { error } = await supabase
          .from('itinerary_days')
          .update({ [dbField]: newValue })
          .eq('id', day.id);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating section visibility:', error);
        setSectionToggles(prev => ({ ...prev, [section]: !newValue }));
      }
    }
  };

  const isImageFile = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
  };

  const renderImageThumbnails = (images: ImageAttachment[] | null | undefined) => {
    if (!images || images.length === 0) return null;

    const actualImages = images.filter(img => isImageFile(img.file_name));
    if (actualImages.length === 0) return null;

    const displayImages = actualImages.slice(0, 3);
    const remainingCount = actualImages.length - 3;

    return (
      <div className="flex items-center gap-2 mt-3">
        <div className="flex -space-x-2">
          {displayImages.map((img, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setLightbox({
                  isOpen: true,
                  images: actualImages,
                  currentIndex: index,
                });
              }}
              className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 border-white shadow-sm hover:scale-105 hover:z-10 transition-transform cursor-pointer"
              title="Click to view"
            >
              <img
                src={img.file_url}
                alt={img.file_name || `Image ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
        {remainingCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightbox({
                isOpen: true,
                images: actualImages,
                currentIndex: 3,
              });
            }}
            className="text-xs text-brand-terracotta hover:text-brand-terracotta-dark font-medium ml-1 hover:underline cursor-pointer"
          >
            +{remainingCount} more
          </button>
        )}
      </div>
    );
  };

  const renderStoredDocuments = (images: ImageAttachment[] | null | undefined) => {
    if (!images || images.length === 0) return null;

    const docs = images.filter(img => !isImageFile(img.file_name));
    if (docs.length === 0) return null;

    return (
      <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <File className="w-4 h-4 text-brand-brown-warm" />
          <h4 className="text-sm font-medium text-brand-charcoal">Uploaded Files</h4>
        </div>
        <div className="space-y-2">
          {docs.map((doc, index) => {
            const isPdf = doc.file_name.toLowerCase().endsWith('.pdf');
            const isWord = doc.file_name.toLowerCase().match(/\.(doc|docx)$/);
            const isExcel = doc.file_name.toLowerCase().match(/\.(xls|xlsx)$/);

            return (
              <a
                key={index}
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200 hover:border-brand-terracotta hover:bg-brand-cream-dark transition-colors group"
              >
                <div className="flex-shrink-0 p-2 bg-brand-cream-dark rounded">
                  {isPdf ? (
                    <FileText className="w-4 h-4 text-red-600" />
                  ) : isWord ? (
                    <FileText className="w-4 h-4 text-blue-600" />
                  ) : isExcel ? (
                    <FileText className="w-4 h-4 text-green-600" />
                  ) : (
                    <File className="w-4 h-4 text-brand-brown-warm" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-charcoal truncate group-hover:text-brand-terracotta">
                    {doc.file_name}
                  </p>
                  <p className="text-xs text-brand-brown-light">
                    Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-brand-brown-light group-hover:text-brand-terracotta flex-shrink-0" />
              </a>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDocuments = (relatedId: string) => {
    const docs = documents[relatedId];
    if (!docs || docs.length === 0) return null;

    return (
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <File className="w-4 h-4 text-brand-brown-warm" />
          <h4 className="text-sm font-medium text-brand-charcoal">Attachments</h4>
        </div>
        <div className="space-y-2">
          {docs.map((doc) => {
            const isPdf = doc.file_name.toLowerCase().endsWith('.pdf');
            return (
              <a
                key={doc.id}
                href={doc.file_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200 hover:border-brand-terracotta hover:bg-brand-cream-dark transition-colors group"
              >
                <div className="flex-shrink-0 p-2 bg-brand-cream-dark rounded">
                  {isPdf ? (
                    <FileText className="w-4 h-4 text-red-600" />
                  ) : (
                    <File className="w-4 h-4 text-brand-brown-warm" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-charcoal truncate group-hover:text-brand-terracotta">
                    {doc.file_name}
                  </p>
                  <p className="text-xs text-brand-brown-light capitalize">
                    {doc.document_type.replace('_', ' ')}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-brand-brown-light group-hover:text-brand-terracotta flex-shrink-0" />
              </a>
            );
          })}
        </div>
      </div>
    );
  };

  const renderBookingFeeSummary = (activityId: string) => {
    if (!isManagerOrAdmin) return null;

    const feeSummary = bookingFees[activityId];
    if (!feeSummary || feeSummary.totalAmount === 0) return null;

    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
        feeSummary.hasUnpaidFees
          ? 'bg-red-50 text-red-700 border border-red-200'
          : 'bg-green-50 text-green-700 border border-green-200'
      }`}>
        <DollarSign className="w-4 h-4" />
        <span>{feeSummary.totalAmount.toFixed(2)} {feeSummary.currency}</span>
        {feeSummary.hasUnpaidFees && (
          <span className="text-xs">(Pending)</span>
        )}
      </div>
    );
  };

  const handleExportPDF = () => {
    const dayData = {
      ...day,
      accommodations,
      activities,
      dining,
      transportation,
    };
    exportSingleDayToPDF(journey.journey_name, dayData);
  };

  const handleExportExcel = () => {
    const dayData = {
      ...day,
      accommodations,
      activities,
      dining,
      transportation,
    };
    exportSingleDayToExcel(journey.journey_name, dayData);
  };

  return (
    <div className="min-h-screen bg-brand-cream">
      <header className="bg-white border-b border-brand-gray-3 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center gap-1">
                {onHome && (
                  <button
                    onClick={onHome}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-brand-gray-4 hover:bg-brand-gray-3 text-brand-brown rounded-lg transition-colors"
                    title="Go to home page"
                  >
                    <Home className="w-5 h-5" />
                    <span>Home</span>
                  </button>
                )}
                {onHome && (
                  <button
                    onClick={onHome}
                    className="sm:hidden p-2 bg-brand-gray-4 hover:bg-brand-gray-3 text-brand-brown rounded-lg transition-colors"
                    title="Go to home page"
                  >
                    <Home className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={onBack}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-brand-terracotta hover:bg-brand-terracotta-light text-white rounded-lg transition-colors"
                  title="View all days"
                >
                  <Calendar className="w-5 h-5" />
                  <span>Days</span>
                </button>
                <button
                  onClick={onBack}
                  className="sm:hidden p-2 bg-brand-terracotta hover:bg-brand-terracotta-light text-white rounded-lg transition-colors"
                  title="View all days"
                >
                  <Calendar className="w-5 h-5" />
                </button>
                {hasPreviousDay && previousDay && (
                  <button
                    onClick={() => onNavigate ? onNavigate(previousDay) : onBack()}
                    className="p-2 bg-brand-gray-4 hover:bg-brand-gray-3 text-brand-brown rounded-lg transition-colors"
                    title={`Previous: Day ${previousDay.day_number}`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                {hasNextDay && nextDay && (
                  <button
                    onClick={() => onNavigate ? onNavigate(nextDay) : onBack()}
                    className="p-2 bg-brand-gray-4 hover:bg-brand-gray-3 text-brand-brown rounded-lg transition-colors"
                    title={`Next: Day ${nextDay.day_number}`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div>
                <div className="flex items-center flex-wrap gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-brand-navy">Day {day.day_number}</h1>
                  <button
                    onClick={async () => {
                      try {
                        const newCompletedStatus = !isCompleted;
                        const { error } = await supabase
                          .from('itinerary_days')
                          .update({ is_completed: newCompletedStatus })
                          .eq('id', day.id);
                        if (error) throw error;
                        setIsCompleted(newCompletedStatus);
                      } catch (error) {
                        console.error('Error toggling day completion:', error);
                        alert('Failed to toggle completion status');
                      }
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      isCompleted
                        ? 'text-green-600 bg-green-50 hover:bg-green-100'
                        : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                    }`}
                    title={isCompleted ? 'Mark day as incomplete' : 'Mark day as complete'}
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <span className="px-3 py-1 bg-brand-cyan bg-opacity-30 text-brand-brown text-sm font-medium rounded-full">
                    {new Date(day.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {dayStaff.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-medium">Assigned:</span>
                        {dayStaff.map((staff, idx) => {
                          const isGuide = staff.role.toLowerCase().includes('guide');
                          const isDriver = staff.role.toLowerCase().includes('driver');
                          const Icon = isGuide ? UserCircle : isDriver ? Truck : Users;
                          return (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                                isGuide
                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                  : 'bg-brand-cyan bg-opacity-20 text-brand-brown border border-brand-cyan'
                              }`}
                              title={`${staff.role}${staff.phone ? ` - ${staff.phone}` : ''}`}
                            >
                              <Icon className="w-3 h-3" />
                              {staff.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                {editingDay ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={cityDestination}
                      onChange={(e) => setCityDestination(e.target.value)}
                      className="px-3 py-1 border border-brand-gray-3 rounded-lg text-sm"
                      placeholder="City/Destination"
                    />
                    <button
                      onClick={updateDayDestination}
                      className="text-sm text-brand-orange hover:text-brand-orange-hover"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setCityDestination(day.city_destination);
                        setEditingDay(false);
                      }}
                      className="text-sm text-brand-charcoal hover:text-brand-gray-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-brand-charcoal" />
                    <span className="text-sm text-brand-charcoal">{cityDestination}</span>
                    <button
                      onClick={() => setEditingDay(true)}
                      className="text-sm text-brand-orange hover:text-brand-orange-hover"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportPDF}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                title="Export day schedule as PDF"
              >
                <Download className="w-5 h-5" />
                <span>PDF</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="sm:hidden p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                title="Export day schedule as PDF"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={handleExportExcel}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                title="Export day schedule as Excel"
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span>Excel</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="sm:hidden p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                title="Export day schedule as Excel"
              >
                <FileSpreadsheet className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowStaffModal(true)}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-brand-cyan bg-opacity-40 hover:bg-opacity-50 text-brand-brown rounded-lg transition-colors border border-brand-cyan"
                title="View and assign staff for this day"
              >
                <Users className="w-5 h-5" />
                <span>Staff ({dayStaff.length})</span>
              </button>
              <button
                onClick={() => setShowStaffModal(true)}
                className="sm:hidden p-2 bg-brand-cyan bg-opacity-40 hover:bg-opacity-50 text-brand-brown rounded-lg transition-colors border border-brand-cyan"
                title="View and assign staff for this day"
              >
                <Users className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Truck className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-bold text-brand-navy">Transportation</h2>
            </div>
            <button
              onClick={() => {
                setEditingTransportation(undefined);
                setShowTransportationModal(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Transportation</span>
            </button>
          </div>

          {transportation.length === 0 ? (
            <div className="bg-white rounded-xl border border-brand-gray-3 p-8 text-center">
              <p className="text-brand-gray-1">No transportation added yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transportation.map((trans) => (
                <PremiumTransportationCard
                  key={trans.id}
                  transportation={trans}
                  onEdit={() => {
                    setEditingTransportation(trans);
                    setShowTransportationModal(true);
                  }}
                  onDelete={() => openDeleteDialog('transportation', trans.id, trans.car_type || 'Transportation', 'transportation')}
                  onUpdate={fetchDayData}
                />
              ))}
            </div>
          )}
        </section>

        {/* Early Morning Activities Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Sunrise className="w-5 h-5 text-amber-600" />
              <h2 className="text-xl font-bold text-brand-navy">Early Morning Activities</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkActivityModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-brand-cyan bg-opacity-40 hover:bg-opacity-50 text-brand-brown border border-brand-cyan rounded-lg transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Bulk Add</span>
              </button>
              <button
                onClick={() => {
                  setEditingActivity(undefined);
                  setActivitySection('early_morning');
                  setShowActivityModal(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Activity</span>
              </button>
            </div>
          </div>

          {activities.filter(a => getActivityTimeCategory(a.activity_time) === 'early_morning').length === 0 ? (
            <div className="bg-white rounded-xl border border-brand-gray-3 p-8 text-center">
              <p className="text-brand-gray-1">No early morning activities added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.filter(a => getActivityTimeCategory(a.activity_time) === 'early_morning').map((activity) => (
                <div
                  key={activity.id}
                  onDragOver={handleActivityDragOver}
                  onDrop={() => handleActivityDrop(activity.id)}
                >
                  <PremiumActivityCard
                    activity={activity}
                    isDraggable
                    onDragStart={() => handleActivityDragStart(activity.id)}
                    onEdit={() => {
                      setEditingActivity(activity);
                      setShowActivityModal(true);
                    }}
                    onDelete={() =>
                      openDeleteDialog('activities', activity.id, activity.activity_name, 'activity')
                    }
                    onDuplicate={() => handleDuplicateActivity(activity)}
                    bookingFeeSummary={bookingFees[activity.id] || null}
                    isBeingDragged={draggedActivityId === activity.id}
                    onUpdate={fetchDayData}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Breakfast Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Utensils className="w-5 h-5 text-brand-charcoal" />
              <h2 className="text-xl font-bold text-brand-navy">Breakfast</h2>
            </div>
            <button
              onClick={() => {
                setEditingDining(undefined);
                setShowDiningModal(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Breakfast</span>
            </button>
          </div>

          {dining.filter(m => m.meal_type === 'breakfast').length === 0 ? (
            <div className="bg-white rounded-xl border border-brand-gray-3 p-8 text-center">
              <p className="text-brand-gray-1">No breakfast added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dining.filter(m => m.meal_type === 'breakfast').map((meal) => (
                <div
                  key={meal.id}
                  onDragOver={handleDiningDragOver}
                  onDrop={() => handleDiningDrop(meal.id)}
                >
                  <PremiumDiningCard
                    dining={meal}
                    isDraggable
                    onDragStart={() => handleDiningDragStart(meal.id)}
                    onEdit={() => {
                      setEditingDining(meal);
                      setShowDiningModal(true);
                    }}
                    onDelete={() =>
                      openDeleteDialog('dining', meal.id, meal.restaurant_name, 'dining')
                    }
                    isBeingDragged={draggedDiningId === meal.id}
                    onUpdate={fetchDayData}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Morning Activities Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <ActivityIcon className="w-5 h-5 text-brand-charcoal" />
              <h2 className="text-xl font-bold text-brand-navy">Morning Activities</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkActivityModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-brand-cyan bg-opacity-40 hover:bg-opacity-50 text-brand-brown border border-brand-cyan rounded-lg transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Bulk Add</span>
              </button>
              <button
                onClick={() => {
                  setEditingActivity(undefined);
                  setActivitySection('morning');
                  setShowActivityModal(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Activity</span>
              </button>
            </div>
          </div>

          {activities.filter(a => getActivityTimeCategory(a.activity_time) === 'morning').length === 0 ? (
            <div className="bg-white rounded-xl border border-brand-gray-3 p-8 text-center">
              <p className="text-brand-gray-1">No morning activities added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.filter(a => getActivityTimeCategory(a.activity_time) === 'morning').map((activity) => (
                <div
                  key={activity.id}
                  onDragOver={handleActivityDragOver}
                  onDrop={() => handleActivityDrop(activity.id)}
                >
                  <PremiumActivityCard
                    activity={activity}
                    isDraggable
                    onDragStart={() => handleActivityDragStart(activity.id)}
                    onEdit={() => {
                      setEditingActivity(activity);
                      setShowActivityModal(true);
                    }}
                    onDelete={() =>
                      openDeleteDialog('activities', activity.id, activity.activity_name, 'activity')
                    }
                    onDuplicate={() => handleDuplicateActivity(activity)}
                    bookingFeeSummary={bookingFees[activity.id] || null}
                    isBeingDragged={draggedActivityId === activity.id}
                    onUpdate={fetchDayData}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Lunch Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Utensils className="w-5 h-5 text-brand-charcoal" />
              <h2 className="text-xl font-bold text-brand-navy">Lunch</h2>
            </div>
            <button
              onClick={() => {
                setEditingDining(undefined);
                setShowDiningModal(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Lunch</span>
            </button>
          </div>

          {dining.filter(m => m.meal_type === 'lunch').length === 0 ? (
            <div className="bg-white rounded-xl border border-brand-gray-3 p-8 text-center">
              <p className="text-brand-gray-1">No lunch added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dining.filter(m => m.meal_type === 'lunch').map((meal) => (
                <div
                  key={meal.id}
                  onDragOver={handleDiningDragOver}
                  onDrop={() => handleDiningDrop(meal.id)}
                >
                  <PremiumDiningCard
                    dining={meal}
                    isDraggable
                    onDragStart={() => handleDiningDragStart(meal.id)}
                    onEdit={() => {
                      setEditingDining(meal);
                      setShowDiningModal(true);
                    }}
                    onDelete={() =>
                      openDeleteDialog('dining', meal.id, meal.restaurant_name, 'dining')
                    }
                    isBeingDragged={draggedDiningId === meal.id}
                    onUpdate={fetchDayData}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Afternoon Activities Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <ActivityIcon className="w-5 h-5 text-brand-charcoal" />
              <h2 className="text-xl font-bold text-brand-navy">Afternoon Activities</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkActivityModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-brand-cyan bg-opacity-40 hover:bg-opacity-50 text-brand-brown border border-brand-cyan rounded-lg transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Bulk Add</span>
              </button>
              <button
                onClick={() => {
                  setEditingActivity(undefined);
                  setActivitySection('afternoon');
                  setShowActivityModal(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Activity</span>
              </button>
            </div>
          </div>

          {activities.filter(a => getActivityTimeCategory(a.activity_time) === 'afternoon').length === 0 ? (
            <div className="bg-white rounded-xl border border-brand-gray-3 p-8 text-center">
              <p className="text-brand-gray-1">No afternoon activities added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.filter(a => getActivityTimeCategory(a.activity_time) === 'afternoon').map((activity) => (
                <div
                  key={activity.id}
                  onDragOver={handleActivityDragOver}
                  onDrop={() => handleActivityDrop(activity.id)}
                >
                  <PremiumActivityCard
                    activity={activity}
                    isDraggable
                    onDragStart={() => handleActivityDragStart(activity.id)}
                    onEdit={() => {
                      setEditingActivity(activity);
                      setShowActivityModal(true);
                    }}
                    onDelete={() =>
                      openDeleteDialog('activities', activity.id, activity.activity_name, 'activity')
                    }
                    onDuplicate={() => handleDuplicateActivity(activity)}
                    bookingFeeSummary={bookingFees[activity.id] || null}
                    isBeingDragged={draggedActivityId === activity.id}
                    onUpdate={fetchDayData}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Evening Activities Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <ActivityIcon className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-bold text-brand-navy">Evening Activities</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkActivityModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-brand-cyan bg-opacity-40 hover:bg-opacity-50 text-brand-brown border border-brand-cyan rounded-lg transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Bulk Add</span>
              </button>
              <button
                onClick={() => {
                  setEditingActivity(undefined);
                  setActivitySection('evening');
                  setShowActivityModal(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Activity</span>
              </button>
            </div>
          </div>

          {activities.filter(a => getActivityTimeCategory(a.activity_time) === 'evening').length === 0 ? (
            <div className="bg-white rounded-xl border border-brand-gray-3 p-8 text-center">
              <p className="text-brand-gray-1">No evening activities added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.filter(a => getActivityTimeCategory(a.activity_time) === 'evening').map((activity) => (
                <div
                  key={activity.id}
                  onDragOver={handleActivityDragOver}
                  onDrop={() => handleActivityDrop(activity.id)}
                >
                  <PremiumActivityCard
                    activity={activity}
                    isDraggable
                    onDragStart={() => handleActivityDragStart(activity.id)}
                    onEdit={() => {
                      setEditingActivity(activity);
                      setShowActivityModal(true);
                    }}
                    onDelete={() =>
                      openDeleteDialog('activities', activity.id, activity.activity_name, 'activity')
                    }
                    onDuplicate={() => handleDuplicateActivity(activity)}
                    bookingFeeSummary={bookingFees[activity.id] || null}
                    isBeingDragged={draggedActivityId === activity.id}
                    onUpdate={fetchDayData}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Dinner Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Utensils className="w-5 h-5 text-brand-charcoal" />
              <h2 className="text-xl font-bold text-brand-navy">Dinner</h2>
            </div>
            <button
              onClick={() => {
                setEditingDining(undefined);
                setShowDiningModal(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Dinner</span>
            </button>
          </div>

          {dining.filter(m => m.meal_type === 'dinner').length === 0 ? (
            <div className="bg-white rounded-xl border border-brand-gray-3 p-8 text-center">
              <p className="text-brand-gray-1">No dinner added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dining.filter(m => m.meal_type === 'dinner').map((meal) => (
                <div
                  key={meal.id}
                  onDragOver={handleDiningDragOver}
                  onDrop={() => handleDiningDrop(meal.id)}
                >
                  <PremiumDiningCard
                    dining={meal}
                    isDraggable
                    onDragStart={() => handleDiningDragStart(meal.id)}
                    onEdit={() => {
                      setEditingDining(meal);
                      setShowDiningModal(true);
                    }}
                    onDelete={() =>
                      openDeleteDialog('dining', meal.id, meal.restaurant_name, 'dining')
                    }
                    isBeingDragged={draggedDiningId === meal.id}
                    onUpdate={fetchDayData}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Night Activities Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Moon className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xl font-bold text-brand-navy">Night Activities</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkActivityModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-brand-cyan bg-opacity-40 hover:bg-opacity-50 text-brand-brown border border-brand-cyan rounded-lg transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Bulk Add</span>
              </button>
              <button
                onClick={() => {
                  setEditingActivity(undefined);
                  setActivitySection('night');
                  setShowActivityModal(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Activity</span>
              </button>
            </div>
          </div>

          {activities.filter(a => getActivityTimeCategory(a.activity_time) === 'night').length === 0 ? (
            <div className="bg-white rounded-xl border border-brand-gray-3 p-8 text-center">
              <p className="text-brand-gray-1">No night activities added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.filter(a => getActivityTimeCategory(a.activity_time) === 'night').map((activity) => (
                <div
                  key={activity.id}
                  onDragOver={handleActivityDragOver}
                  onDrop={() => handleActivityDrop(activity.id)}
                >
                  <PremiumActivityCard
                    activity={activity}
                    isDraggable
                    onDragStart={() => handleActivityDragStart(activity.id)}
                    onEdit={() => {
                      setEditingActivity(activity);
                      setShowActivityModal(true);
                    }}
                    onDelete={() =>
                      openDeleteDialog('activities', activity.id, activity.activity_name, 'activity')
                    }
                    onDuplicate={() => handleDuplicateActivity(activity)}
                    bookingFeeSummary={bookingFees[activity.id] || null}
                    isBeingDragged={draggedActivityId === activity.id}
                    onUpdate={fetchDayData}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Accommodation Section - Now at the end */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Hotel className="w-5 h-5 text-brand-brown" />
              <h2 className="text-xl font-bold text-brand-navy">Accommodation</h2>
            </div>
            <button
              onClick={() => {
                setEditingAccommodation(undefined);
                setShowAccommodationModal(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Hotel</span>
            </button>
          </div>

          {accommodations.length === 0 ? (
            <div className="bg-white rounded-xl border border-brand-gray-3 p-8 text-center">
              <p className="text-brand-gray-1">No accommodation added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accommodations.map((accom) => (
                <PremiumAccommodationCard
                  key={accom.id}
                  accommodation={accom}
                  dayDate={day.date}
                  onEdit={() => {
                    setEditingAccommodation(accom);
                    setShowAccommodationModal(true);
                  }}
                  onDelete={() =>
                    openDeleteDialog('accommodations', accom.id, accom.hotel_name, 'accommodation')
                  }
                  onUpdate={fetchDayData}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {showAccommodationModal && (
        <AccommodationModal
          dayId={day.id}
          accommodation={editingAccommodation}
          onClose={() => {
            setShowAccommodationModal(false);
            setEditingAccommodation(undefined);
          }}
          onSave={() => {
            setShowAccommodationModal(false);
            setEditingAccommodation(undefined);
            fetchDayData();
          }}
        />
      )}

      {showTransportationModal && (
        <TransportationModal
          dayId={day.id}
          transportation={editingTransportation}
          onClose={() => {
            setShowTransportationModal(false);
            setEditingTransportation(undefined);
          }}
          onSave={() => {
            setShowTransportationModal(false);
            setEditingTransportation(undefined);
            fetchDayData();
          }}
        />
      )}

      {showActivityModal && (
        <ActivityModal
          dayId={day.id}
          activity={editingActivity}
          defaultSection={activitySection}
          onClose={() => {
            setShowActivityModal(false);
            setEditingActivity(undefined);
          }}
          onSave={() => {
            setShowActivityModal(false);
            setEditingActivity(undefined);
            fetchDayData();
          }}
        />
      )}

      {showBulkActivityModal && (
        <BulkActivityModal
          dayId={day.id}
          onClose={() => setShowBulkActivityModal(false)}
          onSave={() => {
            setShowBulkActivityModal(false);
            fetchDayData();
          }}
        />
      )}

      {showBulkAccommodationModal && (
        <BulkAccommodationModal
          dayId={day.id}
          onClose={() => setShowBulkAccommodationModal(false)}
          onSave={() => {
            setShowBulkAccommodationModal(false);
            fetchDayData();
          }}
        />
      )}

      {showDiningModal && (
        <DiningModal
          dayId={day.id}
          dining={editingDining}
          onClose={() => {
            setShowDiningModal(false);
            setEditingDining(undefined);
          }}
          onSave={() => {
            setShowDiningModal(false);
            setEditingDining(undefined);
            fetchDayData();
          }}
        />
      )}

      {showBulkDiningModal && (
        <BulkDiningModal
          dayId={day.id}
          onClose={() => setShowBulkDiningModal(false)}
          onSave={() => {
            setShowBulkDiningModal(false);
            fetchDayData();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, table: '', id: '', name: '', type: '' })}
        onConfirm={confirmDeleteItem}
        title={`Delete ${deleteDialog.type}`}
        message={`Are you sure you want to delete "${deleteDialog.name}"? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />

      {lightbox.isOpen && (
        <ImageLightbox
          images={lightbox.images}
          currentIndex={lightbox.currentIndex}
          onClose={() => setLightbox({ isOpen: false, images: [], currentIndex: 0 })}
          onNavigate={(index) => setLightbox({ ...lightbox, currentIndex: index })}
        />
      )}

      {showStaffModal && (
        <DayStaffAssignmentModal
          journeyId={journey.id}
          dayId={day.id}
          dayNumber={day.day_number}
          onClose={() => setShowStaffModal(false)}
          onUpdate={() => {
            fetchDayData();
            fetchStaffData();
          }}
        />
      )}
    </div>
  );
}
