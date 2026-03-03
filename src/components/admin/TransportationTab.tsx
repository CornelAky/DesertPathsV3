import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Truck,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Car,
  Bus,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  Building2,
  Package,
  List,
} from 'lucide-react';
import { ChooseProviderModal } from './ChooseProviderModal';
import { ChooseVehicleModal } from './ChooseVehicleModal';
import { ChooseGearModal } from './ChooseGearModal';
import { safeParseInt } from '../../lib/numberValidation';

interface TransportationTabProps {
  journeyId: string;
}

type VehicleType = 'bus' | 'van' | 'suv' | 'sedan' | 'minibus' | 'truck' | 'motorcycle' | 'other';
type VehicleStatus = 'confirmed' | 'pending' | 'cancelled' | 'maintenance';

interface Provider {
  id: string;
  journey_id: string;
  master_provider_id: string | null;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string;
  created_at: string;
}

interface Vehicle {
  id: string;
  journey_id: string;
  master_vehicle_id: string | null;
  provider_id: string | null;
  driver_id: string | null;
  vehicle_type: VehicleType;
  vehicle_type_custom: string | null;
  license_plate: string | null;
  model: string | null;
  color: string | null;
  passenger_capacity: number;
  status: VehicleStatus;
  has_ac: boolean;
  has_wifi: boolean;
  is_accessible: boolean;
  insurance_valid: boolean;
  insurance_expiry: string | null;
  last_maintenance: string | null;
  fuel_type: string | null;
  notes: string;
  gear: string[] | null;
  created_at: string;
}

interface DayInfo {
  id: string;
  day_number: number;
  date: string;
  city_destination: string;
}

interface ActivityInfo {
  id: string;
  day_id: string;
  activity_name: string;
  location: string;
  activity_time: string;
}

interface StaffInfo {
  id: string;
  name: string;
  phone: string | null;
  status: string;
}

interface VehicleDayAssignment {
  id: string;
  vehicle_id: string;
  day_id: string;
  pickup_time: string | null;
  pickup_location: string | null;
  dropoff_time: string | null;
  dropoff_location: string | null;
  notes: string;
}

