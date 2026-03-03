import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, MapPin, Users, RotateCcw, Trash2, Search } from 'lucide-react';
import type { Journey } from '../../lib/database.types';
import { ConfirmDialog } from './ConfirmDialog';

export function TrashView() {
  const [archivedTrips, setArchivedTrips] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [restoreDialog, setRestoreDialog] = useState<{ isOpen: boolean; trip: Journey | null }>({
    isOpen: false,
    trip: null,
  });
  const [permanentDeleteDialog, setPermanentDeleteDialog] = useState<{ isOpen: boolean; trip: Journey | null }>({
    isOpen: false,
    trip: null,
  });
  const [emptyTrashDialog, setEmptyTrashDialog] = useState(false);

  useEffect(() => {
    fetchArchivedTrips();
  }, []);

  const fetchArchivedTrips = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('journeys')
        .select('id, customer_id, journey_name, description, start_date, end_date, duration_days, status, created_at, updated_at, deleted_at, customers(id, name)')
        .not('deleted_at', 'is', null)
        .or('is_driver_copy.is.null,is_driver_copy.eq.false')
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setArchivedTrips(data || []);
    } catch (error) {
      console.error('Error fetching archived trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreTrip = async () => {
    if (!restoreDialog.trip) return;

    try {
      const { error } = await supabase
        .from('journeys')
        .update({ deleted_at: null })
        .eq('id', restoreDialog.trip.id);

      if (error) {
        console.error('Error restoring trip:', error);
        alert(`Failed to restore trip: ${error.message}`);
        return;
      }

      await fetchArchivedTrips();
      setRestoreDialog({ isOpen: false, trip: null });
    } catch (error: any) {
      console.error('Error restoring trip:', error);
      alert(`Failed to restore trip: ${error?.message || 'Please try again.'}`);
    }
  };

  const handleEmptyTrash = async () => {
    if (archivedTrips.length === 0) return;

    try {
      const deletePromises = archivedTrips.map(trip => deleteTripPermanently(trip.id));
      const results = await Promise.allSettled(deletePromises);

      const failures = results.filter(r => r.status === 'rejected');

      if (failures.length > 0) {
        console.error('Some trips failed to delete:', failures);
        alert(`Failed to delete ${failures.length} of ${archivedTrips.length} trips. Check console for details.`);
      }

      await fetchArchivedTrips();
      setEmptyTrashDialog(false);
    } catch (error: any) {
      console.error('Error emptying trash:', error);
      alert(`Failed to empty trash: ${error?.message || 'Please try again.'}`);
    }
  };

  const deleteTripPermanently = async (tripId: string) => {
    const { data: entries } = await supabase
      .from('itinerary_entries')
      .select('id, activity_id')
      .eq('journey_id', tripId);

    const entryIds = entries?.map(e => e.id) || [];
    const activityIds = entries?.filter(e => e.activity_id).map(e => e.activity_id) || [];

    if (entryIds.length > 0) {
      const { error: activityLogByEntryError } = await supabase.from('itinerary_activity_log').delete().in('entry_id', entryIds);
      if (activityLogByEntryError) console.error('Error deleting activity log by entry:', activityLogByEntryError);

      const { error: changeLogError } = await supabase.from('itinerary_change_log').delete().in('entry_id', entryIds);
      if (changeLogError) console.error('Error deleting change log:', changeLogError);

      const { error: commentsError } = await supabase.from('itinerary_entry_comments').delete().in('entry_id', entryIds);
      if (commentsError) console.error('Error deleting comments:', commentsError);
    }

    const { error: activityLogError } = await supabase.from('itinerary_activity_log').delete().eq('journey_id', tripId);
    if (activityLogError) console.error('Error deleting activity log:', activityLogError);

    if (activityIds.length > 0) {
      const { error } = await supabase.from('activity_booking_fees').delete().in('activity_id', activityIds);
      if (error) console.error('Error deleting activity booking fees:', error);
    }

    const { data: days } = await supabase.from('itinerary_days').select('id').eq('journey_id', tripId);
    const dayIds = days?.map(d => d.id) || [];

    if (dayIds.length > 0) {
      const { error: accomError } = await supabase.from('accommodations').delete().in('day_id', dayIds);
      if (accomError) console.error('Error deleting accommodations:', accomError);

      const { error: activitiesError } = await supabase.from('activities').delete().in('day_id', dayIds);
      if (activitiesError) console.error('Error deleting activities:', activitiesError);

      const { error: diningError } = await supabase.from('dining').delete().in('day_id', dayIds);
      if (diningError) console.error('Error deleting dining:', diningError);

      const { error: transportError } = await supabase.from('transportation').delete().in('day_id', dayIds);
      if (transportError) console.error('Error deleting transportation:', transportError);

      const { error: vehicleAssignError } = await supabase.from('journey_vehicle_day_assignments').delete().in('day_id', dayIds);
      if (vehicleAssignError) console.error('Error deleting vehicle assignments:', vehicleAssignError);
    }

    const { error: entriesError } = await supabase.from('itinerary_entries').delete().eq('journey_id', tripId);
    if (entriesError) console.error('Error deleting itinerary entries:', entriesError);

    const { error: daysError } = await supabase.from('itinerary_days').delete().eq('journey_id', tripId);
    if (daysError) console.error('Error deleting itinerary days:', daysError);

    const { data: uploadedDocs } = await supabase.from('uploaded_documents').select('id').eq('journey_id', tripId);
    const docIds = uploadedDocs?.map(d => d.id) || [];

    if (docIds.length > 0) {
      const { data: ocrExtractions } = await supabase.from('ocr_extractions').select('id').in('document_id', docIds);
      const extractionIds = ocrExtractions?.map(e => e.id) || [];

      if (extractionIds.length > 0) {
        const { error } = await supabase.from('ocr_itinerary_items').delete().in('extraction_id', extractionIds);
        if (error) console.error('Error deleting OCR items:', error);
      }
      const { error } = await supabase.from('ocr_extractions').delete().in('document_id', docIds);
      if (error) console.error('Error deleting OCR extractions:', error);
    }

    await supabase.from('uploaded_documents').delete().eq('journey_id', tripId);
    await supabase.from('uploaded_files').delete().eq('journey_id', tripId);
    await supabase.from('extracted_itinerary_data').delete().eq('journey_id', tripId);
    await supabase.from('properties').delete().eq('journey_id', tripId);
    await supabase.from('shared_links').delete().eq('journey_id', tripId);
    await supabase.from('journey_assignments').delete().eq('journey_id', tripId);
    await supabase.from('journey_share_links').delete().eq('journey_id', tripId);
    await supabase.from('journey_shares').delete().eq('journey_id', tripId);
    await supabase.from('journey_staff').delete().eq('journey_id', tripId);
    await supabase.from('journey_transportation_providers').delete().eq('journey_id', tripId);
    await supabase.from('journey_vehicles').delete().eq('journey_id', tripId);
    await supabase.from('journey_gear').delete().eq('journey_id', tripId);
    await supabase.from('journey_documents').delete().eq('journey_id', tripId);

    const { error: journeyError } = await supabase.from('journeys').delete().eq('id', tripId);
    if (journeyError) {
      console.error('Error deleting journey:', journeyError);
      throw new Error(`Failed to delete journey: ${journeyError.message}`);
    }
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeleteDialog.trip) return;

    try {
      await deleteTripPermanently(permanentDeleteDialog.trip.id);

      await fetchArchivedTrips();
      setPermanentDeleteDialog({ isOpen: false, trip: null });
    } catch (error: any) {
      console.error('Error permanently deleting trip:', error);
      alert(`Failed to permanently delete trip: ${error?.message || 'Please try again.'}`);
    }
  };

  const filteredTrips = archivedTrips.filter(trip => {
    const customerData: any = trip.customers;
    const customerName = customerData?.name || '';
    return (
      trip.journey_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customerName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-brand-brown flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-brand-terracotta" />
            Trash
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Archived journeys can be restored or permanently deleted
          </p>
        </div>
        {archivedTrips.length > 0 && (
          <button
            onClick={() => setEmptyTrashDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Empty Trash ({archivedTrips.length})
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search archived journeys..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-600">Loading archived trips...</p>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Trash2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No archived trips</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrips.map((trip) => {
            const customerData: any = trip.customers;
            return (
              <div
                key={trip.id}
                className="bg-white rounded-xl border border-slate-200 p-6 relative opacity-75 hover:opacity-100 transition-opacity"
              >
                <div className="mb-4">
                  <div className="flex items-center space-x-2 text-sm text-slate-600 mb-1">
                    <Users className="w-4 h-4" />
                    <span>{customerData?.name}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-brand-brown">
                    {trip.journey_name}
                  </h3>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center space-x-2 text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-600">
                    <MapPin className="w-4 h-4" />
                    <span>{trip.duration_days} days</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => setRestoreDialog({ isOpen: true, trip })}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Restore</span>
                  </button>
                  <button
                    onClick={() => setPermanentDeleteDialog({ isOpen: true, trip })}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={restoreDialog.isOpen}
        onClose={() => setRestoreDialog({ isOpen: false, trip: null })}
        onConfirm={handleRestoreTrip}
        title="Restore Journey"
        message={`Are you sure you want to restore "${restoreDialog.trip?.journey_name}"? This will move the journey back to your active journeys.`}
        confirmText="Restore Journey"
        type="primary"
      />

      <ConfirmDialog
        isOpen={permanentDeleteDialog.isOpen}
        onClose={() => setPermanentDeleteDialog({ isOpen: false, trip: null })}
        onConfirm={handlePermanentDelete}
        title="Permanently Delete Journey"
        message={`Are you sure you want to permanently delete "${permanentDeleteDialog.trip?.journey_name}"? This will remove the journey and all associated data forever. This action cannot be undone.`}
        confirmText="Permanently Delete"
        type="danger"
      />

      <ConfirmDialog
        isOpen={emptyTrashDialog}
        onClose={() => setEmptyTrashDialog(false)}
        onConfirm={handleEmptyTrash}
        title="Empty Trash"
        message={`Are you sure you want to permanently delete ALL ${archivedTrips.length} archived journey${archivedTrips.length !== 1 ? 's' : ''}? This action cannot be undone and will delete all associated data including days, accommodations, activities, and documents for every journey in the trash.`}
        confirmText={`Empty Trash (Delete ${archivedTrips.length})`}
        type="danger"
      />
    </div>
  );
}
