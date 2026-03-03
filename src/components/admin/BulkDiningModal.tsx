import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Plus, Trash2, FileText, List, AlertCircle } from 'lucide-react';
import { safeParseInt } from '../../lib/numberValidation';

interface BulkDiningModalProps {
  dayId: string;
  onClose: () => void;
  onSave: () => void;
}

interface DiningRow {
  id: string;
  meal_type: string;
  restaurant_name: string;
  location_address: string;
  reservation_time: string;
  cuisine_type: string;
  guide_notes: string;
}

export default function BulkDiningModal({ dayId, onClose, onSave }: BulkDiningModalProps) {
  const [mode, setMode] = useState<'form' | 'text'>('form');
  const [dinings, setDinings] = useState<DiningRow[]>([
    {
      id: '1',
      meal_type: 'lunch',
      restaurant_name: '',
      location_address: '',
      reservation_time: '',
      cuisine_type: '',
      guide_notes: '',
    },
  ]);
  const [textInput, setTextInput] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const addRow = () => {
    const newRow: DiningRow = {
      id: Date.now().toString(),
      meal_type: 'lunch',
      restaurant_name: '',
      location_address: '',
      reservation_time: '',
      cuisine_type: '',
      guide_notes: '',
    };
    setDinings([...dinings, newRow]);
  };

  const removeRow = (id: string) => {
    if (dinings.length === 1) return;
    setDinings(dinings.filter((d) => d.id !== id));
  };

  const updateRow = (id: string, field: keyof DiningRow, value: string) => {
    setDinings(
      dinings.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const parseTextInput = () => {
    setParseError(null);
    const lines = textInput.trim().split('\n').filter(line => line.trim() !== '');

    if (lines.length === 0) {
      setParseError('No dining reservations found in the text');
      return;
    }

    const parsed: DiningRow[] = [];

    lines.forEach((line, index) => {
      line = line.trim();

      const patterns = [
        /^(\d{1,2}:\d{2})\s*[-–—]\s*(.+?)\s*[-–—]\s*(.+?)\s*[-–—]\s*(.+)$/,
        /^(\d{1,2}:\d{2})\s*[-–—]\s*(.+?)\s*[-–—]\s*(.+)$/,
        /^(\d{1,2}:\d{2})\s*[-–—]\s*(.+)$/,
        /^(\d{1,2}:\d{2})\s+(.+)$/,
      ];

      let matched = false;

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const time = match[1];
          const restaurantName = match[2].trim();
          const address = match[3]?.trim() || 'To be determined';
          const cuisine = match[4]?.trim() || '';

          const [hours, minutes] = time.split(':');
          const formattedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;

          let mealType = 'lunch';
          const timeNum = safeParseInt(hours, 0) || 0;
          if (timeNum >= 6 && timeNum < 11) {
            mealType = 'breakfast';
          } else if (timeNum >= 11 && timeNum < 16) {
            mealType = 'lunch';
          } else if (timeNum >= 16 && timeNum < 23) {
            mealType = 'dinner';
          } else {
            mealType = 'snack';
          }

          parsed.push({
            id: `parsed-${index}`,
            meal_type: mealType,
            restaurant_name: restaurantName,
            location_address: address,
            reservation_time: formattedTime,
            cuisine_type: cuisine,
            guide_notes: '',
          });
          matched = true;
          break;
        }
      }

      if (!matched && line.length > 0) {
        parsed.push({
          id: `parsed-${index}`,
          meal_type: 'lunch',
          restaurant_name: line,
          location_address: 'To be determined',
          reservation_time: '',
          cuisine_type: '',
          guide_notes: '',
        });
      }
    });

    if (parsed.length === 0) {
      setParseError('Could not parse any dining reservations from the text');
      return;
    }

    setDinings(parsed);
    setMode('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validDinings = dinings.filter(
        (d) => d.restaurant_name.trim() !== '' || d.reservation_time.trim() !== '' || d.location_address.trim() !== ''
      );

      if (validDinings.length === 0) {
        alert('Please add at least one dining reservation with some information');
        setLoading(false);
        return;
      }

      const { data: maxOrderData } = await supabase
        .from('dining')
        .select('display_order')
        .eq('day_id', dayId)
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      let currentOrder = maxOrderData?.display_order || 0;

      const insertData = validDinings.map((dining) => ({
        day_id: dayId,
        meal_type: dining.meal_type as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        restaurant_name: dining.restaurant_name.trim() || '',
        location_address: dining.location_address.trim() || '',
        reservation_time: dining.reservation_time || null,
        cuisine_type: dining.cuisine_type.trim() || '',
        guide_notes: dining.guide_notes.trim() || '',
        location_type: 'external' as const,
        confirmation_status: 'not_booked' as const,
        payment_arrangement: 'not_paid' as const,
        included_in_package: false,
        display_order: ++currentOrder,
      }));

      const { error } = await supabase.from('dining').insert(insertData);

      if (error) throw error;

      onSave();
    } catch (error: any) {
      console.error('Error saving dining reservations:', error);
      const errorMessage = error?.message || error?.error_description || 'Unknown error occurred';
      alert(`Failed to save dining reservations: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Bulk Add Dining Reservations</h2>
            <p className="text-sm text-slate-600 mt-1">
              Add multiple dining reservations at once - either manually or by pasting a list
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
                <p className="text-sm text-blue-800 mb-2">Paste your dining reservations in any of these formats:</p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>08:00 - Breakfast - Hotel Restaurant - Continental</li>
                  <li>13:00 - Lunch at Bistro Paris - 123 Main St</li>
                  <li>19:30 - Le Grand Restaurant</li>
                  <li>Just restaurant name (time will be empty)</li>
                </ul>
                <p className="text-sm text-blue-800 mt-2">
                  Note: Meal type is automatically detected based on time (Breakfast: 6-11am, Lunch: 11am-4pm, Dinner: 4-11pm)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Paste your dining reservations (one per line):
                </label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={12}
                  placeholder="08:00 - Hotel Breakfast - Main Restaurant&#10;13:00 - Lunch - Cafe de Paris - 123 Main Street - French&#10;19:30 - Dinner - Le Grand Chef - 456 Restaurant Row"
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
                  <div className="col-span-2">Time</div>
                  <div className="col-span-2">Meal Type</div>
                  <div className="col-span-3">Restaurant</div>
                  <div className="col-span-3">Address</div>
                  <div className="col-span-2">Actions</div>
                </div>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {dinings.map((dining, index) => (
                  <div
                    key={dining.id}
                    className="grid grid-cols-12 gap-3 items-start p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                  >
                    <div className="col-span-2">
                      <input
                        type="time"
                        value={dining.reservation_time}
                        onChange={(e) =>
                          updateRow(dining.id, 'reservation_time', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <select
                        value={dining.meal_type}
                        onChange={(e) => updateRow(dining.id, 'meal_type', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="breakfast">Breakfast</option>
                        <option value="lunch">Lunch</option>
                        <option value="dinner">Dinner</option>
                        <option value="snack">Snack</option>
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={dining.restaurant_name}
                        onChange={(e) =>
                          updateRow(dining.id, 'restaurant_name', e.target.value)
                        }
                        placeholder="Restaurant name"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={dining.location_address}
                        onChange={(e) => updateRow(dining.id, 'location_address', e.target.value)}
                        placeholder="Address"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="col-span-2 flex gap-2">
                      <button
                        type="button"
                        onClick={removeRow.bind(null, dining.id)}
                        disabled={dinings.length === 1}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {index === dinings.length - 1 && (
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
                Add Another Dining Reservation
              </button>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Quick Entry Mode</p>
                    <p>
                      Enter just the time, meal type, restaurant name, and address for each reservation. You can edit
                      detailed information (confirmation status, payment details, images, etc.) later by clicking on each
                      dining entry.
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
                  {loading ? 'Saving...' : `Add ${dinings.filter(d => d.restaurant_name.trim() || d.reservation_time.trim() || d.location_address.trim()).length} Dining Reservations`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
