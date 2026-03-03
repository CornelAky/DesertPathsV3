import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, X, Check } from 'lucide-react';
import { safeParseFloat } from '../../lib/numberValidation';

interface ItineraryEntryFeeEditorProps {
  entryId: string;
  guestFee: number | null;
  guideFee: number | null;
  feeCurrency: string | null;
  feeStatus: string | null;
  bookingReference: string | null;
  feeNotes: string | null;
  onSave: () => void;
  onCancel: () => void;
}

export function ItineraryEntryFeeEditor({
  entryId,
  guestFee,
  guideFee,
  feeCurrency,
  feeStatus,
  bookingReference,
  feeNotes,
  onSave,
  onCancel,
}: ItineraryEntryFeeEditorProps) {
  const [values, setValues] = useState({
    guestFee: guestFee?.toString() || '',
    guideFee: guideFee?.toString() || '',
    feeCurrency: feeCurrency || 'SAR',
    feeStatus: feeStatus || 'pending',
    bookingReference: bookingReference || '',
    feeNotes: feeNotes || '',
  });
  const [applyToBoth, setApplyToBoth] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('Saving fees for activity:', entryId);

      const { data: existingFees, error: fetchError } = await supabase
        .from('activity_booking_fees')
        .select('*')
        .eq('activity_id', entryId);

      if (fetchError) {
        console.error('Error fetching existing fees:', fetchError);
        throw fetchError;
      }

      console.log('Existing fees:', existingFees);

      const existingGuestFee = existingFees?.find((fee) => fee.applies_to === 'guest');
      const existingGuideFee = existingFees?.find((fee) => fee.applies_to === 'guide');

      if (values.guestFee && (safeParseFloat(values.guestFee, 0) || 0) > 0) {
        const guestFeeData = {
          activity_id: entryId,
          applies_to: 'guest',
          amount: safeParseFloat(values.guestFee, 0) || 0,
          currency: values.feeCurrency || 'SAR',
          booking_required: true,
          status: values.feeStatus || 'pending',
          booking_reference: values.bookingReference || null,
          notes: values.feeNotes || null,
          guest_count: existingGuestFee?.guest_count || 1,
          staff_count: existingGuestFee?.staff_count || 0,
        };

        if (existingGuestFee) {
          const { error: updateError } = await supabase
            .from('activity_booking_fees')
            .update(guestFeeData)
            .eq('id', existingGuestFee.id);

          if (updateError) {
            console.error('Error updating guest fee:', updateError);
            throw updateError;
          }
          console.log('Updated guest fee');
        } else {
          const { error: insertError } = await supabase
            .from('activity_booking_fees')
            .insert([guestFeeData]);

          if (insertError) {
            console.error('Error inserting guest fee:', insertError);
            throw insertError;
          }
          console.log('Inserted guest fee');
        }
      } else if (existingGuestFee) {
        const { error: deleteError } = await supabase
          .from('activity_booking_fees')
          .delete()
          .eq('id', existingGuestFee.id);

        if (deleteError) {
          console.error('Error deleting guest fee:', deleteError);
          throw deleteError;
        }
        console.log('Deleted guest fee');
      }

      if (values.guideFee && (safeParseFloat(values.guideFee, 0) || 0) > 0) {
        const guideFeeData = {
          activity_id: entryId,
          applies_to: 'guide',
          amount: safeParseFloat(values.guideFee, 0) || 0,
          currency: values.feeCurrency || 'SAR',
          booking_required: true,
          status: values.feeStatus || 'pending',
          booking_reference: values.bookingReference || null,
          notes: values.feeNotes || null,
          guest_count: existingGuideFee?.guest_count || 0,
          staff_count: existingGuideFee?.staff_count || 1,
        };

        if (existingGuideFee) {
          const { error: updateError } = await supabase
            .from('activity_booking_fees')
            .update(guideFeeData)
            .eq('id', existingGuideFee.id);

          if (updateError) {
            console.error('Error updating guide fee:', updateError);
            throw updateError;
          }
          console.log('Updated guide fee');
        } else {
          const { error: insertError } = await supabase
            .from('activity_booking_fees')
            .insert([guideFeeData]);

          if (insertError) {
            console.error('Error inserting guide fee:', insertError);
            throw insertError;
          }
          console.log('Inserted guide fee');
        }
      } else if (existingGuideFee) {
        const { error: deleteError } = await supabase
          .from('activity_booking_fees')
          .delete()
          .eq('id', existingGuideFee.id);

        if (deleteError) {
          console.error('Error deleting guide fee:', deleteError);
          throw deleteError;
        }
        console.log('Deleted guide fee');
      }

      console.log('Fees saved successfully');
      onSave();
    } catch (err) {
      console.error('Error saving fees:', err);
      alert('Failed to save fees');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-50 border-t border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <DollarSign className="w-4 h-4 text-blue-600" />
          <h4 className="text-sm font-semibold text-slate-700">Booking Fees</h4>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="p-1 text-green-600 hover:text-green-700 transition-colors"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mb-3">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={applyToBoth}
            onChange={(e) => {
              setApplyToBoth(e.target.checked);
              if (e.target.checked && values.guestFee) {
                setValues({ ...values, guideFee: values.guestFee });
              }
            }}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700 font-medium">Apply same fee to both guest and guide</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Guest Fee
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={values.guestFee}
            onChange={(e) => {
              const newValue = e.target.value;
              setValues({
                ...values,
                guestFee: newValue,
                guideFee: applyToBoth ? newValue : values.guideFee
              });
            }}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Guide Fee
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={values.guideFee}
            onChange={(e) => setValues({ ...values, guideFee: e.target.value })}
            disabled={applyToBoth}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Currency
          </label>
          <select
            value={values.feeCurrency}
            onChange={(e) => setValues({ ...values, feeCurrency: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="SAR">SAR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Status
          </label>
          <select
            value={values.feeStatus}
            onChange={(e) => setValues({ ...values, feeStatus: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="pending">Pending</option>
            <option value="booked">Booked</option>
            <option value="not_required">Not Required</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Booking Reference
          </label>
          <input
            type="text"
            value={values.bookingReference}
            onChange={(e) => setValues({ ...values, bookingReference: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional booking reference"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Fee Notes
          </label>
          <textarea
            value={values.feeNotes}
            onChange={(e) => setValues({ ...values, feeNotes: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional notes about the fees"
          />
        </div>
      </div>
    </div>
  );
}