interface GearItem {
  id: string;
  journey_id: string;
  master_gear_id: string | null;
  item_name: string;
  quantity: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export function TransportationTab({ journeyId }: TransportationTabProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [days, setDays] = useState<DayInfo[]>([]);
  const [activities, setActivities] = useState<ActivityInfo[]>([]);
  const [drivers, setDrivers] = useState<StaffInfo[]>([]);
  const [dayAssignments, setDayAssignments] = useState<VehicleDayAssignment[]>([]);
  const [gear, setGear] = useState<GearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showGearModal, setShowGearModal] = useState(false);
  const [showChooseProviderModal, setShowChooseProviderModal] = useState(false);
  const [showChooseVehicleModal, setShowChooseVehicleModal] = useState(false);
  const [showChooseGearModal, setShowChooseGearModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingGear, setEditingGear] = useState<GearItem | null>(null);
  const [expandedVehicles, setExpandedVehicles] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAllData();
  }, [journeyId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      const [
        providersRes,
        vehiclesRes,
        daysRes,
        activitiesRes,
        driversRes,
        dayAssignmentsRes,
        gearRes,
      ] = await Promise.all([
        supabase.from('journey_transportation_providers').select('id, journey_id, master_provider_id, company_name, contact_person, phone, email, address, notes, created_at').eq('journey_id', journeyId),
        supabase.from('journey_vehicles').select('id, journey_id, master_vehicle_id, provider_id, driver_id, vehicle_type, vehicle_type_custom, license_plate, model, color, passenger_capacity, status, has_ac, has_wifi, is_accessible, insurance_valid, insurance_expiry, last_maintenance, fuel_type, notes, gear, created_at').eq('journey_id', journeyId),
        supabase.from('itinerary_days').select('id, day_number, date, city_destination').eq('journey_id', journeyId).order('day_number'),
        supabase.from('activities').select('id, day_id, activity_name, location, activity_time').in(
          'day_id',
          (await supabase.from('itinerary_days').select('id').eq('journey_id', journeyId)).data?.map(d => d.id) || []
        ),
        supabase.from('journey_staff').select('id, name, phone, status').eq('journey_id', journeyId).eq('role', 'driver'),
        supabase.from('journey_vehicle_day_assignments').select('id, vehicle_id, day_id, pickup_time, pickup_location, dropoff_time, dropoff_location, notes'),
        supabase.from('journey_gear').select('id, journey_id, master_gear_id, item_name, quantity, notes, created_at, updated_at').eq('journey_id', journeyId).order('item_name'),
      ]);

      if (providersRes.error) throw providersRes.error;
      if (vehiclesRes.error) throw vehiclesRes.error;
      if (daysRes.error) throw daysRes.error;
      if (activitiesRes.error) throw activitiesRes.error;
      if (driversRes.error) throw driversRes.error;
      if (dayAssignmentsRes.error) throw dayAssignmentsRes.error;
      if (gearRes.error) throw gearRes.error;

      setProviders(providersRes.data || []);
      setVehicles(vehiclesRes.data || []);
      setDays(daysRes.data || []);
      setActivities(activitiesRes.data || []);
      setDrivers(driversRes.data || []);
      setDayAssignments(dayAssignmentsRes.data || []);
      setGear(gearRes.data || []);
    } catch (err) {
      console.error('Error fetching transportation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDayCoverage = () => {
    const coveredDays = new Set(dayAssignments.map(a => a.day_id));
    const totalDays = days.length;
    const covered = coveredDays.size;
    return { total: totalDays, covered, missing: totalDays - covered };
  };

  const getVehicleIcon = (type: VehicleType) => {
    switch (type) {
      case 'bus':
      case 'minibus':
        return <Bus className="w-5 h-5" />;
      case 'van':
      case 'suv':
      case 'sedan':
      case 'truck':
        return <Car className="w-5 h-5" />;
      default:
        return <Truck className="w-5 h-5" />;
    }
  };

  const getStatusIcon = (status: VehicleStatus) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'maintenance':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
    }
  };

  const getStatusColor = (status: VehicleStatus) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'maintenance':
        return 'bg-orange-50 text-orange-700 border-orange-200';
    }
  };

  const getVehicleTypeLabel = (type: VehicleType, custom: string | null) => {
    if (type === 'other' && custom) return custom;
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const calculateCompletion = () => {
    if (days.length === 0) return 0;

    const coverage = getDayCoverage();
    const confirmedVehicles = vehicles.filter(v => v.status === 'confirmed').length;
    const totalVehicles = vehicles.length;

    if (coverage.covered === coverage.total && confirmedVehicles === totalVehicles && totalVehicles > 0) {
      return 100;
    }

    let score = 0;
    if (coverage.covered > 0) score += (coverage.covered / coverage.total) * 60;
    if (totalVehicles > 0) score += (confirmedVehicles / totalVehicles) * 40;

    return Math.round(score);
  };

  const toggleExpanded = (vehicleId: string) => {
    const newExpanded = new Set(expandedVehicles);
    if (newExpanded.has(vehicleId)) {
      newExpanded.delete(vehicleId);
    } else {
      newExpanded.add(vehicleId);
    }
    setExpandedVehicles(newExpanded);
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('Delete this provider? Associated vehicles will be unlinked.')) return;

    try {
      const { error } = await supabase.from('journey_transportation_providers').delete().eq('id', id);
      if (error) throw error;
      await fetchAllData();
    } catch (err) {
      console.error('Error deleting provider:', err);
      alert('Failed to delete provider');
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm('Delete this vehicle? All assignments will be removed.')) return;

    try {
      const { error } = await supabase.from('journey_vehicles').delete().eq('id', id);
      if (error) throw error;
      await fetchAllData();
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      alert('Failed to delete vehicle');
    }
  };

  const handleDeleteGear = async (id: string) => {
    if (!confirm('Delete this gear item?')) return;

    try {
      const { error } = await supabase.from('journey_gear').delete().eq('id', id);
      if (error) throw error;
      await fetchAllData();
    } catch (err) {
      console.error('Error deleting gear:', err);
      alert('Failed to delete gear');
    }
  };

  const completionPercentage = calculateCompletion();
  const isFullyCompleted = completionPercentage === 100;
  const coverage = getDayCoverage();
  const confirmedCount = vehicles.filter(v => v.status === 'confirmed').length;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-brand-gray-1">Loading transportation...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-brand-gray-3 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-brand-brown mb-1">Transportation Overview</h2>
            <p className="text-sm text-brand-gray-1">Manage vehicles and logistics</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowChooseProviderModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-purple-600 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-sm font-medium"
            >
              <Building2 className="w-4 h-4" />
              Choose Provider
            </button>
            <button
              onClick={() => setShowProviderModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add New
            </button>
            <button
              onClick={() => setShowChooseVehicleModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
            >
              <Car className="w-4 h-4" />
              Choose Vehicle
            </button>
            <button
              onClick={() => setShowVehicleModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add New
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Total Vehicles</p>
                <p className="text-2xl font-bold text-blue-900">{vehicles.length}</p>
              </div>
              <Truck className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Confirmed</p>
                <p className="text-2xl font-bold text-green-900">{confirmedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </div>

          <div className={`border rounded-lg p-4 ${
            coverage.covered === coverage.total && coverage.total > 0
              ? 'bg-green-50 border-green-200'
              : coverage.covered > 0
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  coverage.covered === coverage.total && coverage.total > 0
                    ? 'text-green-700'
                    : coverage.covered > 0
                    ? 'text-yellow-700'
                    : 'text-red-700'
                }`}>
                  Day Coverage
                </p>
                <p className={`text-2xl font-bold ${
                  coverage.covered === coverage.total && coverage.total > 0
                    ? 'text-green-900'
                    : coverage.covered > 0
                    ? 'text-yellow-900'
                    : 'text-red-900'
                }`}>
                  {coverage.covered}/{coverage.total}
                </p>
              </div>
              {coverage.covered === coverage.total && coverage.total > 0 ? (
                <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
              ) : (
                <AlertCircle className={`w-8 h-8 opacity-50 ${
                  coverage.covered > 0 ? 'text-yellow-600' : 'text-red-600'
                }`} />
              )}
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Providers</p>
                <p className="text-2xl font-bold text-purple-900">{providers.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-purple-600 opacity-50" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1 mr-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-brand-brown">Overall Completion</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-brand-brown">{completionPercentage}%</span>
                {isFullyCompleted && <CheckCircle className="w-5 h-5 text-green-600" />}
              </div>
            </div>
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isFullyCompleted ? 'bg-green-600' : 'bg-blue-600'
                }`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {providers.length > 0 && (
        <div className="bg-white rounded-lg border border-brand-gray-3 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-brand-brown mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Transportation Providers
          </h3>
          <div className="space-y-3">
            {providers.map(provider => (
              <div
                key={provider.id}
                className="border border-brand-gray-3 rounded-lg p-4 hover:border-brand-gray-2 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-brand-brown mb-2">{provider.company_name}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-brand-gray-1">
                      {provider.contact_person && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {provider.contact_person}
                        </div>
                      )}
                      {provider.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {provider.phone}
                        </div>
                      )}
                      {provider.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {provider.email}
                        </div>
                      )}
                      {provider.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {provider.address}
                        </div>
                      )}
                    </div>
                    {provider.notes && (
                      <p className="text-xs text-brand-gray-1 mt-2">{provider.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingProvider(provider)}
                      className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-5 h-5 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteProvider(provider.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-brand-gray-3 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-brand-brown mb-4 flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Vehicles
        </h3>
        {vehicles.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="w-12 h-12 text-brand-gray-2 mx-auto mb-3" />
            <p className="text-brand-gray-1 mb-4">No vehicles added yet</p>
            <button
              onClick={() => setShowVehicleModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add First Vehicle
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {vehicles.map(vehicle => {
              const provider = providers.find(p => p.id === vehicle.provider_id);
              const driver = drivers.find(d => d.id === vehicle.driver_id);
              const assignments = dayAssignments.filter(a => a.vehicle_id === vehicle.id);

              return (
                <div
                  key={vehicle.id}
                  className="border border-brand-gray-3 rounded-lg p-4 hover:border-brand-gray-2 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-brand-gray-4 rounded-lg">
                        {getVehicleIcon(vehicle.vehicle_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-brand-brown">
                            {getVehicleTypeLabel(vehicle.vehicle_type, vehicle.vehicle_type_custom)}
                            {vehicle.model && ` - ${vehicle.model}`}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                            vehicle.status
                          )}`}>
                            {vehicle.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-sm text-brand-gray-1 mb-2">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {vehicle.passenger_capacity} seats
                          </span>
                          {vehicle.license_plate && (
                            <span className="px-2 py-0.5 bg-brand-gray-4 rounded text-xs font-mono">
                              {vehicle.license_plate}
                            </span>
                          )}
                          {provider && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-4 h-4" />
                              {provider.company_name}
                            </span>
                          )}
                          {driver && (
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              Driver: {driver.name}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs">
                          {vehicle.has_ac && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">AC</span>
                          )}
                          {vehicle.has_wifi && (
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded">WiFi</span>
                          )}
                          {vehicle.is_accessible && (
                            <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded">Accessible</span>
                          )}
                          {assignments.length > 0 && (
                            <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded">
                              {assignments.length} day{assignments.length !== 1 ? 's' : ''} assigned
                            </span>
                          )}
                          {vehicle.gear && vehicle.gear.length > 0 && (
                            <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              {vehicle.gear.length} gear item{vehicle.gear.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExpanded(vehicle.id)}
                        className="p-2 hover:bg-brand-gray-4 rounded-lg transition-colors"
                      >
                        {expandedVehicles.has(vehicle.id) ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditingVehicle(vehicle)}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-5 h-5 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteVehicle(vehicle.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5 text-red-600" />
                      </button>
                    </div>
                  </div>

                  {expandedVehicles.has(vehicle.id) && (
                    <div className="mt-4 pt-4 border-t border-brand-gray-3 space-y-3">
                      {vehicle.gear && vehicle.gear.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-brand-brown mb-2 flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Gear & Equipment
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {vehicle.gear.map((item, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-teal-50 text-teal-700 rounded text-xs border border-teal-200"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {vehicle.notes && (
                        <div>
                          <p className="text-xs font-semibold text-brand-brown mb-1">Notes</p>
                          <p className="text-sm text-brand-gray-1">{vehicle.notes}</p>
                        </div>
                      )}

                      {assignments.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-brand-brown mb-2">Assigned Days</p>
                          <div className="space-y-2">
                            {assignments.map(assignment => {
                              const day = days.find(d => d.id === assignment.day_id);
                              if (!day) return null;
                              return (
                                <div
                                  key={assignment.id}
                                  className="text-sm bg-brand-gray-4 rounded p-2"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <Calendar className="w-4 h-4 text-brand-gray-1" />
                                    <span className="font-medium">Day {day.day_number} - {day.city_destination}</span>
                                  </div>
                                  {assignment.pickup_location && (
                                    <p className="text-xs text-brand-gray-1 ml-6">
                                      Pickup: {assignment.pickup_location}
                                      {assignment.pickup_time && ` at ${assignment.pickup_time}`}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {vehicle.insurance_valid && vehicle.insurance_expiry && (
                          <div>
                            <span className="text-brand-gray-1">Insurance:</span>
                            <span className="ml-1 text-brand-brown">
                              {new Date(vehicle.insurance_expiry).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {vehicle.last_maintenance && (
                          <div>
                            <span className="text-brand-gray-1">Last Service:</span>
                            <span className="ml-1 text-brand-brown">
                              {new Date(vehicle.last_maintenance).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {vehicle.fuel_type && (
                          <div>
                            <span className="text-brand-gray-1">Fuel:</span>
                            <span className="ml-1 text-brand-brown">{vehicle.fuel_type}</span>
                          </div>
                        )}
                        {vehicle.color && (
                          <div>
                            <span className="text-brand-gray-1">Color:</span>
                            <span className="ml-1 text-brand-brown">{vehicle.color}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-brand-gray-3 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-brand-brown flex items-center gap-2">
            <Package className="w-5 h-5" />
            Gear & Equipment
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowChooseGearModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-teal-600 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors text-sm font-medium"
            >
              <List className="w-4 h-4" />
              Choose Gear
            </button>
            <button
              onClick={() => setShowGearModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add New
            </button>
          </div>
        </div>
        {gear.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-brand-gray-2 mx-auto mb-3" />
            <p className="text-brand-gray-1 mb-4">No gear added yet</p>
            <button
              onClick={() => setShowGearModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add First Gear Item
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {gear.map(item => (
              <div
                key={item.id}
                className="border border-brand-gray-3 rounded-lg p-4 hover:border-brand-gray-2 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-teal-50 rounded-lg">
                      <Package className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-brand-brown mb-1">{item.item_name}</h4>
                      <div className="flex items-center gap-4 text-sm text-brand-gray-1">
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Quantity:</span> {item.quantity}
                        </span>
                      </div>
                      {item.notes && (
                        <p className="text-sm text-brand-gray-1 mt-2">{item.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingGear(item)}
                      className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-5 h-5 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteGear(item.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(showProviderModal || editingProvider) && (
        <ProviderModal
          journeyId={journeyId}
          provider={editingProvider}
          onClose={() => {
            setShowProviderModal(false);
            setEditingProvider(null);
          }}
          onSave={() => {
            fetchAllData();
            setShowProviderModal(false);
            setEditingProvider(null);
          }}
        />
      )}

      {(showVehicleModal || editingVehicle) && (
        <VehicleModal
          journeyId={journeyId}
          vehicle={editingVehicle}
          providers={providers}
          drivers={drivers}
          days={days}
          onClose={() => {
            setShowVehicleModal(false);
            setEditingVehicle(null);
          }}
          onSave={() => {
            fetchAllData();
            setShowVehicleModal(false);
            setEditingVehicle(null);
          }}
        />
      )}

      {(showGearModal || editingGear) && (
        <GearModal
          journeyId={journeyId}
          gear={editingGear}
          onClose={() => {
            setShowGearModal(false);
            setEditingGear(null);
          }}
          onSave={() => {
            fetchAllData();
            setShowGearModal(false);
            setEditingGear(null);
          }}
        />
      )}

      {showChooseProviderModal && (
        <ChooseProviderModal
          journeyId={journeyId}
          existingMasterProviderIds={providers.filter(p => p.master_provider_id).map(p => p.master_provider_id as string)}
          onClose={() => setShowChooseProviderModal(false)}
          onProviderSelected={() => {
            fetchAllData();
            setShowChooseProviderModal(false);
          }}
        />
      )}

      {showChooseVehicleModal && (
        <ChooseVehicleModal
          journeyId={journeyId}
          existingMasterVehicleIds={vehicles.filter(v => v.master_vehicle_id).map(v => v.master_vehicle_id as string)}
          onClose={() => setShowChooseVehicleModal(false)}
          onVehicleSelected={() => {
            fetchAllData();
            setShowChooseVehicleModal(false);
          }}
        />
      )}

      {showChooseGearModal && (
        <ChooseGearModal
          journeyId={journeyId}
          existingMasterGearIds={gear.filter(g => g.master_gear_id).map(g => g.master_gear_id as string)}
          onClose={() => setShowChooseGearModal(false)}
          onGearSelected={() => {
            fetchAllData();
            setShowChooseGearModal(false);
          }}
        />
      )}
    </div>
  );
}

interface ProviderModalProps {
  journeyId: string;
  provider: Provider | null;
  onClose: () => void;
  onSave: () => void;
}

function ProviderModal({ journeyId, provider, onClose, onSave }: ProviderModalProps) {
  const [loading, setLoading] = useState(false);
  const [saveToMasterList, setSaveToMasterList] = useState(!provider);
  const [formData, setFormData] = useState({
    company_name: provider?.company_name || '',
    contact_person: provider?.contact_person || '',
    phone: provider?.phone || '',
    email: provider?.email || '',
    address: provider?.address || '',
    notes: provider?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.company_name.trim()) {
      alert('Please enter company name');
      return;
    }

    try {
      setLoading(true);

      if (provider) {
        const { error } = await supabase
          .from('journey_transportation_providers')
          .update(formData)
          .eq('id', provider.id);

        if (error) throw error;
      } else {
        let masterProviderId = null;

        if (saveToMasterList) {
          const { data: masterProvider, error: masterError } = await supabase
            .from('master_transportation_providers')
            .insert(formData)
            .select()
            .single();

          if (masterError) throw masterError;
          masterProviderId = masterProvider.id;
        }

        const { error } = await supabase
          .from('journey_transportation_providers')
          .insert({
            ...formData,
            journey_id: journeyId,
            master_provider_id: masterProviderId
          });

        if (error) throw error;
      }

      onSave();
    } catch (err) {
      console.error('Error saving provider:', err);
      alert('Failed to save provider');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold text-brand-brown">
            {provider ? 'Edit Provider' : 'Add Provider'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-brand-gray-4 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-brown mb-1">
              Company Name *
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-brown mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-brown mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-brown mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-brown mb-1">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-brown mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {!provider && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToMasterList}
                  onChange={(e) => setSaveToMasterList(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-brand-brown block">Save to master provider list</span>
                  <span className="text-xs text-brand-gray-1">Make this provider available for other journeys</span>
                </div>
              </label>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-brand-gray-3 text-brand-brown rounded-lg hover:bg-brand-gray-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Saving...' : 'Save Provider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface VehicleModalProps {
  journeyId: string;
  vehicle: Vehicle | null;
  providers: Provider[];
  drivers: StaffInfo[];
  days: DayInfo[];
  onClose: () => void;
  onSave: () => void;
}

const PREDEFINED_GEAR = [
  'Recovery Kit (Compressor, Snatch Strap, Sand Tracks)',
  'Camping Set (Awning, Chairs, Table)',
  'Fridge/Cooler',
  'Walkie-Talkie',
  'Satellite Phone',
  'First Aid Kit',
  'Tool Kit',
  'GPS Device',
  'Fire Extinguisher',
  'Emergency Flares',
];

function VehicleModal({ journeyId, vehicle, providers, drivers, days, onClose, onSave }: VehicleModalProps) {
  const [loading, setLoading] = useState(false);
  const [saveToMasterList, setSaveToMasterList] = useState(!vehicle);
  const [customGearInput, setCustomGearInput] = useState('');
  const [formData, setFormData] = useState({
    provider_id: vehicle?.provider_id || '',
    driver_id: vehicle?.driver_id || '',
    vehicle_type: vehicle?.vehicle_type || 'sedan' as VehicleType,
    vehicle_type_custom: vehicle?.vehicle_type_custom || '',
    license_plate: vehicle?.license_plate || '',
    model: vehicle?.model || '',
    color: vehicle?.color || '',
    passenger_capacity: vehicle?.passenger_capacity?.toString() || '4',
    status: vehicle?.status || 'pending' as VehicleStatus,
    has_ac: vehicle?.has_ac ?? true,
    has_wifi: vehicle?.has_wifi ?? false,
    is_accessible: vehicle?.is_accessible ?? false,
    insurance_valid: vehicle?.insurance_valid ?? false,
    insurance_expiry: vehicle?.insurance_expiry || '',
    last_maintenance: vehicle?.last_maintenance || '',
    fuel_type: vehicle?.fuel_type || '',
    notes: vehicle?.notes || '',
    gear: vehicle?.gear || [] as string[],
    assignedDays: [] as string[],
  });

  const handleAddGear = (gearItem: string) => {
    if (!formData.gear.includes(gearItem)) {
      setFormData({ ...formData, gear: [...formData.gear, gearItem] });
    }
  };

  const handleAddCustomGear = () => {
    const trimmed = customGearInput.trim();
    if (trimmed && !formData.gear.includes(trimmed)) {
      setFormData({ ...formData, gear: [...formData.gear, trimmed] });
      setCustomGearInput('');
    }
  };

  const handleRemoveGear = (gearItem: string) => {
    setFormData({ ...formData, gear: formData.gear.filter(g => g !== gearItem) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const dataToSave = {
        journey_id: journeyId,
        provider_id: formData.provider_id || null,
        driver_id: formData.driver_id || null,
        vehicle_type: formData.vehicle_type,
        vehicle_type_custom: formData.vehicle_type === 'other' ? formData.vehicle_type_custom : null,
        license_plate: formData.license_plate || null,
        model: formData.model || null,
        color: formData.color || null,
        passenger_capacity: safeParseInt(formData.passenger_capacity, 0) || 0,
        status: formData.status,
        has_ac: formData.has_ac,
        has_wifi: formData.has_wifi,
        is_accessible: formData.is_accessible,
        insurance_valid: formData.insurance_valid,
        insurance_expiry: formData.insurance_expiry || null,
        last_maintenance: formData.last_maintenance || null,
        fuel_type: formData.fuel_type || null,
        notes: formData.notes,
        gear: formData.gear.length > 0 ? formData.gear : [],
      };

      if (vehicle) {
        const { error } = await supabase
          .from('journey_vehicles')
          .update(dataToSave)
          .eq('id', vehicle.id);

        if (error) throw error;
      } else {
        let masterVehicleId = null;

        if (saveToMasterList) {
          const masterVehicleData = {
            vehicle_type: formData.vehicle_type,
            vehicle_type_custom: formData.vehicle_type === 'other' ? formData.vehicle_type_custom : null,
            license_plate: formData.license_plate || null,
            model: formData.model || null,
            color: formData.color || null,
            passenger_capacity: safeParseInt(formData.passenger_capacity, 0) || 0,
            has_ac: formData.has_ac,
            has_wifi: formData.has_wifi,
            is_accessible: formData.is_accessible,
            insurance_valid: formData.insurance_valid,
            insurance_expiry: formData.insurance_expiry || null,
            last_maintenance: formData.last_maintenance || null,
            fuel_type: formData.fuel_type || null,
            notes: formData.notes,
            gear: formData.gear.length > 0 ? formData.gear : [],
          };

          const { data: masterVehicle, error: masterError } = await supabase
            .from('master_vehicles')
            .insert(masterVehicleData)
            .select()
            .single();

          if (masterError) throw masterError;
          masterVehicleId = masterVehicle.id;
        }

        const { data: newVehicle, error } = await supabase
          .from('journey_vehicles')
          .insert({ ...dataToSave, master_vehicle_id: masterVehicleId })
          .select()
          .single();

        if (error) throw error;

        if (formData.assignedDays.length > 0 && newVehicle) {
          const assignments = formData.assignedDays.map(dayId => ({
            vehicle_id: newVehicle.id,
            day_id: dayId,
          }));

          const { error: assignError } = await supabase
            .from('journey_vehicle_day_assignments')
            .insert(assignments);

          if (assignError) throw assignError;
        }
      }

      onSave();
    } catch (err) {
      console.error('Error saving vehicle:', err);
      alert('Failed to save vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full my-8">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold text-brand-brown">
            {vehicle ? 'Edit Vehicle' : 'Add Vehicle'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-brand-gray-4 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-brown mb-1">
                Vehicle Type *
              </label>
              <select
                value={formData.vehicle_type}
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value as VehicleType })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="bus">Bus</option>
                <option value="minibus">Minibus</option>
                <option value="van">Van</option>
                <option value="suv">SUV</option>
                <option value="sedan">Sedan</option>
                <option value="truck">Truck</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="other">Other</option>
              </select>
            </div>

            {formData.vehicle_type === 'other' && (
              <div>
                <label className="block text-sm font-medium text-brand-brown mb-1">
                  Custom Type
                </label>
                <input
                  type="text"
                  value={formData.vehicle_type_custom}
                  onChange={(e) => setFormData({ ...formData, vehicle_type_custom: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-brand-brown mb-1">
                Provider
              </label>
              <select
                value={formData.provider_id}
                onChange={(e) => setFormData({ ...formData, provider_id: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>{p.company_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-brown mb-1">
                Driver
              </label>
              <select
                value={formData.driver_id}
                onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-brown mb-1">
                License Plate
              </label>
              <input
                type="text"
                value={formData.license_plate}
                onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-brown mb-1">
                Model
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-brown mb-1">
                Color
              </label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-brown mb-1">
                Passenger Capacity *
              </label>
              <input
                type="number"
                value={formData.passenger_capacity}
                onChange={(e) => setFormData({ ...formData, passenger_capacity: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-brown mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as VehicleStatus })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-brown mb-1">
                Fuel Type
              </label>
              <input
                type="text"
                value={formData.fuel_type}
                onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Diesel, Petrol, Electric, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-brown mb-1">
                Insurance Expiry
              </label>
              <input
                type="date"
                value={formData.insurance_expiry}
                onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-brown mb-1">
                Last Maintenance
              </label>
              <input
                type="date"
                value={formData.last_maintenance}
                onChange={(e) => setFormData({ ...formData, last_maintenance: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.has_ac}
                onChange={(e) => setFormData({ ...formData, has_ac: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-brand-brown">AC</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.has_wifi}
                onChange={(e) => setFormData({ ...formData, has_wifi: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-brand-brown">WiFi</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_accessible}
                onChange={(e) => setFormData({ ...formData, is_accessible: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-brand-brown">Accessible</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.insurance_valid}
                onChange={(e) => setFormData({ ...formData, insurance_valid: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-brand-brown">Insurance Valid</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-brown mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-brand-brown" />
              <h3 className="text-lg font-semibold text-brand-brown">Gear & Equipment</h3>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-brand-brown mb-2">
                Select Predefined Gear
              </label>
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_GEAR.map((gear) => (
                  <button
                    key={gear}
                    type="button"
                    onClick={() => handleAddGear(gear)}
                    disabled={formData.gear.includes(gear)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      formData.gear.includes(gear)
                        ? 'bg-teal-50 text-teal-700 border-teal-300 cursor-not-allowed'
                        : 'bg-white text-brand-brown border-brand-gray-3 hover:bg-teal-50 hover:border-teal-300'
                    }`}
                  >
                    {formData.gear.includes(gear) && <CheckCircle className="w-3 h-3 inline mr-1" />}
                    {gear}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-brand-brown mb-2">
                Add Custom Gear
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customGearInput}
                  onChange={(e) => setCustomGearInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomGear();
                    }
                  }}
                  placeholder="Enter custom gear item..."
                  className="flex-1 px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddCustomGear}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>

            {formData.gear.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-brand-brown mb-2">
                  Selected Gear ({formData.gear.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {formData.gear.map((item) => (
                    <span
                      key={item}
                      className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-sm border border-teal-200 flex items-center gap-2"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => handleRemoveGear(item)}
                        className="hover:bg-teal-100 rounded p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!vehicle && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToMasterList}
                  onChange={(e) => setSaveToMasterList(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-brand-brown block">Save to master vehicle list</span>
                  <span className="text-xs text-brand-gray-1">Make this vehicle available for other journeys</span>
                </div>
              </label>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-brand-gray-3 text-brand-brown rounded-lg hover:bg-brand-gray-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Saving...' : 'Save Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface GearModalProps {
  journeyId: string;
  gear: GearItem | null;
  onClose: () => void;
  onSave: () => void;
}

const PREDEFINED_GEAR_OPTIONS = [
  'Recovery Kit (Compressor, Snatch Strap, Sand Tracks)',
  'Camping Set (Awning, Chairs, Table)',
  'Fridge / Cooler',
  'Walkie-Talkie',
  'Satellite Phone',
  'First Aid Kit',
  'Tool Kit',
  'GPS Device',
  'Fire Extinguisher',
  'Emergency Flares',
];

function GearModal({ journeyId, gear, onClose, onSave }: GearModalProps) {
  const [loading, setLoading] = useState(false);
  const [saveToMasterList, setSaveToMasterList] = useState(!gear);
  const [selectedGear, setSelectedGear] = useState<string>(gear?.item_name || '');
  const [customGearInput, setCustomGearInput] = useState('');
  const [formData, setFormData] = useState({
    item_name: gear?.item_name || '',
    quantity: gear?.quantity?.toString() || '1',
    notes: gear?.notes || '',
  });

  const handleSelectPredefinedGear = (gearName: string) => {
    setSelectedGear(gearName);
    setFormData({ ...formData, item_name: gearName });
  };

  const handleCustomGearChange = (value: string) => {
    setCustomGearInput(value);
    setSelectedGear('');
    setFormData({ ...formData, item_name: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.item_name.trim()) {
      alert('Please select or enter an item name');
      return;
    }

    const quantity = safeParseInt(formData.quantity, 0);
    if (quantity === null || quantity < 1) {
      alert('Please enter a valid quantity (minimum 1)');
      return;
    }

    try {
      setLoading(true);

      const dataToSave = {
        journey_id: journeyId,
        item_name: formData.item_name.trim(),
        quantity: quantity,
        notes: formData.notes.trim(),
      };

      if (gear) {
        const { error } = await supabase
          .from('journey_gear')
          .update(dataToSave)
          .eq('id', gear.id);

        if (error) throw error;
      } else {
        let masterGearId = null;

        if (saveToMasterList) {
          const masterGearData = {
            item_name: formData.item_name.trim(),
            quantity: quantity,
            notes: formData.notes.trim(),
          };

          const { data: masterGear, error: masterError } = await supabase
            .from('master_gear')
            .insert(masterGearData)
            .select()
            .single();

          if (masterError) throw masterError;
          masterGearId = masterGear.id;
        }

        const { error } = await supabase
          .from('journey_gear')
          .insert({ ...dataToSave, master_gear_id: masterGearId });

        if (error) throw error;
      }

      onSave();
    } catch (err) {
      console.error('Error saving gear:', err);
      alert('Failed to save gear item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full my-8">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold text-brand-brown flex items-center gap-2">
            <Package className="w-6 h-6" />
            {gear ? 'Edit Gear Item' : 'Add Gear Item'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-brand-gray-4 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-brand-brown mb-3">
              Select Predefined Gear
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {PREDEFINED_GEAR_OPTIONS.map((gearName) => (
                <button
                  key={gearName}
                  type="button"
                  onClick={() => handleSelectPredefinedGear(gearName)}
                  className={`px-4 py-3 text-sm rounded-lg border transition-colors text-left ${
                    selectedGear === gearName
                      ? 'bg-teal-50 text-teal-700 border-teal-300 font-medium'
                      : 'bg-white text-brand-brown border-brand-gray-3 hover:bg-teal-50 hover:border-teal-300'
                  }`}
                >
                  {selectedGear === gearName && <CheckCircle className="w-4 h-4 inline mr-2" />}
                  {gearName}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-brand-brown mb-2">
              Or Enter Custom Gear Item
            </label>
            <input
              type="text"
              value={customGearInput}
              onChange={(e) => handleCustomGearChange(e.target.value)}
              className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="e.g., Portable Generator, Water Purifier, etc."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-brown mb-1">
                Quantity *
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-teal-500"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-brown mb-1">
                Selected Item
              </label>
              <div className="px-3 py-2 border border-brand-gray-3 rounded-lg bg-brand-gray-4 text-brand-brown text-sm">
                {formData.item_name || 'None selected'}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-brown mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-teal-500"
              rows={3}
              placeholder="Additional details about this gear..."
            />
          </div>

          {!gear && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToMasterList}
                  onChange={(e) => setSaveToMasterList(e.target.checked)}
                  className="w-5 h-5 text-teal-600 rounded mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-brand-brown block">Save to master gear list</span>
                  <span className="text-xs text-brand-gray-1">Make this gear available for other journeys</span>
                </div>
              </label>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-brand-gray-3 text-brand-brown rounded-lg hover:bg-brand-gray-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Saving...' : 'Save Gear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
