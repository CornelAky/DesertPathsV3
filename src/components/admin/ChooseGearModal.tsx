import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  X,
  Package,
  CheckCircle,
  Search,
} from 'lucide-react';

interface MasterGear {
  id: string;
  item_name: string;
  quantity: number;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ChooseGearModalProps {
  journeyId: string;
  existingMasterGearIds: string[];
  onClose: () => void;
  onGearSelected: () => void;
}

export function ChooseGearModal({ journeyId, existingMasterGearIds, onClose, onGearSelected }: ChooseGearModalProps) {
  const [masterGear, setMasterGear] = useState<MasterGear[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGearIds, setSelectedGearIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchMasterGear();
  }, []);

  const fetchMasterGear = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('master_gear')
        .select('id, item_name, quantity, notes, is_active')
        .eq('is_active', true)
        .order('item_name', { ascending: true });

      if (error) throw error;
      setMasterGear(data || []);
    } catch (err) {
      console.error('Error fetching master gear:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleGearSelection = (gearId: string) => {
    const newSelected = new Set(selectedGearIds);
    if (newSelected.has(gearId)) {
      newSelected.delete(gearId);
    } else {
      newSelected.add(gearId);
    }
    setSelectedGearIds(newSelected);
  };

  const assignGearToTrip = async () => {
    if (selectedGearIds.size === 0) return;

    try {
      setAssigning(true);

      const gearToAssign = masterGear.filter(g => selectedGearIds.has(g.id));

      const tripGearRecords = gearToAssign.map(gear => ({
        journey_id: journeyId,
        master_gear_id: gear.id,
        item_name: gear.item_name,
        quantity: gear.quantity,
        notes: gear.notes,
      }));

      const { error } = await supabase
        .from('journey_gear')
        .insert(tripGearRecords);

      if (error) throw error;

      onGearSelected();
    } catch (err) {
      console.error('Error assigning gear:', err);
      alert('Failed to assign gear to journey');
    } finally {
      setAssigning(false);
    }
  };

  const filteredGear = masterGear.filter(gear => {
    const searchLower = searchTerm.toLowerCase();
    const alreadyAdded = existingMasterGearIds.includes(gear.id);

    if (alreadyAdded) return false;

    return (
      gear.item_name.toLowerCase().includes(searchLower) ||
      gear.notes.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-teal-600" />
            <h2 className="text-2xl font-bold text-brand-brown">Choose Gear</h2>
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
              placeholder="Search gear by name or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-brand-gray-1">Loading gear...</p>
            </div>
          ) : filteredGear.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-brand-gray-2 mx-auto mb-3" />
              <p className="text-brand-gray-1 mb-2">
                {searchTerm ? 'No gear matches your search' : 'No gear available'}
              </p>
              <p className="text-sm text-brand-gray-1">
                {searchTerm ? 'Try a different search term' : 'Add gear from the main form first'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredGear.map((gear) => {
                const isSelected = selectedGearIds.has(gear.id);

                return (
                  <button
                    key={gear.id}
                    onClick={() => toggleGearSelection(gear.id)}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-brand-gray-3 hover:border-teal-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-teal-50 rounded-lg">
                          <Package className="w-5 h-5 text-teal-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-brand-brown">{gear.item_name}</h3>
                            {isSelected && <CheckCircle className="w-5 h-5 text-teal-600" />}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-brand-gray-1">
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Quantity:</span> {gear.quantity}
                            </span>
                          </div>

                          {gear.notes && (
                            <p className="text-xs text-brand-gray-1 mt-2">{gear.notes}</p>
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
              {selectedGearIds.size} item{selectedGearIds.size !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-brand-gray-3 text-brand-brown rounded-lg hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={assignGearToTrip}
                disabled={selectedGearIds.size === 0 || assigning}
                className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {assigning ? 'Adding...' : `Add ${selectedGearIds.size || ''} Item${selectedGearIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
