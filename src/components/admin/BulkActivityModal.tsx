import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Plus, Trash2, FileText, List, AlertCircle } from 'lucide-react';
import { safeParseInt } from '../../lib/numberValidation';

interface BulkActivityModalProps {
  dayId: string;
  onClose: () => void;
  onSave: () => void;
}

interface ActivityRow {
  id: string;
  activity_time: string;
  activity_name: string;
  location: string;
  duration_minutes: string;
  guide_notes: string;
}

export default function BulkActivityModal({ dayId, onClose, onSave }: BulkActivityModalProps) {
  const [mode, setMode] = useState<'form' | 'text'>('form');
  const [activities, setActivities] = useState<ActivityRow[]>([
    {
      id: '1',
      activity_time: '',
      activity_name: '',
      location: '',
      duration_minutes: '',
      guide_notes: '',
    },
  ]);
  const [textInput, setTextInput] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const addRow = () => {
    const newRow: ActivityRow = {
      id: Date.now().toString(),
      activity_time: '',
      activity_name: '',
      location: '',
      duration_minutes: '',
      guide_notes: '',
    };
    setActivities([...activities, newRow]);
  };

  const removeRow = (id: string) => {
    if (activities.length === 1) return;
    setActivities(activities.filter((a) => a.id !== id));
  };

  const updateRow = (id: string, field: keyof ActivityRow, value: string) => {
    setActivities(
      activities.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const parseTextInput = () => {
    setParseError(null);
    const lines = textInput.trim().split('\n').filter(line => line.trim() !== '');

    if (lines.length === 0) {
      setParseError('No activities found in the text');
      return;
    }

    const parsed: ActivityRow[] = [];
    let hasErrors = false;

    lines.forEach((line, index) => {
      line = line.trim();

      const patterns = [
        /^(\d{1,2}:\d{2})\s*[-–—]\s*(.+?)\s*[-–—]\s*(.+)$/,
        /^(\d{1,2}:\d{2})\s*[-–—]\s*(.+)$/,
        /^(\d{1,2}:\d{2})\s+(.+)$/,
      ];

      let matched = false;

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const time = match[1];
          const name = match[2].trim();
          const location = match[3]?.trim() || 'To be determined';

          const [hours, minutes] = time.split(':');
          const formattedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;

          parsed.push({
            id: `parsed-${index}`,
            activity_time: formattedTime,
            activity_name: name,
            location: location,
            duration_minutes: '',
            guide_notes: '',
          });
          matched = true;
          break;
        }
      }

      if (!matched && line.length > 0) {
        parsed.push({
          id: `parsed-${index}`,
          activity_time: '',
          activity_name: line,
          location: 'To be determined',
          duration_minutes: '',
          guide_notes: '',
        });
      }
    });

    if (parsed.length === 0) {
      setParseError('Could not parse any activities from the text');
      return;
    }

    setActivities(parsed);
    setMode('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validActivities = activities.filter(
        (a) => a.activity_name.trim() !== '' || a.activity_time.trim() !== '' || a.location.trim() !== ''
      );

      if (validActivities.length === 0) {
        alert('Please add at least one activity with some information');
        setLoading(false);
        return;
      }

      const { data: maxOrderData } = await supabase
        .from('activities')
        .select('display_order')
        .eq('day_id', dayId)
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      let currentOrder = maxOrderData?.display_order || 0;

      const insertData = validActivities.map((activity) => ({
        day_id: dayId,
        activity_name: activity.activity_name.trim() || '',
        location: activity.location.trim() || '',
        activity_time: activity.activity_time || null,
        duration_minutes: activity.duration_minutes
          ? safeParseInt(activity.duration_minutes, null)
          : null,
        guide_notes: activity.guide_notes.trim() || '',
        booking_status: 'pending' as const,
        payment_status: 'pending' as const,
        access_method: 'pdf_ticket' as const,
        display_order: ++currentOrder,
      }));

      const { error } = await supabase.from('activities').insert(insertData);

      if (error) throw error;

      onSave();
    } catch (error: any) {
      console.error('Error saving activities:', error);
      const errorMessage = error?.message || error?.error_description || 'Unknown error occurred';
      alert(`Failed to save activities: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Bulk Add Activities</h2>
            <p className="text-sm text-slate-600 mt-1">
              Add multiple activities at once - either manually or by pasting a list
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
                <p className="text-sm text-blue-800 mb-2">Paste your activities in any of these formats:</p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>08:00 - Breakfast - Main Restaurant</li>
                  <li>09:30 - Drive to location</li>
                  <li>12:00 Lunch at cafe</li>
                  <li>Just activity name (time will be empty)</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Paste your activities (one per line):
                </label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={12}
                  placeholder="08:00 - Breakfast - Hotel Restaurant&#10;09:30 - Drive to Louvre Museum&#10;10:00 - Museum Tour - Louvre Museum&#10;13:00 - Lunch - Cafe de Paris&#10;15:00 - Seine River Cruise"
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
                  <div className="col-span-3">Activity Name</div>
                  <div className="col-span-3">Location</div>
                  <div className="col-span-2">Duration (min)</div>
                  <div className="col-span-2">Actions</div>
                </div>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {activities.map((activity, index) => (
                  <div
                    key={activity.id}
                    className="grid grid-cols-12 gap-3 items-start p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                  >
                    <div className="col-span-2">
                      <input
                        type="time"
                        value={activity.activity_time}
                        onChange={(e) =>
                          updateRow(activity.id, 'activity_time', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={activity.activity_name}
                        onChange={(e) =>
                          updateRow(activity.id, 'activity_name', e.target.value)
                        }
                        placeholder="Activity name"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={activity.location}
                        onChange={(e) => updateRow(activity.id, 'location', e.target.value)}
                        placeholder="Location"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={activity.duration_minutes}
                        onChange={(e) =>
                          updateRow(activity.id, 'duration_minutes', e.target.value)
                        }
                        placeholder="60"
                        min="0"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="col-span-2 flex gap-2">
                      <button
                        type="button"
                        onClick={removeRow.bind(null, activity.id)}
                        disabled={activities.length === 1}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {index === activities.length - 1 && (
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
                Add Another Activity
              </button>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Quick Entry Mode</p>
                    <p>
                      Enter just the time, name, and location for each activity. You can edit
                      detailed information (booking status, images, etc.) later by clicking on each
                      activity.
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
                  {loading ? 'Saving...' : `Add ${activities.filter(a => a.activity_name.trim() || a.activity_time.trim() || a.location.trim()).length} Activities`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
