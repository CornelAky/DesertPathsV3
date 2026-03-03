import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, MapPin, Hotel, Utensils, Activity as ActivityIcon, AlertCircle, Download, FileDown, RefreshCw, Check, X, Grid3x3, LayoutList, Lock, Share2 } from 'lucide-react';
import type { Trip } from '../../lib/database.types';
import { exportItineraryTableToPDF, exportItineraryTableToExcel } from '../../lib/exportUtils';
import { ShareItineraryModal } from './ShareItineraryModal';

interface EnhancedItineraryTableProps {
  journeyId: string;
}

interface TableRow {
  id: string;
  day_number: number;
  date: string;
  type: 'accommodation' | 'activity' | 'dining';
  time: string;
  name: string;
  location: string;
  status: string;
  notes: string;
  mealType?: string;
  originalId: string;
  originalTable: string;
  bookingFeeStatus?: 'booked' | 'pending' | 'not_required' | null;
  hasBookingFees?: boolean;
}

interface EditingCell {
  rowId: string;
  field: 'time' | 'name' | 'location' | 'status';
  value: string;
}

export function EnhancedItineraryTable({ journeyId }: EnhancedItineraryTableProps) {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [trip, setTrip] = useState<Trip | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isMobile, setIsMobile] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setViewMode('cards');
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchTripAndData();
  }, [journeyId]);

  const fetchTripAndData = async () => {
    try {
      setLoading(true);

      const { data: tripData, error: tripError } = await supabase
        .from('journeys')
        .select('*')
        .eq('id', journeyId)
        .maybeSingle();

      if (tripError) throw tripError;
      setTrip(tripData);

      const { data: days, error: daysError } = await supabase
        .from('itinerary_days')
        .select('*')
        .eq('journey_id', journeyId)
        .order('day_number', { ascending: true });

      if (daysError) throw daysError;

      const allRows: TableRow[] = [];

      const dayIds = (days || []).map(d => d.id);

      const [accommodationsResult, activitiesResult, diningResult, bookingFeesResult] = await Promise.all([
        supabase.from('accommodations').select('*').in('day_id', dayIds),
        supabase.from('activities').select('*').in('day_id', dayIds).order('display_order', { ascending: true }),
        supabase.from('dining').select('*').in('day_id', dayIds).order('display_order', { ascending: true }),
        supabase.from('activity_booking_fees').select('activity_id, status, booking_required').in('activity_id',
          (await supabase.from('activities').select('id').in('day_id', dayIds)).data?.map(a => a.id) || []
        ),
      ]);

      const bookingFeesMap = new Map<string, Array<{status: string; booking_required: boolean}>>();
      bookingFeesResult.data?.forEach((fee) => {
        if (!bookingFeesMap.has(fee.activity_id)) {
          bookingFeesMap.set(fee.activity_id, []);
        }
        bookingFeesMap.get(fee.activity_id)!.push({
          status: fee.status,
          booking_required: fee.booking_required,
        });
      });

      for (const day of days || []) {
        const dayAccommodations = accommodationsResult.data?.filter(a => a.day_id === day.id) || [];
        const dayActivities = activitiesResult.data?.filter(a => a.day_id === day.id) || [];
        const dayDining = diningResult.data?.filter(d => d.day_id === day.id) || [];

        dayAccommodations.forEach((accom) => {
          allRows.push({
            id: `accom-${accom.id}`,
            day_number: day.day_number,
            date: day.date,
            type: 'accommodation',
            time: accom.check_in_time || '00:00',
            name: accom.hotel_name || 'Accommodation',
            location: accom.location_address,
            status: accom.booking_status || '',
            notes: accom.guide_notes || '',
            originalId: accom.id,
            originalTable: 'accommodations',
          });
        });

        dayActivities.forEach((activity) => {
          if (activity.activity_time && activity.activity_name) {
            const bookingFees = bookingFeesMap.get(activity.id) || [];
            let bookingFeeStatus: 'booked' | 'pending' | 'not_required' | null = null;
            const hasBookingFees = bookingFees.length > 0;

            if (hasBookingFees) {
              const hasPending = bookingFees.some(fee => fee.booking_required && fee.status !== 'booked');
              const allBooked = bookingFees.every(fee => !fee.booking_required || fee.status === 'booked');

              if (allBooked) {
                bookingFeeStatus = 'booked';
              } else if (hasPending) {
                bookingFeeStatus = 'pending';
              }
            }

            allRows.push({
              id: `activity-${activity.id}`,
              day_number: day.day_number,
              date: day.date,
              type: 'activity',
              time: activity.activity_time,
              name: activity.activity_name,
              location: activity.location,
              status: activity.booking_status || '',
              notes: activity.guide_notes || '',
              originalId: activity.id,
              originalTable: 'activities',
              bookingFeeStatus,
              hasBookingFees,
            });
          }
        });

        dayDining.forEach((meal) => {
          allRows.push({
            id: `dining-${meal.id}`,
            day_number: day.day_number,
            date: day.date,
            type: 'dining',
            time: meal.reservation_time || '12:00',
            name: meal.restaurant_name || 'Dining',
            location: meal.location_address,
            status: meal.booking_status || '',
            notes: meal.guide_notes || '',
            mealType: meal.meal_type,
            originalId: meal.id,
            originalTable: 'dining',
          });
        });
      }

      allRows.sort((a, b) => {
        if (a.day_number !== b.day_number) {
          return a.day_number - b.day_number;
        }
        const timeA = a.time.split(':').map(Number);
        const timeB = b.time.split(':').map(Number);
        if (timeA[0] !== timeB[0]) return timeA[0] - timeB[0];
        return timeA[1] - timeB[1];
      });

      setRows(allRows);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching itinerary data:', error);
      alert('Failed to load itinerary data');
    } finally {
      setLoading(false);
    }
  };

  const isActivityLocked = (row: TableRow): boolean => {
    return row.type === 'activity' && row.hasBookingFees && row.bookingFeeStatus === 'pending';
  };

  const handleCellEdit = (rowId: string, field: 'time' | 'name' | 'location' | 'status', currentValue: string) => {
    const row = rows.find(r => r.id === rowId);
    if (row && isActivityLocked(row)) {
      return;
    }
    setEditingCell({ rowId, field, value: currentValue });
  };

  const handleCellSave = async () => {
    if (!editingCell) return;

    const row = rows.find(r => r.id === editingCell.rowId);
    if (!row) return;

    setSaving(true);
    try {
      const updateData: any = {};

      if (row.originalTable === 'accommodations') {
        if (editingCell.field === 'time') updateData.check_in_time = editingCell.value;
        else if (editingCell.field === 'name') updateData.hotel_name = editingCell.value;
        else if (editingCell.field === 'location') updateData.location_address = editingCell.value;
        else if (editingCell.field === 'status') updateData.booking_status = editingCell.value;
      } else if (row.originalTable === 'activities') {
        if (editingCell.field === 'time') updateData.activity_time = editingCell.value;
        else if (editingCell.field === 'name') updateData.activity_name = editingCell.value;
        else if (editingCell.field === 'location') updateData.location = editingCell.value;
        else if (editingCell.field === 'status') updateData.booking_status = editingCell.value;
      } else if (row.originalTable === 'dining') {
        if (editingCell.field === 'time') updateData.reservation_time = editingCell.value;
        else if (editingCell.field === 'name') updateData.restaurant_name = editingCell.value;
        else if (editingCell.field === 'location') updateData.location_address = editingCell.value;
        else if (editingCell.field === 'status') updateData.booking_status = editingCell.value;
      }

      const { error } = await supabase
        .from(row.originalTable)
        .update(updateData)
        .eq('id', row.originalId);

      if (error) throw error;

      setEditingCell(null);
      await fetchTripAndData();
    } catch (error) {
      console.error('Error updating cell:', error);
      alert('Failed to update. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    if (!trip) return;

    const exportData = rows.map(row => ({
      day_number: row.day_number,
      date: row.date,
      type: row.type,
      time: row.time,
      name: row.name,
      location: row.location,
      status: row.status,
    }));

    if (format === 'pdf') {
      exportItineraryTableToPDF(trip.journey_name, exportData);
    } else {
      exportItineraryTableToExcel(trip.journey_name, exportData);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'accommodation':
        return <Hotel className="w-4 h-4" />;
      case 'activity':
        return <ActivityIcon className="w-4 h-4" />;
      case 'dining':
        return <Utensils className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'accommodation':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'activity':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'dining':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-brand-gray-4 text-brand-charcoal border-brand-gray-3';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-brand-gray-4 text-brand-charcoal';
    }
  };

  const renderBookingFeeBadge = (row: TableRow) => {
    if (row.type !== 'activity' || !row.hasBookingFees) {
      return <span className="text-slate-400 text-xs">N/A</span>;
    }

    if (row.bookingFeeStatus === 'booked') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-300">
          <Check className="w-3 h-3" />
          Confirmed
        </span>
      );
    }

    if (row.bookingFeeStatus === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
          <AlertCircle className="w-3 h-3" />
          Pending
        </span>
      );
    }

    return <span className="text-slate-400 text-xs">-</span>;
  };

  const renderEditableField = (row: TableRow, field: 'time' | 'name' | 'location' | 'status', displayContent: React.ReactNode) => {
    const isEditing = editingCell?.rowId === row.id && editingCell?.field === field;
    const locked = isActivityLocked(row);

    if (isEditing) {
      return (
        <div className="flex items-center gap-2 mt-2">
          {field === 'status' ? (
            <select
              value={editingCell.value}
              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
              className="flex-1 px-3 py-2 text-base border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            >
              <option value="">Select status</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          ) : (
            <input
              type={field === 'time' ? 'time' : 'text'}
              value={editingCell.value}
              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
              className="flex-1 px-3 py-2 text-base border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          )}
          <button
            onClick={handleCellSave}
            disabled={saving}
            className="p-2 touch-target text-green-600 hover:bg-green-50 rounded-lg transition-colors"
          >
            <Check className="w-5 h-5" />
          </button>
          <button
            onClick={handleCellCancel}
            disabled={saving}
            className="p-2 touch-target text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      );
    }

    if (locked) {
      return (
        <div
          className="relative group px-2 py-1 -mx-2 rounded opacity-60 cursor-not-allowed"
          title="Booking Fee confirmation required to proceed"
        >
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-red-600" />
            {displayContent}
          </div>
        </div>
      );
    }

    return (
      <div
        className="cursor-pointer active:bg-brand-gray-4 px-2 py-1 -mx-2 rounded transition-colors"
        onClick={() => handleCellEdit(row.id, field, field === 'status' ? row.status : field === 'time' ? row.time : field === 'name' ? row.name : row.location)}
      >
        {displayContent}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-orange border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-brand-navy">Itinerary Table</h2>
          <p className="text-xs sm:text-sm text-brand-charcoal mt-1">
            Auto-synced • Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {isMobile && (
            <div className="flex gap-1 p-1 bg-brand-gray-4 rounded-lg">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium transition-colors ${
                  viewMode === 'cards' ? 'bg-white text-brand-navy shadow-sm' : 'text-brand-charcoal'
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium transition-colors ${
                  viewMode === 'table' ? 'bg-white text-brand-navy shadow-sm' : 'text-brand-charcoal'
                }`}
              >
                <LayoutList className="w-4 h-4" />
                Table
              </button>
            </div>
          )}
          <button
            onClick={fetchTripAndData}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-brand-gray-4 hover:bg-brand-gray-3 text-brand-brown rounded-lg transition-colors touch-target border border-brand-gray-3"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-brand-brown-light bg-opacity-40 hover:bg-opacity-60 text-brand-brown rounded-lg transition-colors touch-target border border-brand-brown-light"
            title="Export to PDF"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-brand-green-light bg-opacity-40 hover:bg-opacity-60 text-brand-green border border-brand-green rounded-lg transition-colors touch-target"
            title="Export to Excel"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors touch-target"
            title="Share Itinerary"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-blue-900 mb-1 text-sm sm:text-base">Editable Control Panel</h4>
            <p className="text-xs sm:text-sm text-blue-800">
              Tap any Time, Name, Location, or Status field to edit directly. Changes sync instantly to all views.
            </p>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-brand-gray-3 p-8 sm:p-12 text-center">
          <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-brand-navy mb-2">No Itinerary Data</h3>
          <p className="text-sm sm:text-base text-brand-charcoal">
            Add activities, accommodations, or dining entries in the Day by Day view to populate this table.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="bg-white rounded-lg border border-brand-gray-3 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-brand-navy">Day {row.day_number}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${getTypeColor(row.type)}`}>
                  {getTypeIcon(row.type)}
                  <span className="capitalize">{row.type}</span>
                </div>
              </div>

              {row.type === 'activity' && row.hasBookingFees && (
                <div className="mt-3 pb-3 border-b border-brand-gray-3">
                  <div className="text-xs text-slate-500 mb-1">Booking Fee</div>
                  {renderBookingFeeBadge(row)}
                  {isActivityLocked(row) && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
                      <Lock className="w-3 h-3" />
                      <span>Booking Fee confirmation required to proceed</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Time</span>
                  </div>
                  {renderEditableField(row, 'time', <span className="text-sm font-medium text-brand-navy">{row.time}</span>)}
                </div>

                <div>
                  <div className="text-xs text-slate-500 mb-1">Name</div>
                  {renderEditableField(row, 'name', (
                    <div>
                      <div className="text-sm font-medium text-brand-navy">{row.name}</div>
                      {row.mealType && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full capitalize">
                          {row.mealType}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Location</span>
                  </div>
                  {renderEditableField(row, 'location', <span className="text-sm text-brand-charcoal">{row.location}</span>)}
                </div>

                <div>
                  <div className="text-xs text-slate-500 mb-1">Status</div>
                  {renderEditableField(row, 'status', (
                    row.status ? (
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(row.status)}`}>
                        {row.status}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">Tap to set</span>
                    )
                  ))}
                </div>

                {row.notes && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Notes</div>
                    <p className="text-sm text-brand-charcoal">{row.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-brand-gray-3 overflow-hidden">
          <div className="overflow-x-auto scrollable-x">
            <table className="w-full min-w-max">
              <thead className="bg-brand-gray-4 border-b border-brand-gray-3 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand-charcoal uppercase tracking-wider">
                    Day
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand-charcoal uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand-charcoal uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand-charcoal uppercase tracking-wider">
                    Booking Fee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand-charcoal uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand-charcoal uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand-charcoal uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand-charcoal uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand-charcoal uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-brand-gray-4 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-brand-navy">Day {row.day_number}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-brand-charcoal">
                      {new Date(row.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${getTypeColor(row.type)}`}>
                        {getTypeIcon(row.type)}
                        <span className="text-xs font-medium capitalize">{row.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {renderBookingFeeBadge(row)}
                    </td>
                    <td className="px-4 py-3">
                      {editingCell?.rowId === row.id && editingCell?.field === 'time' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={editingCell.value}
                            onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                            className="px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            autoFocus
                          />
                          <button
                            onClick={handleCellSave}
                            disabled={saving}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCellCancel}
                            disabled={saving}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="flex items-center gap-1.5 text-sm text-brand-navy cursor-pointer hover:bg-brand-gray-4 px-2 py-1 rounded transition-colors"
                          onClick={() => handleCellEdit(row.id, 'time', row.time)}
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {row.time}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingCell?.rowId === row.id && editingCell?.field === 'name' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingCell.value}
                            onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                            className="px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm flex-1"
                            autoFocus
                          />
                          <button
                            onClick={handleCellSave}
                            disabled={saving}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCellCancel}
                            disabled={saving}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="cursor-pointer hover:bg-brand-gray-4 px-2 py-1 rounded transition-colors"
                          onClick={() => handleCellEdit(row.id, 'name', row.name)}
                        >
                          <div className="font-medium text-brand-navy">{row.name}</div>
                          {row.mealType && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full capitalize">
                              {row.mealType}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingCell?.rowId === row.id && editingCell?.field === 'location' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingCell.value}
                            onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                            className="px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm flex-1"
                            autoFocus
                          />
                          <button
                            onClick={handleCellSave}
                            disabled={saving}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCellCancel}
                            disabled={saving}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="flex items-start gap-1.5 text-sm text-brand-charcoal cursor-pointer hover:bg-brand-gray-4 px-2 py-1 rounded transition-colors"
                          onClick={() => handleCellEdit(row.id, 'location', row.location)}
                        >
                          <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{row.location}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingCell?.rowId === row.id && editingCell?.field === 'status' ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editingCell.value}
                            onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                            className="px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            autoFocus
                          >
                            <option value="">Select status</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="pending">Pending</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <button
                            onClick={handleCellSave}
                            disabled={saving}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCellCancel}
                            disabled={saving}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="cursor-pointer hover:bg-brand-gray-4 px-2 py-1 rounded inline-block transition-colors"
                          onClick={() => handleCellEdit(row.id, 'status', row.status)}
                        >
                          {row.status ? (
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(row.status)}`}>
                              {row.status}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">Click to set</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-brand-charcoal max-w-xs">
                      <div className="line-clamp-2">{row.notes || '-'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-xs sm:text-sm text-brand-charcoal bg-brand-gray-4 rounded-lg p-3 sm:p-4">
        <p>
          <strong>Total Entries:</strong> {rows.length} items{trip ? ` across ${trip.duration_days} days` : ''}
        </p>
      </div>

      {showShareModal && trip && (
        <ShareItineraryModal
          journey={trip}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
