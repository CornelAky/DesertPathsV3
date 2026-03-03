import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, Utensils, MapPin, Plus, Pencil, Trash2, Save, X, Phone, Mail, Clock } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

interface Property {
  id: string;
  trip_id: string;
  property_type: 'hotel' | 'restaurant' | 'venue' | 'other';
  name: string;
  address: string;
  phone: string;
  email: string;
  working_hours_start: string | null;
  working_hours_end: string | null;
  weekly_holidays: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

interface PropertyManagementProps {
  tripId: string;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const PROPERTY_TYPES = [
  { value: 'hotel', label: 'Hotel', icon: Building2 },
  { value: 'restaurant', label: 'Restaurant', icon: Utensils },
  { value: 'venue', label: 'Venue', icon: MapPin },
  { value: 'other', label: 'Other', icon: Building2 },
];

export default function PropertyManagement({ tripId }: PropertyManagementProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProperties();
  }, [tripId]);

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, trip_id, property_type, name, address, phone, email, working_hours_start, working_hours_end, weekly_holidays, notes, created_at, updated_at')
        .eq('journey_id', tripId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (property: Partial<Property>): boolean => {
    const newErrors: Record<string, string> = {};

    if (!property.name || property.name.trim().length < 2) {
      newErrors.name = 'Name is required (minimum 2 characters)';
    } else if (property.name.length > 100) {
      newErrors.name = 'Name is too long (maximum 100 characters)';
    }

    if (property.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(property.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (property.phone && !/^[\d\s\-\+\(\)]+$/.test(property.phone)) {
      newErrors.phone = 'Phone number contains invalid characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (property: Partial<Property>) => {
    if (!validateForm(property)) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (property.id) {
        const { error } = await supabase
          .from('properties')
          .update({
            property_type: property.property_type,
            name: property.name,
            address: property.address,
            phone: property.phone,
            email: property.email,
            working_hours_start: property.working_hours_start,
            working_hours_end: property.working_hours_end,
            weekly_holidays: property.weekly_holidays,
            notes: property.notes,
          })
          .eq('id', property.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('properties')
          .insert({
            journey_id: tripId,
            property_type: property.property_type || 'hotel',
            name: property.name,
            address: property.address || '',
            phone: property.phone || '',
            email: property.email || '',
            working_hours_start: property.working_hours_start,
            working_hours_end: property.working_hours_end,
            weekly_holidays: property.weekly_holidays || [],
            notes: property.notes || '',
            created_by: user.id,
          });

        if (error) throw error;
      }

      await loadProperties();
      setShowForm(false);
      setEditingProperty(null);
      setErrors({});
    } catch (error) {
      console.error('Error saving property:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadProperties();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting property:', error);
    }
  };

  const startEdit = (property: Property) => {
    setEditingProperty(property);
    setShowForm(true);
    setErrors({});
  };

  const startNew = () => {
    setEditingProperty({
      id: '',
      journey_id: tripId,
      property_type: 'hotel',
      name: '',
      address: '',
      phone: '',
      email: '',
      working_hours_start: null,
      working_hours_end: null,
      weekly_holidays: [],
      notes: '',
      created_at: '',
      updated_at: '',
    });
    setShowForm(true);
    setErrors({});
  };

  const PropertyIcon = ({ type }: { type: string }) => {
    const iconData = PROPERTY_TYPES.find(t => t.value === type);
    const Icon = iconData?.icon || Building2;
    return <Icon className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600">Loading properties...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Property Management</h3>
          <p className="text-sm text-slate-600 mt-1">
            Manage hotels, restaurants, and venues for this trip
          </p>
        </div>
        <button
          onClick={startNew}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Property</span>
        </button>
      </div>

      {properties.length === 0 && !showForm && (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 mb-4">No properties added yet</p>
          <button
            onClick={startNew}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Add your first property
          </button>
        </div>
      )}

      {showForm && editingProperty && (
        <PropertyForm
          property={editingProperty}
          errors={errors}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingProperty(null);
            setErrors({});
          }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {properties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            onEdit={() => startEdit(property)}
            onDelete={() => setDeleteConfirm(property.id)}
          />
        ))}
      </div>

      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Property"
          message="Are you sure you want to delete this property? This action cannot be undone."
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

function PropertyCard({
  property,
  onEdit,
  onDelete,
}: {
  property: Property;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const typeData = PROPERTY_TYPES.find(t => t.value === property.property_type);
  const Icon = typeData?.icon || Building2;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Icon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">{property.name}</h4>
            <span className="text-xs text-slate-500 capitalize">{property.property_type}</span>
          </div>
        </div>
        <div className="flex space-x-1">
          <button
            onClick={onEdit}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        {property.address && (
          <div className="flex items-start space-x-2 text-slate-600">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{property.address}</span>
          </div>
        )}
        {property.phone && (
          <div className="flex items-center space-x-2 text-slate-600">
            <Phone className="w-4 h-4 flex-shrink-0" />
            <span>{property.phone}</span>
          </div>
        )}
        {property.email && (
          <div className="flex items-center space-x-2 text-slate-600">
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span>{property.email}</span>
          </div>
        )}
        {property.working_hours_start && property.working_hours_end && (
          <div className="flex items-center space-x-2 text-slate-600">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>{property.working_hours_start} - {property.working_hours_end}</span>
          </div>
        )}
        {property.weekly_holidays && property.weekly_holidays.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-500">Closed: </span>
            <span className="text-xs text-slate-600">{property.weekly_holidays.join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PropertyForm({
  property,
  errors,
  onSave,
  onCancel,
}: {
  property: Property;
  errors: Record<string, string>;
  onSave: (property: Property) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(property);

  const handleChange = (field: keyof Property, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleHoliday = (day: string) => {
    const holidays = formData.weekly_holidays || [];
    if (holidays.includes(day)) {
      handleChange('weekly_holidays', holidays.filter(d => d !== day));
    } else {
      handleChange('weekly_holidays', [...holidays, day]);
    }
  };

  return (
    <div className="bg-white border-2 border-blue-200 rounded-xl p-6">
      <h4 className="text-lg font-semibold text-slate-900 mb-4">
        {formData.id ? 'Edit Property' : 'New Property'}
      </h4>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Property Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PROPERTY_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => handleChange('property_type', type.value)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  formData.property_type === type.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <type.icon className="w-4 h-4" />
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {formData.property_type === 'hotel' ? 'Hotel Name' :
             formData.property_type === 'restaurant' ? 'Restaurant Name' : 'Property Name'}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter name here..."
            maxLength={100}
            className={`w-full px-4 py-3 border-2 rounded-lg transition-all focus:outline-none ${
              errors.name
                ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
            }`}
          />
          {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
          <p className="text-xs text-slate-500 mt-1">
            Enter the full name as it appears to customers
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Address
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Enter full address..."
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+966 12 345 6789"
              className={`w-full px-4 py-3 border-2 rounded-lg transition-all focus:outline-none ${
                errors.phone
                  ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                  : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
              }`}
            />
            {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="info@example.com"
              className={`w-full px-4 py-3 border-2 rounded-lg transition-all focus:outline-none ${
                errors.email
                  ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                  : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
              }`}
            />
            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Working Hours
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600 mb-1 block">From</label>
              <input
                type="time"
                value={formData.working_hours_start || ''}
                onChange={(e) => handleChange('working_hours_start', e.target.value || null)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1 block">To</label>
              <input
                type="time"
                value={formData.working_hours_end || ''}
                onChange={(e) => handleChange('working_hours_end', e.target.value || null)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Weekly Holidays
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <label
                key={day}
                className="flex items-center space-x-2 px-3 py-2 border-2 border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={(formData.weekly_holidays || []).includes(day)}
                  onChange={() => toggleHoliday(day)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">{day.slice(0, 3)}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Additional information..."
            rows={3}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all resize-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-slate-200">
        <button
          onClick={onCancel}
          className="flex items-center space-x-2 px-4 py-2 border-2 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
          <span>Cancel</span>
        </button>
        <button
          onClick={() => onSave(formData)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
}
