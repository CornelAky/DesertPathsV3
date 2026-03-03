import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Users, MapPin, Trash2, Eye, Copy as CopyIcon, BookCopy } from 'lucide-react';
import type { Trip } from '../../lib/database.types';
import { ConfirmDialog } from './ConfirmDialog';

interface GuideCopy extends Trip {
  customers?: { name: string };
  creator?: { name: string; email: string };
}

export function GuideCopiesView() {
  const { userProfile } = useAuth();
  const [copies, setCopies] = useState<GuideCopy[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; copy: GuideCopy | null }>({
    isOpen: false,
    copy: null,
  });

  const isAdmin = userProfile?.role === 'admin';

  useEffect(() => {
    fetchGuideCopies();
  }, [userProfile]);

  async function fetchGuideCopies() {
    try {
      let query = supabase
        .from('journeys')
        .select(`
          id,
          customer_id,
          journey_name,
          start_date,
          end_date,
          duration_days,
          created_by,
          original_trip_id,
          created_at,
          updated_at,
          customers(name),
          creator:created_by(name, email)
        `)
        .eq('is_driver_copy', true);

      if (!isAdmin) {
        query = query.eq('created_by', userProfile?.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setCopies(data || []);
    } catch (error) {
      console.error('Error fetching guide copies:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCopy() {
    if (!deleteDialog.copy) return;

    try {
      const { error } = await supabase
        .from('journeys')
        .delete()
        .eq('id', deleteDialog.copy.id);

      if (error) throw error;

      await fetchGuideCopies();
      setDeleteDialog({ isOpen: false, copy: null });
    } catch (error: any) {
      console.error('Error deleting guide copy:', error);
      alert(`Failed to delete guide copy: ${error?.message || 'Please try again.'}`);
    }
  }

  function canDelete(copy: GuideCopy): boolean {
    if (isAdmin) return true;
    return copy.created_by === userProfile?.id;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading guide copies...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BookCopy className="w-6 h-6 text-brand-terracotta" />
          {isAdmin ? 'All Guide Copies' : 'My Guide Copies'}
        </h2>
        <p className="text-slate-600 mt-1">
          {isAdmin
            ? 'View and manage all guide copies created by any guide in the system'
            : 'View and manage your personal guide copies'}
        </p>
      </div>

      {copies.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <CopyIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500 mb-2">No guide copies found</p>
          <p className="text-sm text-slate-400">
            {isAdmin
              ? 'Guides can create personal copies of trips that will appear here'
              : 'You can create guide copies from the Shared with Me tab'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {copies.map((copy) => {
            const customerData: any = copy.customers;
            const creatorData: any = copy.creator;
            const canDeleteCopy = canDelete(copy);

            return (
              <div
                key={copy.id}
                className="bg-white rounded-xl border border-slate-200 hover:shadow-lg transition-shadow group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          Guide Copy
                        </span>
                        {isAdmin && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                            {creatorData?.name || 'Unknown'}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2">
                        {copy.journey_name}
                      </h3>
                      {customerData && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                          <Users className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{customerData.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {copy.start_date && copy.end_date && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">
                          {new Date(copy.start_date).toLocaleDateString()} -{' '}
                          {new Date(copy.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span>{copy.duration_days} days</span>
                    </div>
                    {copy.original_trip_id && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                        <CopyIcon className="w-3 h-3" />
                        <span>Copied from original trip</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200">
                    {canDeleteCopy && (
                      <button
                        onClick={() => setDeleteDialog({ isOpen: true, copy })}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                        title="Delete guide copy"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, copy: null })}
        onConfirm={handleDeleteCopy}
        title="Delete Guide Copy"
        message={`Are you sure you want to permanently delete "${deleteDialog.copy?.journey_name}"? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
