import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  X,
  Truck,
  CheckCircle,
  Search,
  Car,
  Bus,
  User,
  Package,
} from 'lucide-react';

type VehicleType = 'bus' | 'van' | 'suv' | 'sedan' | 'minibus' | 'truck' | 'motorcycle' | 'other';

interface MasterVehicle {
  id: string;
  vehicle_type: VehicleType;
  vehicle_type_custom: string | null;
  license_plate: string | null;
  model: string | null;
  color: string | null;
  passenger_capacity: number;
  has_ac: boolean;
  has_wifi: boolean;
  is_accessible: boolean;
  insurance_valid: boolean;
  insurance_expiry: string | null;
  last_maintenance: string | null;
  fuel_type: string | null;
  notes: string;
  gear: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ChooseVehicleModalProps {
  journeyId: string;
  existingMasterVehicleIds: string[];
  onClose: () => void;
  onVehicleSelected: () => void;
}

export function ChooseVehicleModal({ journeyId, existingMasterVehicleIds, onClose, onVehicleSelected }: ChooseVehicleModalProps) {
  const [masterVehicles, setMasterVehicles] = useState<MasterVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchMasterVehicles();
  }, []);

  const fetchMasterVehicles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('master_vehicles')
        .select('id, vehicle_type, vehicle_type_custom, license_plate, model, color, passenger_capacity, status, has_ac, has_wifi, is_accessible, insurance_valid, insurance_expiry, last_maintenance, fuel_type, notes, gear, is_active')
        .eq('is_active', true)
        .order('vehicle_type', { ascending: true });

      if (error) throw error;
      setMasterVehicles(data || []);
    } catch (err) {
      console.error('Error fetching master vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleVehicleSelection = (vehicleId: string) => {
    const newSelected = new Set(selectedVehicleIds);
    if (newSelected.has(vehicleId)) {
      newSelected.delete(vehicleId);
    } else {
      newSelected.add(vehicleId);
    }
    setSelectedVehicleIds(newSelected);
  };

  const assignVehiclesToTrip = async () => {
    if (selectedVehicleIds.size === 0) return;

    try {
      setAssigning(true);

      const vehiclesToAssign = masterVehicles.filter(v => selectedVehicleIds.has(v.id));

      const tripVehicleRecords = vehiclesToAssign.map(vehicle => ({
        journey_id: journeyId,
        master_vehicle_id: vehicle.id,
        provider_id: null,
        driver_id: null,
        vehicle_type: vehicle.vehicle_type,
        vehicle_type_custom: vehicle.vehicle_type_custom,
        license_plate: vehicle.license_plate,
        model: vehicle.model,
        color: vehicle.color,
        passenger_capacity: vehicle.passenger_capacity,
        status: 'pending',
        has_ac: vehicle.has_ac,
        has_wifi: vehicle.has_wifi,
        is_accessible: vehicle.is_accessible,
        insurance_valid: vehicle.insurance_valid,
        insurance_expiry: vehicle.insurance_expiry,
        last_maintenance: vehicle.last_maintenance,
        fuel_type: vehicle.fuel_type,
        notes: vehicle.notes,
        gear: vehicle.gear || [],
      }));

      const { error } = await supabase
        .from('journey_vehicles')
        .insert(tripVehicleRecords);

      if (error) throw error;

      onVehicleSelected();
    } catch (err) {
      console.error('Error assigning vehicles:', err);
      alert('Failed to assign vehicles to journey');
    } finally {
      setAssigning(false);
    }
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

  const getVehicleTypeLabel = (type: VehicleType, custom: string | null) => {
    if (type === 'other' && custom) return custom;
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const filteredVehicles = masterVehicles.filter(vehicle => {
    const searchLower = searchTerm.toLowerCase();
    const alreadyAdded = existingMasterVehicleIds.includes(vehicle.id);

    if (alreadyAdded) return false;

    return (
      vehicle.vehicle_type.toLowerCase().includes(searchLower) ||
      vehicle.vehicle_type_custom?.toLowerCase().includes(searchLower) ||
      vehicle.license_plate?.toLowerCase().includes(searchLower) ||
      vehicle.model?.toLowerCase().includes(searchLower) ||
      vehicle.color?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-brand-brown">Choose Vehicle</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand-gray-4 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-brand-gray-1" />
            <input
              type="text"
              placeholder="Search vehicles by type, plate, model, or color..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-brand-gray-1">Loading vehicles...</p>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="w-12 h-12 text-brand-gray-2 mx-auto mb-3" />
              <p className="text-brand-gray-1 mb-2">
                {searchTerm ? 'No vehicles match your search' : 'No vehicles available'}
              </p>
              <p className="text-sm text-brand-gray-1">
                {searchTerm ? 'Try a different search term' : 'Add vehicles from the main form first'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredVehicles.map((vehicle) => {
                const isSelected = selectedVehicleIds.has(vehicle.id);

                return (
                  <button
                    key={vehicle.id}
                    onClick={() => toggleVehicleSelection(vehicle.id)}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-brand-gray-3 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-brand-gray-4 rounded-lg">
                          {getVehicleIcon(vehicle.vehicle_type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-brand-brown">
                              {getVehicleTypeLabel(vehicle.vehicle_type, vehicle.vehicle_type_custom)}
                              {vehicle.model && ` - ${vehicle.model}`}
                            </h3>
                            {isSelected && <CheckCircle className="w-5 h-5 text-blue-600" />}
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
                            {vehicle.color && (
                              <span className="text-xs">{vehicle.color}</span>
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
                            {vehicle.gear && vehicle.gear.length > 0 && (
                              <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                {vehicle.gear.length} gear item{vehicle.gear.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>

                          {vehicle.notes && (
                            <p className="text-xs text-brand-gray-1 mt-2">{vehicle.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-brand-gray-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-brand-gray-1">
              {selectedVehicleIds.size} vehicle{selectedVehicleIds.size !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-brand-gray-3 text-brand-brown rounded-lg hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={assignVehiclesToTrip}
                disabled={selectedVehicleIds.size === 0 || assigning}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {assigning ? 'Adding...' : `Add ${selectedVehicleIds.size || ''} Vehicle${selectedVehicleIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
