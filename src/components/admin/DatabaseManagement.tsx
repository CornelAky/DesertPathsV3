import { useState, useEffect } from 'react';
import { Hotel, Utensils, MapPin, Users, UserCheck, Truck, Package, Building2, Plus, Edit2, Trash2, Search, X, Save, Upload, Image as ImageIcon, FileText, Car, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { safeParseInt } from '../../lib/numberValidation';
import { StaffFormModal } from './StaffFormModal';

type DatabaseSection = 'clients' | 'staff' | 'vehicles' | 'gear' | 'hotels' | 'restaurants' | 'sites' | 'providers';

interface MasterClient {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  client_type: string | null;
  client_status: string | null;
  vip_status: boolean;
  notes: string | null;
  is_active: boolean;
}

interface MasterStaff {
  id: string;
  name: string;
  role: string;
  role_custom: string | null;
  staff_type: string;
  phone: string | null;
  email: string | null;
  emergency_contact: string | null;
  availability: string;
  availability_notes: string | null;
  payment_method: string | null;
  id_verified: boolean;
  contract_signed: boolean;
  documents_notes: string | null;
  profile_photo_url: string | null;
  document_attachment_url: string | null;
  has_vehicle: boolean;
  vehicle_type: string | null;
  internal_notes: string | null;
  is_active: boolean;
  category: string;
  subcategory: string | null;
  status: string;
}

interface MasterVehicle {
  id: string;
  vehicle_type: string;
  license_plate: string | null;
  model: string | null;
  passenger_capacity: number;
  is_active: boolean;
}

interface MasterGear {
  id: string;
  item_name: string;
  quantity: number;
  notes: string | null;
  is_active: boolean;
}

interface MasterProvider {
  id: string;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
}

interface MasterHotel {
  id: string;
  name: string;
  location: string | null;
  city: string | null;
  contact_number: string | null;
  email: string | null;
  accommodation_type: string | null;
  notes: string | null;
  is_active: boolean;
}

interface MasterRestaurant {
  id: string;
  name: string;
  location: string | null;
  city: string | null;
  contact_number: string | null;
  cuisine_type: string | null;
  notes: string | null;
  is_active: boolean;
}

interface MasterSite {
  id: string;
  name: string;
  category: string | null;
  location: string | null;
  city: string | null;
  contact_number: string | null;
  description: string | null;
  notes: string | null;
  is_active: boolean;
}

export function DatabaseManagement({ activeSection }: { activeSection: DatabaseSection }) {
  const getSectionTitle = () => {
    switch (activeSection) {
      case 'clients': return 'Clients Database';
      case 'staff': return 'Staff Database';
      case 'providers': return 'Providers Database';
      case 'vehicles': return 'Vehicles Database';
      case 'gear': return 'Gear Database';
      case 'hotels': return 'Hotels Database';
      case 'restaurants': return 'Restaurants Database';
      case 'sites': return 'Touristic Sites Database';
      default: return 'Database Management';
    }
  };

  const getSectionDescription = () => {
    switch (activeSection) {
      case 'clients': return 'Manage master client database and relationships';
      case 'staff': return 'Manage staff members and their roles';
      case 'providers': return 'Manage transportation and service providers';
      case 'vehicles': return 'Manage fleet vehicles and specifications';
      case 'gear': return 'Manage equipment and gear inventory';
      case 'hotels': return 'Manage accommodation database';
      case 'restaurants': return 'Manage dining locations and venues';
      case 'sites': return 'Manage touristic sites and attractions';
      default: return 'Centralized database management';
    }
  };

  const getSectionIcon = () => {
    switch (activeSection) {
      case 'clients': return <Users className="w-6 h-6 sm:w-7 sm:h-7 text-brand-terracotta" />;
      case 'staff': return <UserCheck className="w-6 h-6 sm:w-7 sm:h-7 text-brand-terracotta" />;
      case 'providers': return <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-brand-terracotta" />;
      case 'vehicles': return <Truck className="w-6 h-6 sm:w-7 sm:h-7 text-brand-terracotta" />;
      case 'gear': return <Package className="w-6 h-6 sm:w-7 sm:h-7 text-brand-terracotta" />;
      case 'hotels': return <Hotel className="w-6 h-6 sm:w-7 sm:h-7 text-brand-terracotta" />;
      case 'restaurants': return <Utensils className="w-6 h-6 sm:w-7 sm:h-7 text-brand-terracotta" />;
      case 'sites': return <MapPin className="w-6 h-6 sm:w-7 sm:h-7 text-brand-terracotta" />;
      default: return <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-brand-terracotta" />;
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
      {activeSection === 'clients' && <ClientsDatabase />}
      {activeSection === 'staff' && <StaffDatabase />}
      {activeSection === 'providers' && <ProvidersDatabase />}
      {activeSection === 'vehicles' && <VehiclesDatabase />}
      {activeSection === 'gear' && <GearDatabase />}
      {activeSection === 'hotels' && <HotelsDatabase />}
      {activeSection === 'restaurants' && <RestaurantsDatabase />}
      {activeSection === 'sites' && <SitesDatabase />}
    </div>
  );
}

function ClientsDatabase() {
  const [clients, setClients] = useState<MasterClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<MasterClient | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setLoading(true);
    const { data, error } = await supabase
      .from('master_clients')
      .select('id, name, company_name, email, phone, city, country, client_type, client_status, vip_status, notes, is_active')
      .order('name');

    if (error) {
      console.error('Error loading clients:', error);
    } else {
      setClients(data || []);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this client?')) return;

    const { error } = await supabase
      .from('master_clients')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting client: ' + error.message);
    } else {
      loadClients();
    }
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-terracotta mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-brown-light w-4 h-4" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
          />
        </div>
        <button
          onClick={() => {
            setEditingClient(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-terracotta text-white rounded-lg hover:bg-brand-terracotta-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      <div className="text-sm text-brand-brown-light mb-4">
        {filteredClients.length} of {clients.length} clients
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className="bg-white border border-brand-gray-3 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-semibold text-brand-charcoal">{client.name}</h4>
                {client.company_name && (
                  <p className="text-xs text-brand-brown-light">{client.company_name}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingClient(client);
                    setShowForm(true);
                  }}
                  className="text-brand-brown hover:text-brand-terracotta"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(client.id)}
                  className="text-brand-brown hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {client.email && (
              <p className="text-sm text-brand-brown-light mb-1">{client.email}</p>
            )}
            {client.phone && (
              <p className="text-sm text-brand-brown-light mb-1">{client.phone}</p>
            )}
            {client.city && client.country && (
              <p className="text-sm text-brand-brown-light mb-1">
                {client.city}, {client.country}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {client.client_type && (
                <span className="text-xs bg-brand-cream-dark text-brand-brown px-2 py-1 rounded font-medium">
                  {client.client_type === 'individual' ? 'Individual' : 'Business'}
                </span>
              )}
              {client.client_type === 'business' && client.client_status && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                  {client.client_status === 'retail' ? 'Retail' : 'Partner'}
                </span>
              )}
              {client.vip_status && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  VIP
                </span>
              )}
              {!client.is_active && (
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Inactive</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12 text-brand-brown-light">
          No clients found
        </div>
      )}

      {showForm && (
        <ClientForm
          client={editingClient}
          onClose={() => {
            setShowForm(false);
            setEditingClient(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingClient(null);
            loadClients();
          }}
        />
      )}
    </div>
  );
}

function ClientForm({ client, onClose, onSaved }: { client: MasterClient | null; onClose: () => void; onSaved: () => void }) {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    company_name: client?.company_name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    city: client?.city || '',
    country: client?.country || '',
    client_type: client?.client_type || 'individual',
    client_status: client?.client_status || null,
    vip_status: client?.vip_status || false,
    notes: client?.notes || '',
    is_active: client?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const dataToSave = {
        ...formData,
        client_status: formData.client_type === 'business' ? formData.client_status : null
      };

      if (client) {
        const { error } = await supabase
          .from('master_clients')
          .update(dataToSave)
          .eq('id', client.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('master_clients')
          .insert([dataToSave]);

        if (error) throw error;
      }

      onSaved();
    } catch (error: any) {
      alert('Error saving client: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-brand-gray-3 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-brand-charcoal">
            {client ? 'Edit Client' : 'Add New Client'}
          </h2>
          <button onClick={onClose} className="text-brand-brown hover:text-brand-charcoal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Country
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Client Type
              </label>
              <select
                value={formData.client_type}
                onChange={(e) => {
                  const newType = e.target.value;
                  setFormData({
                    ...formData,
                    client_type: newType,
                    client_status: newType === 'business' ? 'partner' : null
                  });
                }}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              >
                <option value="individual">Individual</option>
                <option value="business">Business</option>
              </select>
            </div>

            {formData.client_type === 'business' && (
              <div>
                <label className="block text-sm font-medium text-brand-charcoal mb-1">
                  Business Status
                </label>
                <select
                  value={formData.client_status || 'partner'}
                  onChange={(e) => setFormData({ ...formData, client_status: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
                >
                  <option value="retail">Retail</option>
                  <option value="partner">Partner</option>
                </select>
              </div>
            )}

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.vip_status}
                  onChange={(e) => setFormData({ ...formData, vip_status: e.target.checked })}
                  className="rounded border-brand-gray-3 text-brand-terracotta focus:ring-brand-terracotta"
                />
                <span className="text-sm text-brand-charcoal">VIP Status</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-brand-gray-3 text-brand-terracotta focus:ring-brand-terracotta"
                />
                <span className="text-sm text-brand-charcoal">Active</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-brand-brown border border-brand-gray-3 rounded-lg hover:bg-brand-gray-4 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-brand-terracotta text-white rounded-lg hover:bg-brand-terracotta-dark transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StaffDatabase() {
  const [staff, setStaff] = useState<MasterStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<MasterStaff | null>(null);

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    setLoading(true);
    const { data, error } = await supabase
      .from('master_staff')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading staff:', error);
    } else {
      setStaff(data || []);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this staff member?')) return;

    const { error } = await supabase
      .from('master_staff')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting staff: ' + error.message);
    } else {
      loadStaff();
    }
  }

  const filteredStaff = staff.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-terracotta mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-brown-light w-4 h-4" />
          <input
            type="text"
            placeholder="Search staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
          />
        </div>
        <button
          onClick={() => {
            setEditingStaff(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-terracotta text-white rounded-lg hover:bg-brand-terracotta-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Staff
        </button>
      </div>

      <div className="text-sm text-brand-brown-light mb-4">
        {filteredStaff.length} of {staff.length} staff members
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map((member) => (
          <div
            key={member.id}
            className="bg-white border border-brand-gray-3 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-brand-charcoal">{member.name}</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingStaff(member);
                    setShowForm(true);
                  }}
                  className="text-brand-brown hover:text-brand-terracotta"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(member.id)}
                  className="text-brand-brown hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {member.role && (
              <p className="text-sm text-brand-brown-light mb-1">{member.role}</p>
            )}
            {member.phone && (
              <p className="text-sm text-brand-brown-light mb-1">{member.phone}</p>
            )}
            {member.availability && (
              <span className={`inline-block text-xs px-2 py-1 rounded mt-2 ${
                member.availability === 'available'
                  ? 'bg-green-100 text-green-800'
                  : member.availability === 'partially_available'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {member.availability.replace('_', ' ')}
              </span>
            )}
            {!member.is_active && (
              <span className="inline-block text-xs bg-red-100 text-red-800 px-2 py-1 rounded mt-2 ml-2">Inactive</span>
            )}
          </div>
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <div className="text-center py-12 text-brand-brown-light">
          No staff found
        </div>
      )}

      {showForm && (
        <StaffFormModal
          staff={editingStaff}
          onClose={() => {
            setShowForm(false);
            setEditingStaff(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingStaff(null);
            loadStaff();
          }}
        />
      )}
    </div>
  );
}

function ProvidersDatabase() {
  const [providers, setProviders] = useState<MasterProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<MasterProvider | null>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  async function loadProviders() {
    setLoading(true);
    const { data, error } = await supabase
      .from('master_transportation_providers')
      .select('id, company_name, contact_person, phone, email, is_active')
      .order('company_name');

    if (error) {
      console.error('Error loading providers:', error);
    } else {
      setProviders(data || []);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this provider?')) return;

    const { error } = await supabase
      .from('master_transportation_providers')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting provider: ' + error.message);
    } else {
      loadProviders();
    }
  }

  const filteredProviders = providers.filter(provider =>
    provider.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-terracotta mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-brown-light w-4 h-4" />
          <input
            type="text"
            placeholder="Search providers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
          />
        </div>
        <button
          onClick={() => {
            setEditingProvider(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-terracotta text-white rounded-lg hover:bg-brand-terracotta-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Provider
        </button>
      </div>

      <div className="text-sm text-brand-brown-light mb-4">
        {filteredProviders.length} of {providers.length} providers
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProviders.map((provider) => (
          <div
            key={provider.id}
            className="bg-white border border-brand-gray-3 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-brand-charcoal">{provider.company_name}</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingProvider(provider);
                    setShowForm(true);
                  }}
                  className="text-brand-brown hover:text-brand-terracotta"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(provider.id)}
                  className="text-brand-brown hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {provider.contact_person && (
              <p className="text-sm text-brand-brown-light mb-1">{provider.contact_person}</p>
            )}
            {provider.phone && (
              <p className="text-sm text-brand-brown-light mb-1">{provider.phone}</p>
            )}
            {provider.email && (
              <p className="text-sm text-brand-brown-light mb-1">{provider.email}</p>
            )}
            {!provider.is_active && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded mt-2 inline-block">Inactive</span>
            )}
          </div>
        ))}
      </div>

      {filteredProviders.length === 0 && (
        <div className="text-center py-12 text-brand-brown-light">
          No providers found
        </div>
      )}

      {showForm && (
        <ProvidersForm
          provider={editingProvider}
          onClose={() => {
            setShowForm(false);
            setEditingProvider(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingProvider(null);
            loadProviders();
          }}
        />
      )}
    </div>
  );
}

function VehiclesDatabase() {
  const [vehicles, setVehicles] = useState<MasterVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<MasterVehicle | null>(null);

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    setLoading(true);
    const { data, error } = await supabase
      .from('master_vehicles')
      .select('id, vehicle_type, license_plate, model, passenger_capacity, is_active')
      .order('vehicle_type');

    if (error) {
      console.error('Error loading vehicles:', error);
    } else {
      setVehicles(data || []);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;

    const { error } = await supabase
      .from('master_vehicles')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting vehicle: ' + error.message);
    } else {
      loadVehicles();
    }
  }

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.vehicle_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.license_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-terracotta mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-brown-light w-4 h-4" />
          <input
            type="text"
            placeholder="Search vehicles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
          />
        </div>
        <button
          onClick={() => {
            setEditingVehicle(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-terracotta text-white rounded-lg hover:bg-brand-terracotta-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Vehicle
        </button>
      </div>

      <div className="text-sm text-brand-brown-light mb-4">
        {filteredVehicles.length} of {vehicles.length} vehicles
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className="bg-white border border-brand-gray-3 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-semibold text-brand-charcoal">{vehicle.vehicle_type}</h4>
                {vehicle.model && (
                  <p className="text-xs text-brand-brown-light">{vehicle.model}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingVehicle(vehicle);
                    setShowForm(true);
                  }}
                  className="text-brand-brown hover:text-brand-terracotta"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(vehicle.id)}
                  className="text-brand-brown hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {vehicle.license_plate && (
              <p className="text-sm text-brand-brown-light mb-1">{vehicle.license_plate}</p>
            )}
            <p className="text-sm text-brand-brown-light mb-1">
              Capacity: {vehicle.passenger_capacity} passengers
            </p>
            {!vehicle.is_active && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded mt-2 inline-block">Inactive</span>
            )}
          </div>
        ))}
      </div>

      {filteredVehicles.length === 0 && (
        <div className="text-center py-12 text-brand-brown-light">
          No vehicles found
        </div>
      )}

      {showForm && (
        <VehiclesForm
          vehicle={editingVehicle}
          onClose={() => {
            setShowForm(false);
            setEditingVehicle(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingVehicle(null);
            loadVehicles();
          }}
        />
      )}
    </div>
  );
}

function GearDatabase() {
  const [gear, setGear] = useState<MasterGear[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingGear, setEditingGear] = useState<MasterGear | null>(null);

  useEffect(() => {
    loadGear();
  }, []);

  async function loadGear() {
    setLoading(true);
    const { data, error } = await supabase
      .from('master_gear')
      .select('id, item_name, quantity, notes, is_active')
      .order('item_name');

    if (error) {
      console.error('Error loading gear:', error);
    } else {
      setGear(data || []);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this gear item?')) return;

    const { error } = await supabase
      .from('master_gear')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting gear: ' + error.message);
    } else {
      loadGear();
    }
  }

  const filteredGear = gear.filter(item =>
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-terracotta mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-brown-light w-4 h-4" />
          <input
            type="text"
            placeholder="Search gear..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
          />
        </div>
        <button
          onClick={() => {
            setEditingGear(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-terracotta text-white rounded-lg hover:bg-brand-terracotta-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Gear
        </button>
      </div>

      <div className="text-sm text-brand-brown-light mb-4">
        {filteredGear.length} of {gear.length} gear items
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGear.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-brand-gray-3 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-brand-charcoal">{item.item_name}</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingGear(item);
                    setShowForm(true);
                  }}
                  className="text-brand-brown hover:text-brand-terracotta"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-brand-brown hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-sm text-brand-brown-light mb-1">
              Quantity: {item.quantity}
            </p>
            {item.notes && (
              <p className="text-sm text-brand-brown-light line-clamp-2">{item.notes}</p>
            )}
            {!item.is_active && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded mt-2 inline-block">Inactive</span>
            )}
          </div>
        ))}
      </div>

      {filteredGear.length === 0 && (
        <div className="text-center py-12 text-brand-brown-light">
          No gear found
        </div>
      )}

      {showForm && (
        <GearForm
          gear={editingGear}
          onClose={() => {
            setShowForm(false);
            setEditingGear(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingGear(null);
            loadGear();
          }}
        />
      )}
    </div>
  );
}

function HotelsDatabase() {
  const [hotels, setHotels] = useState<MasterHotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingHotel, setEditingHotel] = useState<MasterHotel | null>(null);

  useEffect(() => {
    loadHotels();
  }, []);

  async function loadHotels() {
    setLoading(true);
    const { data, error } = await supabase
      .from('master_hotels')
      .select('id, name, location, city, contact_number, email, accommodation_type, notes, is_active')
      .order('name');

    if (error) {
      console.error('Error loading hotels:', error);
    } else {
      setHotels(data || []);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this hotel?')) return;

    const { error } = await supabase
      .from('master_hotels')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting hotel: ' + error.message);
    } else {
      loadHotels();
    }
  }

  const filteredHotels = hotels.filter(hotel =>
    hotel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hotel.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-terracotta mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-brown-light w-4 h-4" />
          <input
            type="text"
            placeholder="Search hotels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
          />
        </div>
        <button
          onClick={() => {
            setEditingHotel(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-terracotta text-white rounded-lg hover:bg-brand-terracotta-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Hotel
        </button>
      </div>

      <div className="text-sm text-brand-brown-light mb-4">
        {filteredHotels.length} of {hotels.length} hotels
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredHotels.map((hotel) => (
          <div
            key={hotel.id}
            className="bg-white border border-brand-gray-3 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-brand-charcoal">{hotel.name}</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingHotel(hotel);
                    setShowForm(true);
                  }}
                  className="text-brand-brown hover:text-brand-terracotta"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(hotel.id)}
                  className="text-brand-brown hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {hotel.city && (
              <p className="text-sm text-brand-brown-light mb-1">
                <MapPin className="w-3 h-3 inline mr-1" />
                {hotel.city}
              </p>
            )}
            {hotel.location && (
              <p className="text-sm text-brand-brown-light mb-1">{hotel.location}</p>
            )}
            {hotel.accommodation_type && (
              <span className="inline-block text-xs bg-brand-cream-dark text-brand-brown px-2 py-1 rounded mt-2">
                {hotel.accommodation_type}
              </span>
            )}
            {!hotel.is_active && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded mt-2 ml-2 inline-block">Inactive</span>
            )}
          </div>
        ))}
      </div>

      {filteredHotels.length === 0 && (
        <div className="text-center py-12 text-brand-brown-light">
          No hotels found
        </div>
      )}

      {showForm && (
        <HotelsForm
          hotel={editingHotel}
          onClose={() => {
            setShowForm(false);
            setEditingHotel(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingHotel(null);
            loadHotels();
          }}
        />
      )}
    </div>
  );
}

function RestaurantsDatabase() {
  const [restaurants, setRestaurants] = useState<MasterRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<MasterRestaurant | null>(null);

  useEffect(() => {
    loadRestaurants();
  }, []);

  async function loadRestaurants() {
    setLoading(true);
    const { data, error } = await supabase
      .from('master_restaurants')
      .select('id, name, location, city, contact_number, cuisine_type, notes, is_active')
      .order('name');

    if (error) {
      console.error('Error loading restaurants:', error);
    } else {
      setRestaurants(data || []);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this restaurant?')) return;

    const { error } = await supabase
      .from('master_restaurants')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting restaurant: ' + error.message);
    } else {
      loadRestaurants();
    }
  }

  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-terracotta mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-brown-light w-4 h-4" />
          <input
            type="text"
            placeholder="Search restaurants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
          />
        </div>
        <button
          onClick={() => {
            setEditingRestaurant(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-terracotta text-white rounded-lg hover:bg-brand-terracotta-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Restaurant
        </button>
      </div>

      <div className="text-sm text-brand-brown-light mb-4">
        {filteredRestaurants.length} of {restaurants.length} restaurants
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRestaurants.map((restaurant) => (
          <div
            key={restaurant.id}
            className="bg-white border border-brand-gray-3 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-brand-charcoal">{restaurant.name}</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingRestaurant(restaurant);
                    setShowForm(true);
                  }}
                  className="text-brand-brown hover:text-brand-terracotta"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(restaurant.id)}
                  className="text-brand-brown hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {restaurant.city && (
              <p className="text-sm text-brand-brown-light mb-1">
                <MapPin className="w-3 h-3 inline mr-1" />
                {restaurant.city}
              </p>
            )}
            {restaurant.location && (
              <p className="text-sm text-brand-brown-light mb-1">{restaurant.location}</p>
            )}
            {restaurant.cuisine_type && (
              <span className="inline-block text-xs bg-brand-cream-dark text-brand-brown px-2 py-1 rounded mt-2">
                {restaurant.cuisine_type}
              </span>
            )}
            {!restaurant.is_active && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded mt-2 ml-2 inline-block">Inactive</span>
            )}
          </div>
        ))}
      </div>

      {filteredRestaurants.length === 0 && (
        <div className="text-center py-12 text-brand-brown-light">
          No restaurants found
        </div>
      )}

      {showForm && (
        <RestaurantsForm
          restaurant={editingRestaurant}
          onClose={() => {
            setShowForm(false);
            setEditingRestaurant(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingRestaurant(null);
            loadRestaurants();
          }}
        />
      )}
    </div>
  );
}

function SitesDatabase() {
  const [sites, setSites] = useState<MasterSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSite, setEditingSite] = useState<MasterSite | null>(null);

  useEffect(() => {
    loadSites();
  }, []);

  async function loadSites() {
    setLoading(true);
    const { data, error } = await supabase
      .from('master_touristic_sites')
      .select('id, name, category, location, city, contact_number, description, notes, is_active')
      .order('name');

    if (error) {
      console.error('Error loading sites:', error);
    } else {
      setSites(data || []);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this site?')) return;

    const { error } = await supabase
      .from('master_touristic_sites')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting site: ' + error.message);
    } else {
      loadSites();
    }
  }

  const filteredSites = sites.filter(site =>
    site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-terracotta mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-brown-light w-4 h-4" />
          <input
            type="text"
            placeholder="Search sites..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
          />
        </div>
        <button
          onClick={() => {
            setEditingSite(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-terracotta text-white rounded-lg hover:bg-brand-terracotta-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Site
        </button>
      </div>

      <div className="text-sm text-brand-brown-light mb-4">
        {filteredSites.length} of {sites.length} sites
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSites.map((site) => (
          <div
            key={site.id}
            className="bg-white border border-brand-gray-3 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-brand-charcoal">{site.name}</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingSite(site);
                    setShowForm(true);
                  }}
                  className="text-brand-brown hover:text-brand-terracotta"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(site.id)}
                  className="text-brand-brown hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {site.city && (
              <p className="text-sm text-brand-brown-light mb-1">
                <MapPin className="w-3 h-3 inline mr-1" />
                {site.city}
              </p>
            )}
            {site.location && (
              <p className="text-sm text-brand-brown-light mb-1">{site.location}</p>
            )}
            {site.description && (
              <p className="text-sm text-brand-brown-light mb-2 line-clamp-2">{site.description}</p>
            )}
            {site.category && (
              <span className="inline-block text-xs bg-brand-cream-dark text-brand-brown px-2 py-1 rounded mt-2">
                {site.category}
              </span>
            )}
            {!site.is_active && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded mt-2 ml-2 inline-block">Inactive</span>
            )}
          </div>
        ))}
      </div>

      {filteredSites.length === 0 && (
        <div className="text-center py-12 text-brand-brown-light">
          No sites found
        </div>
      )}

      {showForm && (
        <SitesForm
          site={editingSite}
          onClose={() => {
            setShowForm(false);
            setEditingSite(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingSite(null);
            loadSites();
          }}
        />
      )}
    </div>
  );
}

function StaffForm({ staff, onClose, onSaved }: { staff: MasterStaff | null; onClose: () => void; onSaved: () => void }) {
  type StaffRole = 'guide' | 'driver' | 'coordinator' | 'photographer' | 'translator' | 'porter' | 'chef' | 'medic' | 'security' | 'assistant' | 'heritage_specialist' | 'other';
  type StaffType = 'internal' | 'external';
  type StaffAvailability = 'available' | 'partially_available' | 'not_available';

  const [uploading, setUploading] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(staff?.profile_photo_url || null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(staff?.document_attachment_url || null);

  const getFileNameFromUrl = (url: string | null): string => {
    if (!url) return 'View Document';
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const parts = pathname.split('/');
      const filename = parts[parts.length - 1];
      return decodeURIComponent(filename) || 'View Document';
    } catch {
      return 'View Document';
    }
  };

  const [formData, setFormData] = useState({
    name: staff?.name || '',
    role: (staff?.role as StaffRole) || 'guide',
    role_custom: staff?.role_custom || '',
    staff_type: (staff?.staff_type as StaffType) || 'internal',
    email: staff?.email || '',
    phone: staff?.phone || '',
    emergency_contact: staff?.emergency_contact || '',
    availability: (staff?.availability as StaffAvailability) || 'available',
    availability_notes: staff?.availability_notes || '',
    payment_method: staff?.payment_method || '',
    id_verified: staff?.id_verified || false,
    contract_signed: staff?.contract_signed || false,
    documents_notes: staff?.documents_notes || '',
    internal_notes: staff?.internal_notes || '',
    has_vehicle: staff?.has_vehicle || false,
    vehicle_type: staff?.vehicle_type || '',
    is_active: staff?.is_active ?? true,
    category: staff?.category || 'staff',
    subcategory: staff?.subcategory || '',
    status: staff?.status || 'active',
  });
  const [saving, setSaving] = useState(false);

  const uploadFile = async (file: File, type: 'photo' | 'document'): Promise<string | null> => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `master/${type}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('staff-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('staff-documents')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error(`Error uploading ${type}:`, err);
      alert(`Failed to upload ${type}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      let finalProfilePhotoUrl = profilePhotoUrl;
      let finalDocumentUrl = documentUrl;

      if (profilePhotoFile) {
        const uploadedUrl = await uploadFile(profilePhotoFile, 'photo');
        if (uploadedUrl) finalProfilePhotoUrl = uploadedUrl;
      }

      if (documentFile) {
        const uploadedUrl = await uploadFile(documentFile, 'document');
        if (uploadedUrl) finalDocumentUrl = uploadedUrl;
      }

      const dataToSave = {
        name: formData.name,
        role: formData.role,
        role_custom: formData.role === 'other' ? formData.role_custom : null,
        staff_type: formData.staff_type,
        email: formData.email || null,
        phone: formData.phone || null,
        emergency_contact: formData.emergency_contact || null,
        availability: formData.availability,
        availability_notes: formData.availability_notes || null,
        payment_method: formData.payment_method || null,
        id_verified: formData.id_verified,
        contract_signed: formData.contract_signed,
        documents_notes: formData.documents_notes || null,
        profile_photo_url: finalProfilePhotoUrl,
        document_attachment_url: finalDocumentUrl,
        has_vehicle: formData.has_vehicle,
        vehicle_type: formData.has_vehicle ? (formData.vehicle_type || null) : null,
        internal_notes: formData.internal_notes || null,
        is_active: formData.is_active,
        category: formData.category,
        subcategory: formData.subcategory || null,
        status: formData.status,
      };

      if (staff) {
        const { error } = await supabase
          .from('master_staff')
          .update(dataToSave)
          .eq('id', staff.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('master_staff')
          .insert([dataToSave]);

        if (error) throw error;
      }

      onSaved();
    } catch (error: any) {
      alert('Error saving staff: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-brand-gray-3 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-brand-charcoal">
            {staff ? 'Edit Staff Member' : 'Add New Staff Member'}
          </h2>
          <button onClick={onClose} className="text-brand-brown hover:text-brand-charcoal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as StaffRole })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              >
                <option value="guide">Guide</option>
                <option value="driver">Driver</option>
                <option value="coordinator">Coordinator</option>
                <option value="photographer">Photographer</option>
                <option value="translator">Translator</option>
                <option value="heritage_specialist">Heritage Specialist</option>
                <option value="porter">Porter</option>
                <option value="chef">Chef</option>
                <option value="medic">Medic</option>
                <option value="security">Security</option>
                <option value="assistant">Assistant</option>
                <option value="other">Other</option>
              </select>
            </div>

            {formData.role === 'other' && (
              <div>
                <label className="block text-sm font-medium text-brand-charcoal mb-1">Custom Role</label>
                <input
                  type="text"
                  value={formData.role_custom}
                  onChange={(e) => setFormData({ ...formData, role_custom: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
                  placeholder="Enter custom role"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">Type</label>
              <select
                value={formData.staff_type}
                onChange={(e) => setFormData({ ...formData, staff_type: e.target.value as StaffType })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              >
                <option value="internal">Internal</option>
                <option value="external">External</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">Emergency Contact</label>
              <input
                type="text"
                value={formData.emergency_contact}
                onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">Availability</label>
              <select
                value={formData.availability}
                onChange={(e) => setFormData({ ...formData, availability: e.target.value as StaffAvailability })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              >
                <option value="available">Available</option>
                <option value="partially_available">Partially Available</option>
                <option value="not_available">Not Available</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-brand-charcoal mb-1">Availability Notes</label>
              <textarea
                value={formData.availability_notes}
                onChange={(e) => setFormData({ ...formData, availability_notes: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
                rows={2}
                placeholder="Late arrival, early leave, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">Payment Method</label>
              <input
                type="text"
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
                placeholder="Cash, Bank Transfer, etc."
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-brand-charcoal mb-3">Profile Photo & Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-charcoal mb-1">Profile Photo</label>
                <div className="space-y-2">
                  {profilePhotoUrl && !profilePhotoFile && (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-brand-gray-3">
                      <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer text-sm">
                      <ImageIcon className="w-4 h-4" />
                      {profilePhotoFile ? profilePhotoFile.name : 'Choose Photo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setProfilePhotoFile(file);
                        }}
                        className="hidden"
                      />
                    </label>
                    {profilePhotoFile && (
                      <span className="text-xs text-green-600">Selected: {profilePhotoFile.name}</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-charcoal mb-1">Document Attachment</label>
                <div className="space-y-2">
                  {documentUrl && !documentFile && (
                    <a
                      href={documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <FileText className="w-4 h-4" />
                      {getFileNameFromUrl(documentUrl)}
                    </a>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer text-sm">
                      <Upload className="w-4 h-4" />
                      {documentFile ? documentFile.name : 'Choose Document'}
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setDocumentFile(file);
                        }}
                        className="hidden"
                      />
                    </label>
                    {documentFile && (
                      <span className="text-xs text-green-600">Selected: {documentFile.name}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-brand-charcoal mb-3">Vehicle Assignment</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_vehicle}
                    onChange={(e) => setFormData({ ...formData, has_vehicle: e.target.checked, vehicle_type: e.target.checked ? formData.vehicle_type : '' })}
                    className="w-4 h-4 text-brand-terracotta rounded focus:ring-2 focus:ring-brand-terracotta"
                  />
                  <span className="text-sm font-medium text-brand-charcoal flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Has Vehicle
                  </span>
                </label>
              </div>

              {formData.has_vehicle && (
                <div>
                  <label className="block text-sm font-medium text-brand-charcoal mb-1">Vehicle Type / Model</label>
                  <input
                    type="text"
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
                    placeholder="e.g., Toyota Land Cruiser, 4x4 SUV"
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-brand-charcoal mb-3">Documents & Requirements</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.id_verified}
                  onChange={(e) => setFormData({ ...formData, id_verified: e.target.checked })}
                  className="w-4 h-4 text-brand-terracotta rounded focus:ring-2 focus:ring-brand-terracotta"
                />
                <span className="text-sm text-brand-charcoal">ID Verified</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.contract_signed}
                  onChange={(e) => setFormData({ ...formData, contract_signed: e.target.checked })}
                  className="w-4 h-4 text-brand-terracotta rounded focus:ring-2 focus:ring-brand-terracotta"
                />
                <span className="text-sm text-brand-charcoal">Contract Signed</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">Documents Notes</label>
              <textarea
                value={formData.documents_notes}
                onChange={(e) => setFormData({ ...formData, documents_notes: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
                rows={2}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1">Internal Notes</label>
            <textarea
              value={formData.internal_notes}
              onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
              className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              rows={3}
              placeholder="Internal notes about this staff member"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-brand-gray-3 text-brand-terracotta focus:ring-brand-terracotta"
              />
              <span className="text-sm text-brand-charcoal">Active</span>
            </label>
          </div>
        </form>

        <div className="p-6 border-t bg-brand-gray-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-brand-gray-3 text-brand-brown rounded-lg hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || uploading}
            className="flex items-center gap-2 px-6 py-2 bg-brand-terracotta text-white rounded-lg hover:bg-brand-terracotta-dark transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {uploading ? 'Uploading...' : saving ? 'Saving...' : 'Save Staff Member'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProvidersForm({ provider, onClose, onSaved }: { provider: MasterProvider | null; onClose: () => void; onSaved: () => void }) {
  const [formData, setFormData] = useState({
    company_name: provider?.company_name || '',
    contact_person: provider?.contact_person || '',
    phone: provider?.phone || '',
    email: provider?.email || '',
    is_active: provider?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (provider) {
        const { error } = await supabase
          .from('master_transportation_providers')
          .update(formData)
          .eq('id', provider.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('master_transportation_providers')
          .insert([formData]);

        if (error) throw error;
      }

      onSaved();
    } catch (error: any) {
      alert('Error saving provider: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-brand-gray-3 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-brand-charcoal">
            {provider ? 'Edit Provider' : 'Add New Provider'}
          </h2>
          <button onClick={onClose} className="text-brand-brown hover:text-brand-charcoal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-brand-gray-3 text-brand-terracotta focus:ring-brand-terracotta"
                />
                <span className="text-sm text-brand-charcoal">Active</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-brand-brown border border-brand-gray-3 rounded-lg hover:bg-brand-gray-4 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-brand-terracotta text-white rounded-lg hover:bg-brand-terracotta-dark transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VehiclesForm({ vehicle, onClose, onSaved }: { vehicle: MasterVehicle | null; onClose: () => void; onSaved: () => void }) {
  const [formData, setFormData] = useState({
    vehicle_type: vehicle?.vehicle_type || '',
    license_plate: vehicle?.license_plate || '',
    model: vehicle?.model || '',
    passenger_capacity: vehicle?.passenger_capacity || 0,
    is_active: vehicle?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (vehicle) {
        const { error } = await supabase
          .from('master_vehicles')
          .update(formData)
          .eq('id', vehicle.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('master_vehicles')
          .insert([formData]);

        if (error) throw error;
      }

      onSaved();
    } catch (error: any) {
      alert('Error saving vehicle: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-brand-gray-3 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-brand-charcoal">
            {vehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
          </h2>
          <button onClick={onClose} className="text-brand-brown hover:text-brand-charcoal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Vehicle Type *
              </label>
              <input
                type="text"
                required
                value={formData.vehicle_type}
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                License Plate
              </label>
              <input
                type="text"
                value={formData.license_plate}
                onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Model
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Passenger Capacity *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.passenger_capacity}
                onChange={(e) => setFormData({ ...formData, passenger_capacity: safeParseInt(e.target.value, 0) || 0 })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-brand-gray-3 text-brand-terracotta focus:ring-brand-terracotta"
                />
                <span className="text-sm text-brand-charcoal">Active</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-brand-brown border border-brand-gray-3 rounded-lg hover:bg-brand-gray-4 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-brand-terracotta text-white rounded-lg hover:bg-brand-terracotta-dark transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GearForm({ gear, onClose, onSaved }: { gear: MasterGear | null; onClose: () => void; onSaved: () => void }) {
  const [formData, setFormData] = useState({
    item_name: gear?.item_name || '',
    quantity: gear?.quantity || 0,
    notes: gear?.notes || '',
    is_active: gear?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (gear) {
        const { error } = await supabase
          .from('master_gear')
          .update(formData)
          .eq('id', gear.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('master_gear')
          .insert([formData]);

        if (error) throw error;
      }

      onSaved();
    } catch (error: any) {
      alert('Error saving gear: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-brand-gray-3 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-brand-charcoal">
            {gear ? 'Edit Gear' : 'Add New Gear'}
          </h2>
          <button onClick={onClose} className="text-brand-brown hover:text-brand-charcoal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Item Name *
              </label>
              <input
                type="text"
                required
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Quantity *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: safeParseInt(e.target.value, 0) || 0 })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-brand-gray-3 text-brand-terracotta focus:ring-brand-terracotta"
                />
                <span className="text-sm text-brand-charcoal">Active</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-brand-brown border border-brand-gray-3 rounded-lg hover:bg-brand-gray-4 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-brand-terracotta text-white rounded-lg hover:bg-brand-terracotta-dark transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HotelsForm({ hotel, onClose, onSaved }: { hotel: MasterHotel | null; onClose: () => void; onSaved: () => void }) {
  const [formData, setFormData] = useState({
    name: hotel?.name || '',
    location: hotel?.location || '',
    city: hotel?.city || '',
    contact_number: hotel?.contact_number || '',
    email: hotel?.email || '',
    accommodation_type: hotel?.accommodation_type || '',
    notes: hotel?.notes || '',
    is_active: hotel?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (hotel) {
        const { error } = await supabase
          .from('master_hotels')
          .update(formData)
          .eq('id', hotel.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('master_hotels')
          .insert([formData]);

        if (error) throw error;
      }

      onSaved();
    } catch (error: any) {
      alert('Error saving hotel: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-brand-gray-3 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-brand-charcoal">
            {hotel ? 'Edit Hotel' : 'Add New Hotel'}
          </h2>
          <button onClick={onClose} className="text-brand-brown hover:text-brand-charcoal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Contact Number
              </label>
              <input
                type="tel"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Accommodation Type
              </label>
              <input
                type="text"
                value={formData.accommodation_type}
                onChange={(e) => setFormData({ ...formData, accommodation_type: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-brand-gray-3 text-brand-terracotta focus:ring-brand-terracotta"
                />
                <span className="text-sm text-brand-charcoal">Active</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-brand-brown border border-brand-gray-3 rounded-lg hover:bg-brand-gray-4 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-brand-terracotta text-white rounded-lg hover:bg-brand-terracotta-dark transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RestaurantsForm({ restaurant, onClose, onSaved }: { restaurant: MasterRestaurant | null; onClose: () => void; onSaved: () => void }) {
  const [formData, setFormData] = useState({
    name: restaurant?.name || '',
    location: restaurant?.location || '',
    city: restaurant?.city || '',
    contact_number: restaurant?.contact_number || '',
    cuisine_type: restaurant?.cuisine_type || '',
    notes: restaurant?.notes || '',
    is_active: restaurant?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (restaurant) {
        const { error } = await supabase
          .from('master_restaurants')
          .update(formData)
          .eq('id', restaurant.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('master_restaurants')
          .insert([formData]);

        if (error) throw error;
      }

      onSaved();
    } catch (error: any) {
      alert('Error saving restaurant: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-brand-gray-3 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-brand-charcoal">
            {restaurant ? 'Edit Restaurant' : 'Add New Restaurant'}
          </h2>
          <button onClick={onClose} className="text-brand-brown hover:text-brand-charcoal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Contact Number
              </label>
              <input
                type="tel"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Cuisine Type
              </label>
              <input
                type="text"
                value={formData.cuisine_type}
                onChange={(e) => setFormData({ ...formData, cuisine_type: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-brand-gray-3 text-brand-terracotta focus:ring-brand-terracotta"
                />
                <span className="text-sm text-brand-charcoal">Active</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-brand-brown border border-brand-gray-3 rounded-lg hover:bg-brand-gray-4 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-brand-terracotta text-white rounded-lg hover:bg-brand-terracotta-dark transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SitesForm({ site, onClose, onSaved }: { site: MasterSite | null; onClose: () => void; onSaved: () => void }) {
  const [formData, setFormData] = useState({
    name: site?.name || '',
    category: site?.category || '',
    location: site?.location || '',
    city: site?.city || '',
    contact_number: site?.contact_number || '',
    description: site?.description || '',
    notes: site?.notes || '',
    is_active: site?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (site) {
        const { error } = await supabase
          .from('master_touristic_sites')
          .update(formData)
          .eq('id', site.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('master_touristic_sites')
          .insert([formData]);

        if (error) throw error;
      }

      onSaved();
    } catch (error: any) {
      alert('Error saving site: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-brand-gray-3 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-brand-charcoal">
            {site ? 'Edit Site' : 'Add New Site'}
          </h2>
          <button onClick={onClose} className="text-brand-brown hover:text-brand-charcoal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Contact Number
              </label>
              <input
                type="tel"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-brand-charcoal mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-brand-gray-3 text-brand-terracotta focus:ring-brand-terracotta"
                />
                <span className="text-sm text-brand-charcoal">Active</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-brand-brown border border-brand-gray-3 rounded-lg hover:bg-brand-gray-4 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-brand-terracotta text-white rounded-lg hover:bg-brand-terracotta-dark transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
