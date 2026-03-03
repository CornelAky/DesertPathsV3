import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, X, Users, Calculator } from 'lucide-react';
import { safeParseFloat, safeParseInt } from '../../lib/numberValidation';

interface BookingFee {
  id?: string;
  applies_to: 'guest' | 'guide' | 'both';
  amount: number;
  unit_price: number;
  fee_calculation_type: 'per_person' | 'per_group';
  currency: string;
  status: string;
  booking_required: boolean;
  booking_reference: string | null;
  notes: string | null;
  guest_count: number;
  staff_count: number;
}

interface BookingFeeEditorProps {
  itemId: string;
  itemType: 'activity' | 'transportation' | 'accommodation' | 'dining';
  onClose: () => void;
  onSaved?: () => void;
}

export function BookingFeeEditor({ itemId, itemType, onClose, onSaved }: BookingFeeEditorProps) {
  const [fees, setFees] = useState<BookingFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const tableName = `${itemType}_booking_fees`;
  const foreignKeyColumn = `${itemType}_id`;

  useEffect(() => {
    fetchFees();
  }, [itemId, itemType]);

  const fetchFees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq(foreignKeyColumn, itemId);

      if (error) throw error;

      if (data && data.length > 0) {
        setFees(data.map(fee => ({
          id: fee.id,
          applies_to: fee.applies_to,
          amount: fee.amount || 0,
          unit_price: fee.unit_price || 0,
          fee_calculation_type: fee.fee_calculation_type || 'per_group',
          currency: fee.currency || 'SAR',
          status: fee.status || 'pending',
          booking_required: fee.booking_required || false,
          booking_reference: fee.booking_reference,
          notes: fee.notes,
          guest_count: fee.guest_count || 1,
          staff_count: fee.staff_count || 0,
        })));
      } else {
        setFees([createEmptyFee()]);
      }
    } catch (error) {
      console.error('Error fetching booking fees:', error);
      setFees([createEmptyFee()]);
    } finally {
      setLoading(false);
    }
  };

  const createEmptyFee = (): BookingFee => ({
    applies_to: 'guest',
    amount: 0,
    unit_price: 0,
    fee_calculation_type: 'per_person',
    currency: 'SAR',
    status: 'pending',
    booking_required: true,
    booking_reference: null,
    notes: null,
    guest_count: 1,
    staff_count: 0,
  });

  const calculateTotalAmount = (fee: BookingFee): number => {
    if (fee.fee_calculation_type === 'per_person') {
      return fee.unit_price * (fee.guest_count + fee.staff_count);
    }
    return fee.amount;
  };

  const updateFee = (index: number, field: keyof BookingFee, value: any) => {
    const newFees = [...fees];
    newFees[index] = { ...newFees[index], [field]: value };

    if (field === 'unit_price' || field === 'guest_count' || field === 'staff_count') {
      if (newFees[index].fee_calculation_type === 'per_person') {
        newFees[index].amount = calculateTotalAmount(newFees[index]);
      }
    }

    if (field === 'fee_calculation_type' && value === 'per_person') {
      newFees[index].amount = calculateTotalAmount(newFees[index]);
    }

    setFees(newFees);
  };

  const addFee = () => {
    setFees([...fees, createEmptyFee()]);
  };

  const removeFee = async (index: number) => {
    const fee = fees[index];
    if (fee.id) {
      try {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', fee.id);

        if (error) throw error;
      } catch (error) {
        console.error('Error deleting fee:', error);
        alert('Failed to delete fee');
        return;
      }
    }
    setFees(fees.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      for (const fee of fees) {
        const feeData: any = {
          [foreignKeyColumn]: itemId,
          applies_to: fee.applies_to,
          amount: calculateTotalAmount(fee),
          unit_price: fee.unit_price,
          fee_calculation_type: fee.fee_calculation_type,
          currency: fee.currency,
          status: fee.status,
          booking_required: fee.booking_required,
          booking_reference: fee.booking_reference || null,
          notes: fee.notes || null,
          guest_count: fee.guest_count,
          staff_count: fee.staff_count,
        };

        if (fee.id) {
          const { error } = await supabase
            .from(tableName)
            .update(feeData)
            .eq('id', fee.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from(tableName)
            .insert([feeData]);

          if (error) throw error;
        }
      }

      onSaved?.();
      await fetchFees();
    } catch (error) {
      console.error('Error saving booking fees:', error);
      let errorMessage = 'Unknown error occurred';
      if (error && typeof error === 'object') {
        if ('message' in error) {
          errorMessage = String(error.message);
        } else {
          errorMessage = JSON.stringify(error);
        }
      }
      alert(`Failed to save booking fees: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p>Loading booking fees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-brand-gray-3 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-brand-brown" />
            <h2 className="text-xl font-bold text-brand-navy">Booking Fees</h2>
          </div>
          <button onClick={onClose} className="text-brand-gray-1 hover:text-brand-charcoal">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {fees.map((fee, index) => (
            <div key={index} className="border border-brand-gray-3 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-brand-navy">Fee {index + 1}</h3>
                {fees.length > 1 && (
                  <button
                    onClick={() => removeFee(index)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-charcoal mb-1">
                    Applies To
                  </label>
                  <select
                    value={fee.applies_to}
                    onChange={(e) => updateFee(index, 'applies_to', e.target.value)}
                    className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg"
                  >
                    <option value="guest">Guest</option>
                    <option value="guide">Guide/Staff</option>
                    <option value="both">Both</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-charcoal mb-1">
                    Calculation Type
                  </label>
                  <select
                    value={fee.fee_calculation_type}
                    onChange={(e) => updateFee(index, 'fee_calculation_type', e.target.value)}
                    className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg"
                  >
                    <option value="per_person">Per Person</option>
                    <option value="per_group">Per Group (Fixed)</option>
                  </select>
                </div>

                {fee.fee_calculation_type === 'per_person' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-brand-charcoal mb-1">
                        Price Per PAX
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={fee.unit_price || ''}
                          onChange={(e) => updateFee(index, 'unit_price', safeParseFloat(e.target.value, 0))}
                          className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg"
                          placeholder="0.00"
                        />
                        <Calculator className="absolute right-3 top-2.5 w-5 h-5 text-brand-gray-1" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-brand-charcoal mb-1">
                        Number of Guests
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={fee.guest_count || ''}
                          onChange={(e) => updateFee(index, 'guest_count', safeParseInt(e.target.value, 0))}
                          className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg"
                          placeholder="1"
                        />
                        <Users className="absolute right-3 top-2.5 w-5 h-5 text-brand-gray-1" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-brand-charcoal mb-1">
                        Number of Staff
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={fee.staff_count || ''}
                          onChange={(e) => updateFee(index, 'staff_count', safeParseInt(e.target.value, 0))}
                          className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg"
                          placeholder="0"
                        />
                        <Users className="absolute right-3 top-2.5 w-5 h-5 text-brand-gray-1" />
                      </div>
                    </div>

                    <div className="bg-brand-cream rounded-lg p-4">
                      <label className="block text-sm font-medium text-brand-charcoal mb-1">
                        Total Amount (Auto-calculated)
                      </label>
                      <div className="text-2xl font-bold text-brand-brown">
                        {calculateTotalAmount(fee).toFixed(2)} {fee.currency}
                      </div>
                      <div className="text-xs text-brand-gray-1 mt-1">
                        {fee.unit_price} × ({fee.guest_count} guests + {fee.staff_count} staff)
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-brand-charcoal mb-1">
                      Total Amount (Fixed)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={fee.amount || ''}
                      onChange={(e) => updateFee(index, 'amount', safeParseFloat(e.target.value, 0))}
                      className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg"
                      placeholder="0.00"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-brand-charcoal mb-1">
                    Currency
                  </label>
                  <select
                    value={fee.currency}
                    onChange={(e) => updateFee(index, 'currency', e.target.value)}
                    className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg"
                  >
                    <option value="SAR">SAR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-charcoal mb-1">
                    Status
                  </label>
                  <select
                    value={fee.status}
                    onChange={(e) => updateFee(index, 'status', e.target.value)}
                    className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="n_a">N/A</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-charcoal mb-1">
                    Booking Reference
                  </label>
                  <input
                    type="text"
                    value={fee.booking_reference || ''}
                    onChange={(e) => updateFee(index, 'booking_reference', e.target.value)}
                    className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg"
                    placeholder="Reference number"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-brand-charcoal mb-1">
                    Notes
                  </label>
                  <textarea
                    value={fee.notes || ''}
                    onChange={(e) => updateFee(index, 'notes', e.target.value)}
                    className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg"
                    rows={2}
                    placeholder="Additional notes about this fee"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addFee}
            className="w-full py-2 border-2 border-dashed border-brand-gray-3 rounded-lg text-brand-brown hover:bg-brand-cream transition-colors"
          >
            + Add Another Fee
          </button>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-brand-gray-3 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-brand-gray-1 hover:text-brand-charcoal"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-brand-brown text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Fees'}
          </button>
        </div>
      </div>
    </div>
  );
}
