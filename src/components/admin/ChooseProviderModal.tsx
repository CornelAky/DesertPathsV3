import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  X,
  Building2,
  CheckCircle,
  Search,
  User,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';

interface MasterProvider {
  id: string;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ChooseProviderModalProps {
  journeyId: string;
  existingMasterProviderIds: string[];
  onClose: () => void;
  onProviderSelected: () => void;
}

export function ChooseProviderModal({ journeyId, existingMasterProviderIds, onClose, onProviderSelected }: ChooseProviderModalProps) {
  const [masterProviders, setMasterProviders] = useState<MasterProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProviderIds, setSelectedProviderIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchMasterProviders();
  }, []);

  const fetchMasterProviders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('master_transportation_providers')
        .select('id, company_name, contact_person, phone, email, is_active')
        .eq('is_active', true)
        .order('company_name', { ascending: true });

      if (error) throw error;
      setMasterProviders(data || []);
    } catch (err) {
      console.error('Error fetching master providers:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleProviderSelection = (providerId: string) => {
    const newSelected = new Set(selectedProviderIds);
    if (newSelected.has(providerId)) {
      newSelected.delete(providerId);
    } else {
      newSelected.add(providerId);
    }
    setSelectedProviderIds(newSelected);
  };

  const assignProvidersToTrip = async () => {
    if (selectedProviderIds.size === 0) return;

    try {
      setAssigning(true);

      const providersToAssign = masterProviders.filter(p => selectedProviderIds.has(p.id));

      const tripProviderRecords = providersToAssign.map(provider => ({
        journey_id: journeyId,
        master_provider_id: provider.id,
        company_name: provider.company_name,
        contact_person: provider.contact_person,
        phone: provider.phone,
        email: provider.email,
        address: provider.address,
        notes: provider.notes,
      }));

      const { error } = await supabase
        .from('journey_transportation_providers')
        .insert(tripProviderRecords);

      if (error) throw error;

      onProviderSelected();
    } catch (err) {
      console.error('Error assigning providers:', err);
      alert('Failed to assign providers to journey');
    } finally {
      setAssigning(false);
    }
  };

  const filteredProviders = masterProviders.filter(provider => {
    const searchLower = searchTerm.toLowerCase();
    const alreadyAdded = existingMasterProviderIds.includes(provider.id);

    if (alreadyAdded) return false;

    return (
      provider.company_name.toLowerCase().includes(searchLower) ||
      provider.contact_person?.toLowerCase().includes(searchLower) ||
      provider.phone?.toLowerCase().includes(searchLower) ||
      provider.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-brand-brown">Choose Provider</h2>
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
              placeholder="Search providers by name, contact, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-brand-gray-3 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-brand-gray-1">Loading providers...</p>
            </div>
          ) : filteredProviders.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-brand-gray-2 mx-auto mb-3" />
              <p className="text-brand-gray-1 mb-2">
                {searchTerm ? 'No providers match your search' : 'No providers available'}
              </p>
              <p className="text-sm text-brand-gray-1">
                {searchTerm ? 'Try a different search term' : 'Add providers from the main form first'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredProviders.map((provider) => {
                const isSelected = selectedProviderIds.has(provider.id);

                return (
                  <button
                    key={provider.id}
                    onClick={() => toggleProviderSelection(provider.id)}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-brand-gray-3 hover:border-purple-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-5 h-5 text-purple-600" />
                          <h3 className="font-semibold text-brand-brown">{provider.company_name}</h3>
                          {isSelected && <CheckCircle className="w-5 h-5 text-purple-600" />}
                        </div>

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
              {selectedProviderIds.size} provider{selectedProviderIds.size !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-brand-gray-3 text-brand-brown rounded-lg hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={assignProvidersToTrip}
                disabled={selectedProviderIds.size === 0 || assigning}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {assigning ? 'Adding...' : `Add ${selectedProviderIds.size || ''} Provider${selectedProviderIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
