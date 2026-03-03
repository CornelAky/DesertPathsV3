import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Save, User, Phone, Users, FileText, Share2, Home } from 'lucide-react';
import type { Journey, Customer } from '../../lib/database.types';
import { ShareManager } from './ShareManager';
import { BookingFeeSummary } from './BookingFeeSummary';
import { JourneyDocumentsBriefing } from './JourneyDocumentsBriefing';
import { safeParseInt } from '../../lib/numberValidation';

interface JourneyEditorProps {
  journey: Journey;
  onClose: () => void;
  onSave: () => void;
  onHome?: () => void;
}

export function JourneyEditor({ journey, onClose, onSave, onHome }: JourneyEditorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showShareManager, setShowShareManager] = useState(false);

  const [journeyData, setJourneyData] = useState({
    journey_name: journey.journey_name,
    start_date: journey.start_date,
    end_date: journey.end_date,
    duration_days: journey.duration_days,
    status: journey.status,
    description: journey.description || '',
    notes: journey.notes || '',
    passenger_count: (journey as any).passenger_count || 1,
    client_phone: (journey as any).client_phone || ''
  });

  const [customerData, setCustomerData] = useState({
    name: '',
    contact_number: '',
    email: '',
    notes: ''
  });

  useEffect(() => {
    fetchCustomer();
  }, [journey.customer_id]);

  const fetchCustomer = async () => {
    if (!journey.customer_id) return;

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, contact_number, email, notes')
        .eq('id', journey.customer_id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCustomer(data);
        setCustomerData({
          name: data.name,
          contact_number: data.contact_number,
          email: data.email || '',
          notes: data.notes || ''
        });
      }
    } catch (err) {
      console.error('Error fetching customer:', err);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const startDateChanged = journey.start_date !== journeyData.start_date;

      const { error: tripError } = await supabase
        .from('journeys')
        .update({
          journey_name: journeyData.journey_name,
          start_date: journeyData.start_date,
          end_date: journeyData.end_date,
          duration_days: journeyData.duration_days,
          status: journeyData.status,
          description: journeyData.description,
          notes: journeyData.notes,
          passenger_count: journeyData.passenger_count,
          client_phone: journeyData.client_phone
        })
        .eq('id', journey.id);

      if (tripError) throw tripError;

      if (startDateChanged && journeyData.start_date) {
        const { data: days, error: daysError } = await supabase
          .from('itinerary_days')
          .select('id, day_number')
          .eq('journey_id', journey.id);

        if (daysError) throw daysError;

        if (days && days.length > 0) {
          const startDate = new Date(journeyData.start_date);
          const updates = days.map(day => {
            const dayDate = new Date(startDate);
            dayDate.setDate(startDate.getDate() + (day.day_number - 1));
            return {
              id: day.id,
              date: dayDate.toISOString().split('T')[0]
            };
          });

          for (const update of updates) {
            const { error: updateError } = await supabase
              .from('itinerary_days')
              .update({ date: update.date })
              .eq('id', update.id);

            if (updateError) throw updateError;
          }
        }
      }

      if (customer) {
        const { error: customerError } = await supabase
          .from('customers')
          .update({
            name: customerData.name,
            contact_number: customerData.contact_number,
            email: customerData.email,
            notes: customerData.notes
          })
          .eq('id', customer.id);

        if (customerError) throw customerError;
      }

      await onSave();
      onClose();
    } catch (err) {
      console.error('Error saving:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-brand-brown bg-opacity-20 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Edit Journey & Client Details</h2>
          <div className="flex items-center gap-2">
            {onHome && (
              <button
                onClick={onHome}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                title="Go to home page"
              >
                <Home className="w-5 h-5" />
                <span className="hidden sm:inline">Home</span>
              </button>
            )}
            <button
              onClick={() => setShowShareManager(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              title="Share this journey"
            >
              <Share2 className="w-5 h-5" />
              <span className="hidden sm:inline">Share</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Journey Information
                </h3>

                <div className="space-y-4">
                  {customer && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        <User className="w-4 h-4 inline mr-1" />
                        Client Name
                      </label>
                      <input
                        type="text"
                        value={customerData.name}
                        onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Journey Name
                    </label>
                    <input
                      type="text"
                      value={journeyData.journey_name}
                      onChange={(e) => setJourneyData({ ...journeyData, journey_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={journeyData.start_date}
                        onChange={(e) => setJourneyData({ ...journeyData, start_date: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={journeyData.end_date}
                        onChange={(e) => setJourneyData({ ...journeyData, end_date: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Duration (Days)
                      </label>
                      <input
                        type="number"
                        value={journeyData.duration_days}
                        onChange={(e) => setJourneyData({ ...journeyData, duration_days: safeParseInt(e.target.value, 1) || 1 })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Status
                      </label>
                      <select
                        value={journeyData.status}
                        onChange={(e) => setJourneyData({ ...journeyData, status: e.target.value as any })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        <Users className="w-4 h-4 inline mr-1" />
                        Passenger Count
                      </label>
                      <input
                        type="number"
                        value={journeyData.passenger_count}
                        onChange={(e) => setJourneyData({ ...journeyData, passenger_count: safeParseInt(e.target.value, 1) || 1 })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        <Phone className="w-4 h-4 inline mr-1" />
                        Client Phone
                      </label>
                      <input
                        type="tel"
                        value={journeyData.client_phone}
                        onChange={(e) => setJourneyData({ ...journeyData, client_phone: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Quick contact"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={journeyData.description}
                      onChange={(e) => setJourneyData({ ...journeyData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Brief description of the journey"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Admin Notes
                    </label>
                    <textarea
                      value={journeyData.notes}
                      onChange={(e) => setJourneyData({ ...journeyData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Internal notes about the journey"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Client Information
                </h3>

                {customer ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Contact Number
                      </label>
                      <input
                        type="tel"
                        value={customerData.contact_number}
                        onChange={(e) => setCustomerData({ ...customerData, contact_number: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={customerData.email}
                        onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Customer Notes
                      </label>
                      <textarea
                        value={customerData.notes}
                        onChange={(e) => setCustomerData({ ...customerData, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Additional notes about the customer"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <p>No customer associated with this trip</p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Quick Reference</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Journey ID:</strong> {journey.id.slice(0, 8)}</p>
                  <p><strong>Created:</strong> {new Date(journey.created_at).toLocaleDateString()}</p>
                  <p><strong>Last Updated:</strong> {new Date(journey.updated_at).toLocaleDateString()}</p>
                </div>
              </div>

              <BookingFeeSummary journeyId={journey.id} />
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Trip Documents & Briefing
            </h3>
            <JourneyDocumentsBriefing journeyId={journey.id} />
          </div>
        </div>

        <div className="p-6 border-t bg-slate-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {showShareManager && (
        <ShareManager
          journeyId={journey.id}
          tripName={journey.journey_name}
          onClose={() => setShowShareManager(false)}
        />
      )}
    </div>
  );
}
