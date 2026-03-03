import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Settings, Clock, Save, RotateCcw, DollarSign } from 'lucide-react';

interface TimePeriod {
  start: string;
  end: string;
  label: string;
}

interface ActivityTimePeriods {
  early_morning: TimePeriod;
  morning: TimePeriod;
  afternoon: TimePeriod;
  evening: TimePeriod;
  night: TimePeriod;
}

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string;
  category: string;
  updated_at: string;
}

interface SettingsDashboardProps {
  activeSection: 'activities' | 'pricing';
}

export function SettingsDashboard({ activeSection }: SettingsDashboardProps) {
  const [timePeriods, setTimePeriods] = useState<ActivityTimePeriods>({
    early_morning: { start: '00:00', end: '07:00', label: 'Early Morning' },
    morning: { start: '07:00', end: '12:00', label: 'Morning' },
    afternoon: { start: '12:00', end: '17:00', label: 'Afternoon' },
    evening: { start: '17:00', end: '20:00', label: 'Evening' },
    night: { start: '20:00', end: '23:59', label: 'Night' },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('id, setting_key, setting_value, description, category, updated_at')
        .eq('setting_key', 'activity_time_periods')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setTimePeriods(data.setting_value as ActivityTimePeriods);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimePeriodChange = (
    section: keyof ActivityTimePeriods,
    field: keyof TimePeriod,
    value: string
  ) => {
    setTimePeriods((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const validateTimePeriods = (): boolean => {
    const periods = Object.values(timePeriods);

    for (const period of periods) {
      if (!period.start || !period.end) {
        setMessage({ type: 'error', text: 'All time periods must have start and end times' });
        return false;
      }

      if (period.start >= period.end) {
        setMessage({ type: 'error', text: `${period.label}: Start time must be before end time` });
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateTimePeriods()) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('setting_key', 'activity_time_periods')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('system_settings')
          .update({
            setting_value: timePeriods,
            updated_at: new Date().toISOString(),
            updated_by: (await supabase.auth.getUser()).data.user?.id,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_settings')
          .insert({
            setting_key: 'activity_time_periods',
            setting_value: timePeriods,
            description: 'Time period definitions for activity sections',
            category: 'activities',
            updated_by: (await supabase.auth.getUser()).data.user?.id,
          });

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset to default values?')) {
      return;
    }

    setTimePeriods({
      early_morning: { start: '00:00', end: '07:00', label: 'Early Morning' },
      morning: { start: '07:00', end: '12:00', label: 'Morning' },
      afternoon: { start: '12:00', end: '17:00', label: 'Afternoon' },
      evening: { start: '17:00', end: '20:00', label: 'Evening' },
      night: { start: '20:00', end: '23:59', label: 'Night' },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'activities': return 'Activity Time Periods';
      case 'pricing': return 'Pricing & Margins';
      default: return 'System Settings';
    }
  };

  const getSectionDescription = () => {
    switch (activeSection) {
      case 'activities': return 'Configure time periods for activity scheduling';
      case 'pricing': return 'Manage pricing rules and client-specific margins';
      default: return 'Configure system-wide settings and defaults';
    }
  };

  const getSectionIcon = () => {
    switch (activeSection) {
      case 'activities': return <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-brand-terracotta" />;
      case 'pricing': return <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 text-brand-terracotta" />;
      default: return <Settings className="w-6 h-6 sm:w-7 sm:h-7 text-brand-terracotta" />;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-brand-charcoal flex items-center gap-2">
          {getSectionIcon()}
          {getSectionTitle()}
        </h2>
        <p className="text-sm text-brand-chocolate mt-1">
          {getSectionDescription()}
        </p>
      </div>

      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {activeSection === 'activities' ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> These time periods define when activities are grouped into
                  different sections of the day. Changes here will affect how activities are
                  categorized throughout the system.
                </p>
              </div>

              <div className="space-y-4">
                {(Object.keys(timePeriods) as Array<keyof ActivityTimePeriods>).map((section) => (
                  <div
                    key={section}
                    className="bg-gray-50 rounded-lg p-5 border border-gray-200 hover:border-brand-orange transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <Clock className="w-5 h-5 text-brand-orange" />
                      <h3 className="text-lg font-semibold text-gray-900 capitalize">
                        {timePeriods[section].label}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Label
                        </label>
                        <input
                          type="text"
                          value={timePeriods[section].label}
                          onChange={(e) =>
                            handleTimePeriodChange(section, 'label', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={timePeriods[section].start}
                          onChange={(e) =>
                            handleTimePeriodChange(section, 'start', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={timePeriods[section].end}
                          onChange={(e) =>
                            handleTimePeriodChange(section, 'end', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-gray-600">
                      Activities between {timePeriods[section].start} and {timePeriods[section].end}{' '}
                      will be grouped as "{timePeriods[section].label}"
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset to Defaults</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center bg-white rounded-lg border border-gray-200">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Pricing & Margins Settings
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Configure pricing rules, margins, and client-specific pricing will be available here
              soon. This will allow you to set different pricing structures based on client type
              and status.
            </p>
          </div>
        )}
    </div>
  );
}
