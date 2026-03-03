import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { safeParseFloat } from '../../lib/numberValidation';
import { logger } from '../../lib/logger';

interface BookingFeeSummaryProps {
  journeyId: string;
}

interface ItineraryEntry {
  id: string;
  guest_fee: number | null;
  guide_fee: number | null;
  fee_currency: string | null;
  fee_status: string | null;
}

interface FeeSummary {
  currency: string;
  guestTotal: number;
  guideTotal: number;
  total: number;
  bookedCount: number;
  pendingCount: number;
  notRequiredCount: number;
}

export function BookingFeeSummary({ journeyId }: BookingFeeSummaryProps) {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<FeeSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isManagerOrAdmin = userProfile?.role === 'manager' || userProfile?.role === 'admin';

  useEffect(() => {
    if (isManagerOrAdmin) {
      loadBookingFees();
    } else {
      setLoading(false);
    }
  }, [journeyId, isManagerOrAdmin]);

  const loadBookingFees = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: itineraryEntries, error: entriesError } = await supabase
        .from('itinerary_entries')
        .select('id, guest_fee, guide_fee, fee_currency, fee_status')
        .eq('journey_id', journeyId);

      if (entriesError) throw entriesError;

      if (!itineraryEntries || itineraryEntries.length === 0) {
        setSummaries([]);
        setLoading(false);
        return;
      }

      const entriesWithFees = itineraryEntries.filter(
        (entry: ItineraryEntry) => entry.guest_fee !== null || entry.guide_fee !== null
      );

      if (entriesWithFees.length === 0) {
        setSummaries([]);
        setLoading(false);
        return;
      }

      const summaryMap = new Map<string, FeeSummary>();

      entriesWithFees.forEach((entry: ItineraryEntry) => {
        const currency = entry.fee_currency || 'SAR';

        if (!summaryMap.has(currency)) {
          summaryMap.set(currency, {
            currency,
            guestTotal: 0,
            guideTotal: 0,
            total: 0,
            bookedCount: 0,
            pendingCount: 0,
            notRequiredCount: 0,
          });
        }

        const summary = summaryMap.get(currency)!;

        if (entry.guest_fee !== null) {
          const guestAmount = safeParseFloat(entry.guest_fee, 0) || 0;
          summary.guestTotal += guestAmount;
          summary.total += guestAmount;
        }

        if (entry.guide_fee !== null) {
          const guideAmount = safeParseFloat(entry.guide_fee, 0) || 0;
          summary.guideTotal += guideAmount;
          summary.total += guideAmount;
        }

        if (entry.fee_status === 'booked') {
          summary.bookedCount++;
        } else if (entry.fee_status === 'pending') {
          summary.pendingCount++;
        } else if (entry.fee_status === 'not_required') {
          summary.notRequiredCount++;
        }
      });

      setSummaries(Array.from(summaryMap.values()));
      setLoading(false);
    } catch (err) {
      logger.error('Error loading booking fees', err as Error);
      setError('Failed to load booking fee summary');
      setLoading(false);
    }
  };

  if (!isManagerOrAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="ml-2 text-sm text-slate-600">Loading booking fees...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg border border-red-200 p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center space-x-3 mb-2">
          <DollarSign className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900">Booking Fee Summary</h3>
        </div>
        <p className="text-sm text-slate-600">
          No booking fees have been added to activities yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <DollarSign className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-slate-900">Booking Fee Summary</h3>
      </div>

      <div className="space-y-4">
        {summaries.map((summary) => (
          <div key={summary.currency} className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">
                Currency: {summary.currency}
              </span>
              <span className="text-lg font-bold text-blue-600">
                {summary.total.toFixed(2)} {summary.currency}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-slate-50 rounded p-3">
                <div className="text-xs text-slate-600 mb-1">Guest Fees</div>
                <div className="text-sm font-semibold text-slate-900">
                  {summary.guestTotal.toFixed(2)} {summary.currency}
                </div>
              </div>
              <div className="bg-slate-50 rounded p-3">
                <div className="text-xs text-slate-600 mb-1">Guide Fees</div>
                <div className="text-sm font-semibold text-slate-900">
                  {summary.guideTotal.toFixed(2)} {summary.currency}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-200 pt-3">
              <div className="flex items-center space-x-4">
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                  Booked: {summary.bookedCount}
                </span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>
                  Pending: {summary.pendingCount}
                </span>
                {summary.notRequiredCount > 0 && (
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-slate-400 rounded-full mr-1"></span>
                    Not Required: {summary.notRequiredCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
