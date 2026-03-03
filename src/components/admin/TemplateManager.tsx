import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit, Trash2, Copy, Star, BookTemplate } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { safeParseInt } from '../../lib/numberValidation';

interface TripTemplate {
  id: string;
  name: string;
  description: string;
  template_type: '3_days' | '5_days' | 'family' | 'vip' | 'custom';
  duration_days: number;
  is_default: boolean;
  created_at: string;
}

interface TemplateManagerProps {
  onEditTemplate: (templateId: string) => void;
  onSwitchToTrips?: () => void;
}

export function TemplateManager({ onEditTemplate, onSwitchToTrips }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<TripTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    templateId: string;
    templateName: string;
  }>({ isOpen: false, templateId: '', templateName: '' });

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const { data, error } = await supabase
        .from('journey_templates')
        .select('id, name, description, template_type, duration_days, is_default, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTemplate(templateData: Partial<TripTemplate>) {
    try {
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase.from('journey_templates').insert({
        ...templateData,
        created_by: user.user?.id,
      });

      if (error) throw error;

      await fetchTemplates();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating template:', error);
    }
  }

  async function handleDuplicateTemplate(templateId: string) {
    try {
      const { data: template, error: fetchError } = await supabase
        .from('journey_templates')
        .select('*, template_days(*)')
        .eq('id', templateId)
        .single();

      if (fetchError) throw fetchError;

      const { data: user } = await supabase.auth.getUser();

      const { data: newTrip, error: createError } = await supabase
        .from('journeys')
        .insert({
          journey_name: `${template.name}`,
          customer_id: null,
          duration_days: template.duration_days,
          status: 'draft',
          description: template.description,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      for (const day of template.template_days) {
        const { data: newDay, error: dayError } = await supabase
          .from('itinerary_days')
          .insert({
            trip_id: newTrip.id,
            day_number: day.day_number,
            city_destination: day.title || '',
            notes: day.description || '',
          })
          .select()
          .single();

        if (dayError) throw dayError;

        const { data: activities } = await supabase
          .from('template_activities')
          .select('id, template_day_id, activity_name, location, start_time, notes, booking_status, order_index')
          .eq('template_day_id', day.id)
          .order('order_index');

        if (activities && activities.length > 0) {
          for (const act of activities) {
            await supabase.from('activities').insert({
              day_id: newDay.id,
              activity_name: act.activity_name,
              location: act.location,
              activity_time: act.start_time,
              guide_notes: act.notes,
              booking_status: act.booking_status || 'pending',
              display_order: act.order_index,
            });
          }
        }

        const { data: dining } = await supabase
          .from('template_dining')
          .select('id, template_day_id, restaurant_name, meal_type, location, reservation_time, notes, order_index')
          .eq('template_day_id', day.id)
          .order('order_index');

        if (dining && dining.length > 0) {
          for (const meal of dining) {
            await supabase.from('dining').insert({
              day_id: newDay.id,
              restaurant_name: meal.restaurant_name,
              meal_type: meal.meal_type,
              location_address: meal.location,
              reservation_time: meal.reservation_time,
              guide_notes: meal.notes,
              display_order: meal.order_index,
            });
          }
        }

        const { data: accommodations } = await supabase
          .from('template_accommodations')
          .select('id, template_day_id, hotel_name, location_address, check_in_time, check_out_time, access_method, confirmation_number, notes, order_index')
          .eq('template_day_id', day.id)
          .order('order_index');

        if (accommodations && accommodations.length > 0) {
          for (const acc of accommodations) {
            await supabase.from('accommodations').insert({
              day_id: newDay.id,
              hotel_name: acc.hotel_name,
              location_address: acc.location_address,
              check_in_time: acc.check_in_time,
              check_out_time: acc.check_out_time,
              access_method: acc.access_method,
              confirmation_number: acc.confirmation_number,
              guide_notes: acc.notes,
            });
          }
        }
      }

      if (onSwitchToTrips) {
        onSwitchToTrips();
      }
    } catch (error) {
      console.error('Error creating trip from template:', error);
      alert(`Failed to create trip: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function handleDeleteTemplate() {
    try {
      const { error } = await supabase
        .from('journey_templates')
        .delete()
        .eq('id', deleteDialog.templateId);

      if (error) throw error;

      await fetchTemplates();
      setDeleteDialog({ isOpen: false, templateId: '', templateName: '' });
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  }

  async function handleSetDefault(templateId: string) {
    try {
      await supabase
        .from('journey_templates')
        .update({ is_default: false })
        .neq('id', templateId);

      const { error } = await supabase
        .from('journey_templates')
        .update({ is_default: true })
        .eq('id', templateId);

      if (error) throw error;

      await fetchTemplates();
    } catch (error) {
      console.error('Error setting default template:', error);
    }
  }

  const getTemplateTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      '3_days': '3 Days',
      '5_days': '5 Days',
      family: 'Family Trip',
      vip: 'VIP Trip',
      custom: 'Custom',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookTemplate className="w-6 h-6 text-brand-terracotta" />
            Journey Templates
          </h2>
          <p className="text-slate-600 mt-1">
            Create and manage reusable templates for quick journey creation
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New Template</span>
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500 mb-4">No templates created yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-brand-orange hover:text-brand-orange-hover font-medium"
          >
            Create your first template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {template.name}
                    </h3>
                    {template.is_default && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                    {template.description || 'No description'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-brand-cyan bg-opacity-20 text-brand-brown text-xs font-medium rounded-full">
                      {getTemplateTypeLabel(template.template_type)}
                    </span>
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                      {template.duration_days} {template.duration_days === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEditTemplate(template.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDuplicateTemplate(template.id)}
                  className="p-2 text-slate-600 hover:text-brand-orange hover:bg-orange-50 rounded-lg transition-colors"
                  title="Create journey from this template"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSetDefault(template.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    template.is_default
                      ? 'text-yellow-500'
                      : 'text-slate-400 hover:text-yellow-500 hover:bg-yellow-50'
                  }`}
                  title="Set as default template"
                >
                  <Star className={`w-4 h-4 ${template.is_default ? 'fill-yellow-500' : ''}`} />
                </button>
                <button
                  onClick={() =>
                    setDeleteDialog({
                      isOpen: true,
                      templateId: template.id,
                      templateName: template.name,
                    })
                  }
                  className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTemplate}
        />
      )}

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Template"
        message={`Are you sure you want to delete "${deleteDialog.templateName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteTemplate}
        onCancel={() => setDeleteDialog({ isOpen: false, templateId: '', templateName: '' })}
      />
    </div>
  );
}

interface CreateTemplateModalProps {
  onClose: () => void;
  onCreate: (data: Partial<TripTemplate>) => void;
}

function CreateTemplateModal({ onClose, onCreate }: CreateTemplateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_type: 'custom' as TripTemplate['template_type'],
    duration_days: 3,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-brand-brown bg-opacity-20 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Create New Template</h2>
          <p className="text-slate-600 mt-1">Set up a reusable trip template</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Template Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
              required
              placeholder="e.g., 3-Day Desert Adventure"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
              rows={3}
              placeholder="Describe this template..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Template Type *
            </label>
            <select
              value={formData.template_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  template_type: e.target.value as TripTemplate['template_type'],
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
            >
              <option value="custom">Custom</option>
              <option value="3_days">3 Days</option>
              <option value="5_days">5 Days</option>
              <option value="family">Family Trip</option>
              <option value="vip">VIP Trip</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Duration (Days) *
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={formData.duration_days}
              onChange={(e) =>
                setFormData({ ...formData, duration_days: safeParseInt(e.target.value, 1) || 1 })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg transition-colors"
            >
              Create Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
