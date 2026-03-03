import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Plus, Trash2, FileText, List, AlertCircle } from 'lucide-react';

interface BulkAccommodationModalProps {
  dayId: string;
  onClose: () => void;
  onSave: () => void;
}

interface AccommodationRow {
  id: string;
  hotel_name: string;
  location_address: string;
  check_in_time: string;
  check_out_time: string;
  confirmation_number: string;
  guide_notes: string;
}

export default function BulkAccommodationModal({ dayId, onClose, onSave }: BulkAccommodationModalProps) {
  const [mode, setMode] = useState<'form' | 'text'>('form');
  const [accommodations, setAccommodations] = useState<AccommodationRow[]>([
    {
      id: '1',
      hotel_name: '',
      location_address: '',
      check_in_time: '',
      check_out_time: '',
      confirmation_number: '',
      guide_notes: '',
    },
  ]);
  const [textInput, setTextInput] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const addRow = () => {
    const newRow: AccommodationRow = {
      id: Date.now().toString(),
      hotel_name: '',
      location_address: '',
      check_in_time: '',
      check_out_time: '',
      confirmation_number: '',
      guide_notes: '',
    };
    setAccommodations([...accommodations, newRow]);
  };

  const removeRow = (id: string) => {
    if (accommodations.length === 1) return;
    setAccommodations(accommodations.filter((a) => a.id !== id));
  };

  const updateRow = (id: string, field: keyof AccommodationRow, value: string) => {
    setAccommodations(
      accommodations.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const parseTextInput = () => {
    setParseError(null);
    const lines = textInput.trim().split('\n').filter(line => line.trim() !== '');

    if (lines.length === 0) {
      setParseError('No accommodations found in the text');
      return;
    }

    const parsed: AccommodationRow[] = [];

    lines.forEach((line, index) => {
      line = line.trim();

      const patterns = [
        /^(.+?)\s*[-–—]\s*(.+?)\s*[-–—]\s*(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})$/,
        /^(.+?)\s*[-–—]\s*(.+)$/,
      ];

      let matched = false;

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          if (pattern.source.includes('(\\d{1,2}:\\d{2})')) {
            const hotelName = match[1].trim();
            const address = match[2].trim();
            const checkIn = match[3];
            const checkOut = match[4];

            const [checkInHours, checkInMinutes] = checkIn.split(':');
            const [checkOutHours, checkOutMinutes] = checkOut.split(':');

            parsed.push({
              id: `parsed-${index}`,
              hotel_name: hotelName,
              location_address: address,
              check_in_time: `${checkInHours.padStart(2, '0')}:${checkInMinutes.padStart(2, '0')}`,
              check_out_time: `${checkOutHours.padStart(2, '0')}:${checkOutMinutes.padStart(2, '0')}`,
              confirmation_number: '',
              guide_notes: '',
            });
          } else {
            parsed.push({
              id: `parsed-${index}`,
              hotel_name: match[1].trim(),
              location_address: match[2].trim(),
              check_in_time: '',
              check_out_time: '',
              confirmation_number: '',
              guide_notes: '',
            });
          }
          matched = true;
          break;
        }
      }

      if (!matched && line.length > 0) {
        parsed.push({
          id: `parsed-${index}`,
          hotel_name: line,
          location_address: 'To be determined',
          check_in_time: '',
          check_out_time: '',
          confirmation_number: '',
          guide_notes: '',
        });
      }
    });

    if (parsed.length === 0) {
      setParseError('Could not parse any accommodations from the text');
      return;
    }

    setAccommodations(parsed);
    setMode('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validAccommodations = accommodations.filter(
        (a) => a.hotel_name.trim() !== '' || a.location_address.trim() !== '' || a.check_in_time.trim() !== '' || a.check_out_time.trim() !== ''
      );

      if (validAccommodations.length === 0) {
        alert('Please add at least one accommodation with some information');
        setLoading(false);
        return;
      }

      const insertData = validAccommodations.map((accommodation) => ({
        day_id: dayId,
        hotel_name: accommodation.hotel_name.trim() || '',
        location_address: accommodation.location_address.trim() || '',
        check_in_time: accommodation.check_in_time || null,
        check_out_time: accommodation.check_out_time || null,
        confirmation_number: accommodation.confirmation_number.trim() || '',
        guide_notes: accommodation.guide_notes.trim() || '',
        booking_status: 'pending' as const,
        payment_status: 'pending' as const,
        payment_type: 'full' as const,
        access_method: 'front_desk' as const,
        accommodation_type: ['guest'] as ('guest' | 'staff')[],
        breakfast_included: false,
        breakfast_location: null,
        lunch_included: false,
        lunch_location: null,
        dinner_included: false,
        dinner_location: null,
      }));

      const { error } = await supabase.from('accommodations').insert(insertData);

      if (error) throw error;

      onSave();
    } catch (error: any) {
      console.error('Error saving accommodations:', error);
      const errorMessage = error?.message || error?.error_description || 'Unknown error occurred';
      alert(`Failed to save accommodations: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Bulk Add Accommodations</h2>
            <p className="text-sm text-slate-600 mt-1">
              Add multiple accommodations at once - either manually or by pasting a list
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setMode('form')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                mode === 'form'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <List className="w-4 h-4" />
              Manual Form
            </button>
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                mode === 'text'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              Paste Text
            </button>
          </div>

          {mode === 'text' ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">How to use text input:</h4>
                <p className="text-sm text-blue-800 mb-2">Paste your accommodations in any of these formats:</p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Grand Hotel Paris - 123 Main Street - 15:00 - 11:00</li>
                  <li>Sunset Resort - 456 Beach Road</li>
                  <li>Just hotel name (address will be "To be determined")</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Paste your accommodations (one per line):
                </label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={12}
                  placeholder="Grand Hotel Paris - 123 Main Street - 15:00 - 11:00&#10;Sunset Beach Resort - 456 Ocean Drive&#10;Mountain Lodge - 789 Peak Road"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-none"
                />
              </div>

              {parseError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={parseTextInput}
                className="w-full px-4 py-3 bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold rounded-lg transition-colors"
              >
                Parse & Convert to Form
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="grid grid-cols-12 gap-3 text-sm font-medium text-slate-700 mb-2">
                  <div className="col-span-3">Hotel Name</div>
                  <div className="col-span-3">Address</div>
                  <div className="col-span-2">Check-in</div>
                  <div className="col-span-2">Check-out</div>
                  <div className="col-span-2">Actions</div>
                </div>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {accommodations.map((accommodation, index) => (
                  <div
                    key={accommodation.id}
                    className="grid grid-cols-12 gap-3 items-start p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                  >
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={accommodation.hotel_name}
                        onChange={(e) =>
                          updateRow(accommodation.id, 'hotel_name', e.target.value)
                        }
                        placeholder="Hotel name"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={accommodation.location_address}
                        onChange={(e) =>
                          updateRow(accommodation.id, 'location_address', e.target.value)
                        }
                        placeholder="Address"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="time"
                        value={accommodation.check_in_time}
                        onChange={(e) =>
                          updateRow(accommodation.id, 'check_in_time', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="time"
                        value={accommodation.check_out_time}
                        onChange={(e) =>
                          updateRow(accommodation.id, 'check_out_time', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="col-span-2 flex gap-2">
                      <button
                        type="button"
                        onClick={removeRow.bind(null, accommodation.id)}
                        disabled={accommodations.length === 1}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {index === accommodations.length - 1 && (
                        <button
                          type="button"
                          onClick={addRow}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Add row"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addRow}
                className="w-full py-2 border-2 border-dashed border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Another Accommodation
              </button>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Quick Entry Mode</p>
                    <p>
                      Enter just the hotel name, address, and check-in/out times for each accommodation. You can edit
                      detailed information (booking status, meal arrangements, images, etc.) later by clicking on each
                      accommodation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : `Add ${accommodations.filter(a => a.hotel_name.trim() || a.location_address.trim() || a.check_in_time.trim() || a.check_out_time.trim()).length} Accommodations`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
