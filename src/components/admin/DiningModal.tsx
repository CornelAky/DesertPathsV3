import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Upload, Image as ImageIcon, AlertCircle, FileText, Download, File, Trash2, ExternalLink, DollarSign, Search, Save, MapPin } from 'lucide-react';
import type { Dining } from '../../lib/database.types';
import { safeParseFloat, safeParseInt } from '../../lib/numberValidation';
import { BookingFeeEditor } from './BookingFeeEditor';
import { useAuth } from '../../contexts/AuthContext';

interface DiningImage {
  file_name: string;
  file_path: string;
  file_url: string;
  uploaded_at: string;
  uploaded_by: string;
}

interface DiningAttachment {
  id: string;
  dining_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string;
}

interface MasterRestaurant {
  id: string;
  name: string;
  location: string | null;
  city: string | null;
  contact_number: string | null;
  cuisine_type: string | null;
  map_link: string | null;
  meal_types: string[] | null;
  average_cost_per_person: number | null;
  currency: string | null;
  capacity: number | null;
  notes: string | null;
  images?: DiningImage[];
}

interface DiningModalProps {
  dayId: string;
  dining?: Dining;
  onClose: () => void;
  onSave: () => void;
}

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
];

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function DiningModal({ dayId, dining, onClose, onSave }: DiningModalProps) {
  const { userProfile } = useAuth();
  const [formData, setFormData] = useState({
    meal_type: dining?.meal_type || 'lunch',
    restaurant_name: dining?.restaurant_name || '',
    cuisine_type: dining?.cuisine_type || '',
    location_address: dining?.location_address || '',
    location_type: dining?.location_type || 'external',
    map_link: dining?.map_link || '',
    reservation_time: dining?.reservation_time || '',
    confirmation_status: dining?.confirmation_status || 'not_booked',
    paid_by: dining?.paid_by || 'desert_paths',
    payment_status: dining?.payment_status || 'pending',
    payment_amount: dining?.payment_amount || '',
    dietary_restrictions: dining?.dietary_restrictions || '',
    guide_notes: dining?.guide_notes || '',
    display_order: dining?.display_order || 0,
  });
  const [images, setImages] = useState<any[]>(
    dining?.images ? (Array.isArray(dining.images) ? dining.images : []) : []
  );
  const [pendingImageFiles, setPendingImageFiles] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<DiningAttachment[]>([]);
  const [pendingDocumentFiles, setPendingDocumentFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [tempDiningId, setTempDiningId] = useState(dining?.id || null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFeeEditor, setShowFeeEditor] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageFolderInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const documentFolderInputRef = useRef<HTMLInputElement>(null);

  const [restaurantSuggestions, setRestaurantSuggestions] = useState<MasterRestaurant[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saveToMaster, setSaveToMaster] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<MasterRestaurant | null>(null);
  const [searchingMaster, setSearchingMaster] = useState(false);

  const isManagerOrAdmin = userProfile?.role === 'manager' || userProfile?.role === 'admin';

  useEffect(() => {
    if (dining?.id) {
      loadAttachments(dining.id);
    }
  }, [dining?.id]);

  const searchMasterRestaurants = async (query: string) => {
    if (query.length < 2) {
      setRestaurantSuggestions([]);
      return;
    }

    try {
      setSearchingMaster(true);
      const { data: restaurants, error } = await supabase
        .from('master_restaurants')
        .select('*')
        .or(`name.ilike.%${query}%,location.ilike.%${query}%,city.ilike.%${query}%`)
        .eq('is_active', true)
        .limit(10);

      if (error) throw error;

      const formattedRestaurants: MasterRestaurant[] = (restaurants || []).map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        location: restaurant.location,
        city: restaurant.city,
        contact_number: restaurant.contact_number,
        cuisine_type: restaurant.cuisine_type,
        map_link: restaurant.map_link,
        meal_types: restaurant.meal_types,
        average_cost_per_person: restaurant.average_cost_per_person,
        currency: restaurant.currency,
        capacity: restaurant.capacity,
        notes: restaurant.notes,
        images: restaurant.images || [],
      }));

      setRestaurantSuggestions(formattedRestaurants);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error searching master restaurants:', error);
      setRestaurantSuggestions([]);
    } finally {
      setSearchingMaster(false);
    }
  };

  const selectMasterRestaurant = (restaurant: MasterRestaurant) => {
    setSelectedRestaurant(restaurant);
    setFormData({
      ...formData,
      restaurant_name: restaurant.name,
      cuisine_type: restaurant.cuisine_type || '',
      location_address: restaurant.location || '',
      map_link: restaurant.map_link || '',
      guide_notes: restaurant.notes || formData.guide_notes,
    });
    setShowSuggestions(false);

    if (restaurant.images && restaurant.images.length > 0) {
      setImages(restaurant.images);
    }
  };

  const saveToMasterDatabase = async () => {
    try {
      await supabase
        .from('master_restaurants')
        .insert({
          name: formData.restaurant_name,
          location: formData.location_address,
          cuisine_type: formData.cuisine_type,
          map_link: formData.map_link,
          notes: formData.guide_notes,
          is_active: true,
          images: images,
        });
    } catch (error) {
      console.error('Error saving to master database:', error);
    }
  };

  const loadAttachments = async (diningId: string) => {
    try {
      const { data, error } = await supabase
        .from('dining_attachments')
        .select('*')
        .eq('dining_id', diningId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setAttachments(data as DiningAttachment[]);
      }
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setFileError(null);
    const validFiles: File[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setFileError(`${file.name}: Invalid file type. Only JPG and PNG images are allowed.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        setFileError(`${file.name}: File exceeds 10MB limit`);
        continue;
      }

      validFiles.push(file);
    }

    setPendingImageFiles([...pendingImageFiles, ...validFiles]);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const removePendingImageFile = (index: number) => {
    setPendingImageFiles(pendingImageFiles.filter((_, i) => i !== index));
  };

  const deleteImage = async (image: any) => {
    if (!confirm(`Delete ${image.file_name}?`)) return;
    if (!tempDiningId) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('section-images')
        .remove([image.file_path]);

      if (storageError) console.error('Storage error:', storageError);

      const updatedImages = images.filter(img => img.file_path !== image.file_path);
      setImages(updatedImages);

      await supabase
        .from('dining')
        .update({ images: updatedImages })
        .eq('id', tempDiningId);
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    }
  };

  const uploadPendingImages = async (diningId: string) => {
    if (pendingImageFiles.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const uploadedImages: any[] = [];

    for (let i = 0; i < pendingImageFiles.length; i++) {
      const file = pendingImageFiles[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${i}.${fileExt}`;
      const filePath = `dining/${diningId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('section-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('section-images')
        .getPublicUrl(filePath);

      uploadedImages.push({
        file_name: file.name,
        file_path: filePath,
        file_url: urlData.publicUrl,
        uploaded_at: new Date().toISOString(),
        uploaded_by: user.id,
      });
    }

    if (uploadedImages.length > 0) {
      const allImages = [...images, ...uploadedImages];
      await supabase
        .from('dining')
        .update({ images: allImages })
        .eq('id', diningId);
      setImages(allImages);
    }
    setPendingImageFiles([]);
  };

  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
        alert(`${file.name} has an unsupported file type. Only PDF, Word, and Excel files are allowed.`);
        return false;
      }
      return true;
    });

    setPendingDocumentFiles([...pendingDocumentFiles, ...validFiles]);
    if (documentInputRef.current) {
      documentInputRef.current.value = '';
    }
  };

  const removeDocumentFile = (index: number) => {
    setPendingDocumentFiles(pendingDocumentFiles.filter((_, i) => i !== index));
  };

  const uploadDocumentFiles = async (diningId: string) => {
    if (pendingDocumentFiles.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (const file of pendingDocumentFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `dining/${diningId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('dining-documents')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('dining-documents')
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from('dining_attachments')
          .insert({
            dining_id: diningId,
            file_name: file.name,
            file_path: filePath,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: user.id,
          });

        if (dbError) {
          console.error('Database error:', dbError);
        }
      }

      await loadAttachments(diningId);
      setPendingDocumentFiles([]);
    } catch (error) {
      console.error('Error uploading documents:', error);
      alert('Failed to upload some documents');
    }
  };

  const deleteAttachment = async (attachment: DiningAttachment) => {
    if (!confirm(`Delete ${attachment.file_name}?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('dining-documents')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('dining_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      setAttachments(attachments.filter(a => a.id !== attachment.id));
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Failed to delete attachment');
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <ImageIcon className="w-5 h-5 text-blue-600" />;
    } else if (ext === 'pdf') {
      return <FileText className="w-5 h-5 text-red-600" />;
    } else {
      return <File className="w-5 h-5 text-slate-600" />;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = {
        day_id: dayId,
        ...formData,
        reservation_time: formData.reservation_time || null,
        payment_amount: formData.payment_amount
          ? safeParseFloat(formData.payment_amount.toString(), null)
          : null,
        images: images,
      };

      if (dining) {
        const { data: updatedDining, error } = await supabase
          .from('dining')
          .update(data)
          .eq('id', dining.id)
          .select()
          .maybeSingle();

        if (error) throw error;

        if (!updatedDining) {
          throw new Error('Dining reservation not found or could not be updated');
        }

        await uploadPendingImages(dining.id);
        await uploadDocumentFiles(dining.id);
      } else {
        const { data: newDining, error } = await supabase
          .from('dining')
          .insert(data)
          .select()
          .single();

        if (error) throw error;

        if (!newDining) {
          throw new Error('Failed to create dining reservation');
        }

        await uploadPendingImages(newDining.id);
        await uploadDocumentFiles(newDining.id);

        if (saveToMaster && isManagerOrAdmin && !selectedRestaurant) {
          await saveToMasterDatabase();
        }
      }

      onSave();
    } catch (error) {
      console.error('Error saving dining:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to save dining reservation: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-slate-900">
            {dining ? 'Edit' : 'Add'} Dining Reservation
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2 mb-4">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="font-medium">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Meal Type
              </label>
              <select
                value={formData.meal_type}
                onChange={(e) => setFormData({ ...formData, meal_type: e.target.value as 'breakfast' | 'lunch' | 'dinner' | 'snack' })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Location Type
              </label>
              <select
                value={formData.location_type}
                onChange={(e) =>
                  setFormData({ ...formData, location_type: e.target.value as 'hotel' | 'external' })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="hotel">Hotel</option>
                <option value="external">External Restaurant</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Restaurant Name
              </label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.restaurant_name}
                    onChange={(e) => {
                      setFormData({ ...formData, restaurant_name: e.target.value });
                      searchMasterRestaurants(e.target.value);
                    }}
                    onFocus={() => {
                      if (formData.restaurant_name.length >= 2 && restaurantSuggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    placeholder="Search or enter new restaurant name"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searchingMaster && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>

                {showSuggestions && restaurantSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {restaurantSuggestions.map((restaurant) => (
                      <button
                        key={restaurant.id}
                        type="button"
                        onClick={() => selectMasterRestaurant(restaurant)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-slate-200 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-slate-900">{restaurant.name}</div>
                            {restaurant.cuisine_type && (
                              <div className="text-sm text-slate-600 mt-0.5">{restaurant.cuisine_type}</div>
                            )}
                            {restaurant.location && (
                              <div className="text-xs text-slate-500 mt-0.5">{restaurant.location}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedRestaurant && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <MapPin className="w-4 h-4" />
                      <span>Loaded from database: {selectedRestaurant.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRestaurant(null);
                          setFormData({ ...formData, restaurant_name: '' });
                        }}
                        className="ml-auto text-green-600 hover:text-green-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {!dining && isManagerOrAdmin && !selectedRestaurant && formData.restaurant_name && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="saveToMaster"
                      checked={saveToMaster}
                      onChange={(e) => setSaveToMaster(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="saveToMaster" className="text-sm text-slate-700 flex items-center gap-1">
                      <Save className="w-4 h-4" />
                      Save this restaurant to the master database for future use
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cuisine Type
              </label>
              <input
                type="text"
                value={formData.cuisine_type}
                onChange={(e) => setFormData({ ...formData, cuisine_type: e.target.value })}
                placeholder="e.g., French, Italian, Asian"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Reservation Time
              </label>
              <input
                type="time"
                value={formData.reservation_time}
                onChange={(e) => setFormData({ ...formData, reservation_time: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Location Address
              </label>
              <input
                type="text"
                value={formData.location_address}
                onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                placeholder="Full address"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Map Link (Google Maps, etc.)
              </label>
              <input
                type="url"
                value={formData.map_link}
                onChange={(e) => setFormData({ ...formData, map_link: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Confirmation Status
              </label>
              <select
                value={formData.confirmation_status}
                onChange={(e) =>
                  setFormData({ ...formData, confirmation_status: e.target.value as 'confirmed' | 'not_booked' | 'pending' | 'n/a' })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="not_booked">Not Booked</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="n/a">N/A</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Display Order
              </label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({ ...formData, display_order: safeParseInt(e.target.value, 0) || 0 })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment Details (Admin Only)</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Paid By
                  </label>
                  <select
                    value={formData.paid_by}
                    onChange={(e) => setFormData({ ...formData, paid_by: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="desert_paths">Desert Paths</option>
                    <option value="client">Client</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Payment Status
                  </label>
                  <select
                    value={formData.payment_status}
                    onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="pre_paid">Pre-paid</option>
                    <option value="paid_on_site">Paid on Site</option>
                    <option value="n_a">N/A</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Amount (Internal)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.payment_amount}
                  onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Dietary Restrictions
            </label>
            <input
              type="text"
              value={formData.dietary_restrictions}
              onChange={(e) => setFormData({ ...formData, dietary_restrictions: e.target.value })}
              placeholder="e.g., Vegetarian, No nuts, Gluten-free"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Guide Notes
            </label>
            <textarea
              rows={3}
              value={formData.guide_notes}
              onChange={(e) => setFormData({ ...formData, guide_notes: e.target.value })}
              placeholder="Special instructions for the guide..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="border-t border-slate-200 pt-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Images
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Add photos for this restaurant. The first image will be displayed on the card.
              </p>
            </div>

            <div className="space-y-4">
              {images.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Current Images ({images.length})
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {images.map((image, index) => (
                      <div
                        key={index}
                        className="relative group rounded-lg overflow-hidden border-2 border-slate-200"
                      >
                        <img
                          src={image.file_url}
                          alt={image.file_name}
                          className="w-full h-32 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <a
                            href={image.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                            title="View full size"
                          >
                            <ExternalLink className="w-4 h-4 text-gray-700" />
                          </a>
                          <button
                            type="button"
                            onClick={() => deleteImage(image)}
                            className="p-2 bg-white rounded-lg hover:bg-red-100 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                        {index === 0 && (
                          <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            Card Image
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <input
                  ref={imageInputRef}
                  type="file"
                  multiple
                  accept={ALLOWED_IMAGE_TYPES.join(',') + ',.heic,.heif'}
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <input
                  ref={imageFolderInputRef}
                  type="file"
                  multiple
                  accept={ALLOWED_IMAGE_TYPES.join(',') + ',.heic,.heif'}
                  onChange={handleImageSelect}
                  className="hidden"
                  {...({ webkitdirectory: '', directory: '' } as any)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="px-4 py-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm font-medium text-slate-700 flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Add Files
                  </button>
                  <button
                    type="button"
                    onClick={() => imageFolderInputRef.current?.click()}
                    className="px-4 py-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm font-medium text-slate-700 flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Add Folder
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  JPG, PNG, GIF, HEIC only (max 10MB each)
                </p>
              </div>

              {fileError && (
                <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}

              {pendingImageFiles.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Images Ready to Upload ({pendingImageFiles.length})
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {pendingImageFiles.map((file, index) => (
                      <div
                        key={index}
                        className="relative group rounded-lg overflow-hidden border-2 border-green-300 bg-green-50"
                      >
                        <div className="aspect-square flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-green-600" />
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => removePendingImageFile(index)}
                            className="p-2 bg-white rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate">
                          {file.name}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    These images will be uploaded when you save
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Upload menus, confirmations, or other documents. Click the file name to view/download.
              </p>
            </div>

            <div className="space-y-4">
              {attachments.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Current Documents ({attachments.length})
                  </label>
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {getFileIcon(attachment.file_name)}
                          <div className="flex-1 min-w-0">
                            <a
                              href={attachment.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline truncate block"
                            >
                              {attachment.file_name}
                            </a>
                            <p className="text-xs text-slate-500">
                              {attachment.file_size ? `${(attachment.file_size / 1024 / 1024).toFixed(2)} MB` : 'Size unknown'} • {new Date(attachment.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={attachment.file_url}
                            download
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => deleteAttachment(attachment)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <input
                  ref={documentInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleDocumentSelect}
                  className="hidden"
                />
                <input
                  ref={documentFolderInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleDocumentSelect}
                  className="hidden"
                  {...({ webkitdirectory: '', directory: '' } as any)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => documentInputRef.current?.click()}
                    className="px-4 py-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm font-medium text-slate-700 flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Add Files
                  </button>
                  <button
                    type="button"
                    onClick={() => documentFolderInputRef.current?.click()}
                    className="px-4 py-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm font-medium text-slate-700 flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Add Folder
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  PDF, Word, Excel (max 10MB each)
                </p>
              </div>

              {pendingDocumentFiles.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Documents Ready to Upload ({pendingDocumentFiles.length})
                  </label>
                  <div className="space-y-2">
                    {pendingDocumentFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {getFileIcon(file.name)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                            <p className="text-xs text-slate-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocumentFile(index)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    These documents will be uploaded when you save
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center gap-3 pt-4 border-t border-slate-200">
            <div>
              {tempDiningId && (
                <button
                  type="button"
                  onClick={() => setShowFeeEditor(true)}
                  className="px-4 py-2 bg-brand-cyan bg-opacity-20 text-brand-brown hover:bg-opacity-30 rounded-lg transition-colors flex items-center gap-2"
                  disabled={loading}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Manage Fees</span>
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : dining ? 'Update' : 'Add'} Dining
              </button>
            </div>
          </div>
        </form>

        {showFeeEditor && tempDiningId && (
          <BookingFeeEditor
            itemId={tempDiningId}
            itemType="dining"
            onClose={() => setShowFeeEditor(false)}
            onSaved={() => {
              setShowFeeEditor(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
