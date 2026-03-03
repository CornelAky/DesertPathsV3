import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Hotel,
  Activity as ActivityIcon,
  Utensils,
  Save,
} from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { safeParseInt } from '../../lib/numberValidation';

interface TripTemplate {
  id: string;
  name: string;
  description: string;
  template_type: string;
  duration_days: number;
  is_default: boolean;
}

interface TemplateDay {
  id: string;
  template_id: string;
  day_number: number;
  title: string;
  description: string;
}

interface TemplateActivity {
  id: string;
  template_day_id: string;
  activity_name: string;
  location: string;
  start_time: string | null;
  end_time: string | null;
  notes: string;
  booking_status: string;
  booking_fee: number;
  order_index: number;
}

interface TemplateDining {
  id: string;
  template_day_id: string;
  restaurant_name: string;
  meal_type: string;
  location: string;
  reservation_time: string | null;
  notes: string;
  order_index: number;
}

interface TemplateAccommodation {
  id: string;
  template_day_id: string;
  hotel_name: string;
  location_address: string;
  check_in_time: string | null;
  check_out_time: string | null;
  access_method: string;
  confirmation_number: string;
  notes: string;
  order_index: number;
}

interface TemplateEditorProps {
  templateId: string;
  onBack: () => void;
}

export function TemplateEditor({ templateId, onBack }: TemplateEditorProps) {
  const [template, setTemplate] = useState<TripTemplate | null>(null);
  const [days, setDays] = useState<TemplateDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<TemplateDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    duration_days: 3,
  });

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  async function fetchTemplate() {
    try {
      const { data: templateData, error: templateError } = await supabase
        .from('journey_templates')
        .select('id, name, description, template_type, duration_days, is_default')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      setTemplate(templateData);
      setTemplateForm({
        name: templateData.name,
        description: templateData.description,
        duration_days: templateData.duration_days,
      });

      const { data: daysData, error: daysError } = await supabase
        .from('template_days')
        .select('id, template_id, day_number, title, description')
        .eq('template_id', templateId)
        .order('day_number');

      if (daysError) throw daysError;

      setDays(daysData || []);
      if (daysData && daysData.length > 0) {
        setSelectedDay(daysData[0]);
      }
    } catch (error) {
      console.error('Error fetching template:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateTemplate() {
    try {
      const { error } = await supabase
        .from('journey_templates')
        .update(templateForm)
        .eq('id', templateId);

      if (error) throw error;

      await fetchTemplate();
      setEditingTemplate(false);
    } catch (error) {
      console.error('Error updating template:', error);
    }
  }

  async function handleAddDay() {
    try {
      const newDayNumber = days.length + 1;

      const { error } = await supabase.from('template_days').insert({
        template_id: templateId,
        day_number: newDayNumber,
        title: `Day ${newDayNumber}`,
        description: '',
      });

      if (error) throw error;

      await fetchTemplate();
    } catch (error) {
      console.error('Error adding day:', error);
    }
  }

  async function handleUpdateDay(dayId: string, updates: Partial<TemplateDay>) {
    try {
      const { error } = await supabase
        .from('template_days')
        .update(updates)
        .eq('id', dayId);

      if (error) throw error;

      await fetchTemplate();
    } catch (error) {
      console.error('Error updating day:', error);
    }
  }

  async function handleDeleteDay(dayId: string) {
    try {
      const { error } = await supabase.from('template_days').delete().eq('id', dayId);

      if (error) throw error;

      await fetchTemplate();
    } catch (error) {
      console.error('Error deleting day:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading template...</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Template not found</p>
        <button
          onClick={onBack}
          className="mt-4 text-brand-orange hover:text-brand-orange-hover"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{template.name}</h2>
            <p className="text-slate-600">{template.description || 'No description'}</p>
          </div>
        </div>
        <button
          onClick={() => setEditingTemplate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg transition-colors"
        >
          <Edit className="w-4 h-4" />
          <span>Edit Info</span>
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-900">Days</h3>
            <button
              onClick={handleAddDay}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
              title="Add day"
            >
              <Plus className="w-4 h-4 text-slate-700" />
            </button>
          </div>
          {days.map((day) => (
            <button
              key={day.id}
              onClick={() => setSelectedDay(day)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                selectedDay?.id === day.id
                  ? 'bg-brand-orange text-white'
                  : 'bg-white border border-slate-200 hover:border-brand-orange'
              }`}
            >
              <div className="font-medium">Day {day.day_number}</div>
              <div className={`text-sm ${selectedDay?.id === day.id ? 'text-white' : 'text-slate-600'}`}>
                {day.title || 'Untitled'}
              </div>
            </button>
          ))}
        </div>

        <div className="col-span-9">
          {selectedDay ? (
            <TemplateDayEditor
              day={selectedDay}
              onUpdate={(updates) => handleUpdateDay(selectedDay.id, updates)}
              onDelete={() => handleDeleteDay(selectedDay.id)}
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <p className="text-slate-500">Select a day to edit or add a new day</p>
            </div>
          )}
        </div>
      </div>

      {editingTemplate && (
        <div className="fixed inset-0 bg-brand-brown bg-opacity-20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Edit Template Info</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Duration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={templateForm.duration_days}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, duration_days: safeParseInt(e.target.value, 1) || 1 })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setEditingTemplate(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTemplate}
                  className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TemplateDayEditorProps {
  day: TemplateDay;
  onUpdate: (updates: Partial<TemplateDay>) => void;
  onDelete: () => void;
}

function TemplateDayEditor({ day, onUpdate, onDelete }: TemplateDayEditorProps) {
  const [activities, setActivities] = useState<TemplateActivity[]>([]);
  const [dining, setDining] = useState<TemplateDining[]>([]);
  const [accommodations, setAccommodations] = useState<TemplateAccommodation[]>([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(day.title);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchDayDetails();
  }, [day.id]);

  async function fetchDayDetails() {
    try {
      const [activitiesRes, diningRes, accommodationsRes] = await Promise.all([
        supabase.from('template_activities').select('id, template_day_id, activity_name, location, start_time, end_time, notes, booking_status, booking_fee, order_index').eq('template_day_id', day.id).order('order_index'),
        supabase.from('template_dining').select('id, template_day_id, restaurant_name, meal_type, location, reservation_time, notes, order_index').eq('template_day_id', day.id).order('order_index'),
        supabase.from('template_accommodations').select('id, template_day_id, hotel_name, location_address, check_in_time, check_out_time, access_method, confirmation_number, notes, order_index').eq('template_day_id', day.id).order('order_index'),
      ]);

      setActivities(activitiesRes.data || []);
      setDining(diningRes.data || []);
      setAccommodations(accommodationsRes.data || []);
    } catch (error) {
      console.error('Error fetching day details:', error);
    }
  }

  async function handleAddActivity() {
    try {
      const { error } = await supabase.from('template_activities').insert({
        template_day_id: day.id,
        activity_name: 'New Activity',
        location: '',
        notes: '',
        booking_status: 'pending',
        booking_fee: 0,
        order_index: activities.length,
      });

      if (error) throw error;
      await fetchDayDetails();
    } catch (error) {
      console.error('Error adding activity:', error);
    }
  }

  async function handleAddDining() {
    try {
      const { error } = await supabase.from('template_dining').insert({
        template_day_id: day.id,
        restaurant_name: 'New Restaurant',
        meal_type: 'lunch',
        location: '',
        notes: '',
        order_index: dining.length,
      });

      if (error) throw error;
      await fetchDayDetails();
    } catch (error) {
      console.error('Error adding dining:', error);
    }
  }

  async function handleAddAccommodation() {
    try {
      const { error } = await supabase.from('template_accommodations').insert({
        template_day_id: day.id,
        hotel_name: 'New Hotel',
        location_address: '',
        access_method: 'self_checkin',
        notes: '',
        order_index: accommodations.length,
      });

      if (error) throw error;
      await fetchDayDetails();
    } catch (error) {
      console.error('Error adding accommodation:', error);
    }
  }

  async function handleDeleteItem(table: string, itemId: string) {
    try {
      const { error } = await supabase.from(table).delete().eq('id', itemId);
      if (error) throw error;
      await fetchDayDetails();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  }

  const handleSaveTitle = () => {
    onUpdate({ title: titleValue });
    setEditingTitle(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            <Calendar className="w-5 h-5 text-slate-700" />
            {editingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  className="flex-1 px-3 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                  autoFocus
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <h3 className="text-xl font-bold text-slate-900">{day.title || 'Untitled Day'}</h3>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!editingTitle && (
              <button
                onClick={() => {
                  setEditingTitle(true);
                  setTitleValue(day.title);
                }}
                className="p-2 text-slate-600 hover:text-brand-orange hover:bg-orange-50 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Hotel className="w-5 h-5 text-slate-700" />
            <h3 className="text-lg font-semibold text-slate-900">Accommodations</h3>
          </div>
          <button
            onClick={handleAddAccommodation}
            className="flex items-center gap-2 px-3 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
        <div className="space-y-3">
          {accommodations.map((acc) => (
            <div key={acc.id} className="bg-white rounded-lg border border-slate-200 p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-900">{acc.hotel_name}</div>
                <div className="text-sm text-slate-600">{acc.location_address}</div>
              </div>
              <button
                onClick={() => handleDeleteItem('template_accommodations', acc.id)}
                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {accommodations.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">No accommodations added</div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <ActivityIcon className="w-5 h-5 text-slate-700" />
            <h3 className="text-lg font-semibold text-slate-900">Activities</h3>
          </div>
          <button
            onClick={handleAddActivity}
            className="flex items-center gap-2 px-3 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="bg-white rounded-lg border border-slate-200 p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-900">{activity.activity_name}</div>
                <div className="text-sm text-slate-600">{activity.location}</div>
              </div>
              <button
                onClick={() => handleDeleteItem('template_activities', activity.id)}
                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {activities.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">No activities added</div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Utensils className="w-5 h-5 text-slate-700" />
            <h3 className="text-lg font-semibold text-slate-900">Dining</h3>
          </div>
          <button
            onClick={handleAddDining}
            className="flex items-center gap-2 px-3 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
        <div className="space-y-3">
          {dining.map((meal) => (
            <div key={meal.id} className="bg-white rounded-lg border border-slate-200 p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-900">{meal.restaurant_name}</div>
                <div className="text-sm text-slate-600">
                  {meal.meal_type} • {meal.location}
                </div>
              </div>
              <button
                onClick={() => handleDeleteItem('template_dining', meal.id)}
                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {dining.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">No dining added</div>
          )}
        </div>
      </section>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Day"
        message={`Are you sure you want to delete ${day.title}? This will also delete all associated activities, dining, and accommodations.`}
        confirmLabel="Delete"
        onConfirm={() => {
          onDelete();
          setShowDeleteDialog(false);
        }}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}
