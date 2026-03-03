import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Upload, Image as ImageIcon, AlertCircle, FileText, Download, File, Trash2, ExternalLink, DollarSign, Search, Save, MapPin } from 'lucide-react';
import type { Accommodation } from '../../lib/database.types';
import { safeParseFloat } from '../../lib/numberValidation';
import { BookingFeeEditor } from './BookingFeeEditor';
import { useAuth } from '../../contexts/AuthContext';

interface AccommodationModalProps {
  dayId: string;
  accommodation?: Accommodation;
  onClose: () => void;
  onSave: () => void;
}

interface AccommodationImage {
  file_name: string;
  file_path: string;
  file_url: string;
  uploaded_at: string;
  uploaded_by: string;
}

interface AccommodationAttachment {
  id: string;
  accommodation_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string;
}

interface MasterHotel {
  id: string;
  name: string;
  location: string | null;
  city: string | null;
  contact_number: string | null;
  email: string | null;
  map_link: string | null;
  accommodation_type: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  room_types: string | null;
  amenities: string | null;
  notes: string | null;
  images?: AccommodationImage[];
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

export default function AccommodationModal({
  dayId,
  accommodation,
  onClose,
  onSave,
}: AccommodationModalProps) {
  const { userProfile } = useAuth();
  const [formData, setFormData] = useState({
    hotel_name: accommodation?.hotel_name || '',
    location_address: accommodation?.location_address || '',
    map_link: accommodation?.map_link || '',
    check_in_time: accommodation?.check_in_time || '',
    check_out_time: accommodation?.check_out_time || '',
    booking_status: accommodation?.booking_status || 'pending',
    payment_status: accommodation?.payment_status || 'pending',
    payment_type: accommodation?.payment_type || 'full',
    payment_amount: accommodation?.payment_amount || '',
    breakfast_included: accommodation?.breakfast_included || false,
    breakfast_location: accommodation?.breakfast_location || 'in_hotel',
    lunch_included: accommodation?.lunch_included || false,
    lunch_location: accommodation?.lunch_location || 'external',
    dinner_included: accommodation?.dinner_included || false,
    dinner_location: accommodation?.dinner_location || 'external',
    access_method: accommodation?.access_method || 'front_desk',
    confirmation_number: accommodation?.confirmation_number || '',
    guide_notes: accommodation?.guide_notes || '',
    accommodation_type: Array.isArray(accommodation?.accommodation_type)
      ? accommodation.accommodation_type
      : (accommodation?.accommodation_type ? [accommodation.accommodation_type as any] : ['guest']),
  });
  const [images, setImages] = useState<AccommodationImage[]>(
    accommodation?.images ? (Array.isArray(accommodation.images) ? accommodation.images : []) : []
  );
  const [pendingImageFiles, setPendingImageFiles] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<AccommodationAttachment[]>([]);
  const [pendingDocumentFiles, setPendingDocumentFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [tempAccommodationId, setTempAccommodationId] = useState(accommodation?.id || null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showFeeEditor, setShowFeeEditor] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageFolderInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const documentFolderInputRef = useRef<HTMLInputElement>(null);

  const [hotelSuggestions, setHotelSuggestions] = useState<MasterHotel[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saveToMaster, setSaveToMaster] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<MasterHotel | null>(null);
  const [searchingMaster, setSearchingMaster] = useState(false);

  const isManagerOrAdmin = userProfile?.role === 'manager' || userProfile?.role === 'admin';

  useEffect(() => {
    if (accommodation?.id) {
      loadAttachments(accommodation.id);
    }
  }, [accommodation?.id]);

  const searchMasterHotels = async (query: string) => {
    if (query.length < 2) {
      setHotelSuggestions([]);
      return;
    }

    try {
      setSearchingMaster(true);
      const { data: hotels, error } = await supabase
        .from('master_hotels')
        .select('*')
        .or(`name.ilike.%${query}%,location.ilike.%${query}%,city.ilike.%${query}%`)
        .eq('is_active', true)
        .limit(10);

      if (error) throw error;

      const formattedHotels: MasterHotel[] = (hotels || []).map((hotel) => ({
        id: hotel.id,
        name: hotel.name,
        location: hotel.location,
        city: hotel.city,
        contact_number: hotel.contact_number,
        email: hotel.email,
        map_link: hotel.map_link,
        accommodation_type: hotel.accommodation_type,
        check_in_time: hotel.check_in_time,
        check_out_time: hotel.check_out_time,
        room_types: hotel.room_types,
        amenities: hotel.amenities,
        notes: hotel.notes,
        images: hotel.images || [],
      }));

      setHotelSuggestions(formattedHotels);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error searching master hotels:', error);
      setHotelSuggestions([]);
    } finally {
      setSearchingMaster(false);
    }
  };

  const selectMasterHotel = (hotel: MasterHotel) => {
    setSelectedHotel(hotel);
    setFormData({
      ...formData,
      hotel_name: hotel.name,
      location_address: hotel.location || '',
      map_link: hotel.map_link || '',
      check_in_time: hotel.check_in_time || '',
      check_out_time: hotel.check_out_time || '',
      guide_notes: hotel.notes || formData.guide_notes,
    });
    setShowSuggestions(false);

    if (hotel.images && hotel.images.length > 0) {
      setImages(hotel.images);
    }
  };

  const saveToMasterDatabase = async () => {
    try {
      await supabase
        .from('master_hotels')
        .insert({
          name: formData.hotel_name,
          location: formData.location_address,
          map_link: formData.map_link,
          check_in_time: formData.check_in_time || null,
          check_out_time: formData.check_out_time || null,
          notes: formData.guide_notes,
          is_active: true,
          images: images,
        });
    } catch (error) {
      console.error('Error saving to master database:', error);
    }
  };

  const loadAttachments = async (accommodationId: string) => {
    try {
      const { data, error } = await supabase
        .from('accommodation_attachments')
        .select('*')
        .eq('accommodation_id', accommodationId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setAttachments(data as AccommodationAttachment[]);
      }
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    if (validFiles.length === 0) {
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
      return;
    }

    setPendingImageFiles([...pendingImageFiles, ...validFiles]);

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const removePendingImageFile = (index: number) => {
    setPendingImageFiles(pendingImageFiles.filter((_, i) => i !== index));
  };

  const deleteImage = async (image: AccommodationImage) => {
    if (!confirm(`Delete ${image.file_name}?`)) return;
    if (!tempAccommodationId) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('section-images')
        .remove([image.file_path]);

      if (storageError) console.error('Storage error:', storageError);

      const updatedImages = images.filter(img => img.file_path !== image.file_path);
      setImages(updatedImages);

      await supabase
        .from('accommodations')
        .update({ images: updatedImages })
        .eq('id', tempAccommodationId);
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    }
  };

  const uploadPendingImages = async (accommodationId: string) => {
    if (pendingImageFiles.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const uploadedImages: AccommodationImage[] = [];

    for (let i = 0; i < pendingImageFiles.length; i++) {
      const file = pendingImageFiles[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${i}.${fileExt}`;
      const filePath = `accommodations/${accommodationId}/${fileName}`;

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
        .from('accommodations')
        .update({ images: allImages })
        .eq('id', accommodationId);
      setImages(allImages);
    }
    setPendingImageFiles([]);
  };

  const handleDocumentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    if (validFiles.length === 0) {
      if (documentInputRef.current) {
        documentInputRef.current.value = '';
      }
      return;
    }

    setPendingDocumentFiles([...pendingDocumentFiles, ...validFiles]);

    if (documentInputRef.current) {
      documentInputRef.current.value = '';
    }
  };

  const removeDocumentFile = (index: number) => {
    setPendingDocumentFiles(pendingDocumentFiles.filter((_, i) => i !== index));
  };

  const uploadDocumentFiles = async (accommodationId: string) => {
    if (pendingDocumentFiles.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (const file of pendingDocumentFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `accommodations/${accommodationId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('accommodation-documents')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('accommodation-documents')
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from('accommodation_attachments')
          .insert({
            accommodation_id: accommodationId,
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

      await loadAttachments(accommodationId);
      setPendingDocumentFiles([]);
    } catch (error) {
      console.error('Error uploading documents:', error);
      alert('Failed to upload some documents');
    }
  };

  const deleteAttachment = async (attachment: AccommodationAttachment) => {
    if (!confirm(`Delete ${attachment.file_name}?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('accommodation-documents')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('accommodation_attachments')
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

    try {
      const data: any = {
        day_id: dayId,
        ...formData,
        check_in_time: formData.check_in_time || null,
        check_out_time: formData.check_out_time || null,
        breakfast_location: formData.breakfast_included ? formData.breakfast_location : null,
        lunch_location: formData.lunch_included ? formData.lunch_location : null,
        dinner_location: formData.dinner_included ? formData.dinner_location : null,
        payment_amount: formData.payment_amount ? safeParseFloat(formData.payment_amount.toString(), null) : null,
        images: images,
      };

      if (accommodation) {
        const { data: updatedAccommodation, error } = await supabase
          .from('accommodations')
          .update(data)
          .eq('id', accommodation.id)
          .select()
          .maybeSingle();

        if (error) throw error;

        if (!updatedAccommodation) {
          throw new Error('Accommodation not found or could not be updated');
        }

        await uploadPendingImages(accommodation.id);
        await uploadDocumentFiles(accommodation.id);
      } else {
        const { data: newAccommodation, error } = await supabase
          .from('accommodations')
          .insert(data)
          .select()
          .single();

        if (error) throw error;

        if (!newAccommodation) {
          throw new Error('Failed to create accommodation');
        }

        await uploadPendingImages(newAccommodation.id);
        await uploadDocumentFiles(newAccommodation.id);

        if (saveToMaster && isManagerOrAdmin && !selectedHotel) {
          await saveToMasterDatabase();
        }
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving accommodation:', error);
      const errorMessage = error?.message || error?.error_description || 'Unknown error occurred';
      alert(`Failed to save accommodation: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-slate-900">
            {accommodation ? 'Edit' : 'Add'} Accommodation
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Hotel Name
              </label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.hotel_name}
                    onChange={(e) => {
                      setFormData({ ...formData, hotel_name: e.target.value });
                      searchMasterHotels(e.target.value);
                    }}
                    onFocus={() => {
                      if (formData.hotel_name.length >= 2 && hotelSuggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    placeholder="Search or enter new hotel name"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searchingMaster && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>

                {showSuggestions && hotelSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {hotelSuggestions.map((hotel) => (
                      <button
                        key={hotel.id}
                        type="button"
                        onClick={() => selectMasterHotel(hotel)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-slate-200 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-slate-900">{hotel.name}</div>
                            {hotel.location && (
                              <div className="text-sm text-slate-600 mt-0.5">{hotel.location}</div>
                            )}
                            {hotel.city && (
                              <div className="text-xs text-slate-500 mt-0.5">{hotel.city}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedHotel && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <MapPin className="w-4 h-4" />
                      <span>Loaded from database: {selectedHotel.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHotel(null);
                          setFormData({ ...formData, hotel_name: '' });
                        }}
                        className="ml-auto text-green-600 hover:text-green-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {!accommodation && isManagerOrAdmin && !selectedHotel && formData.hotel_name && (
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
                      Save this hotel to the master database for future use
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Location Address
              </label>
              <input
                type="text"
                value={formData.location_address}
                onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
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
                Check-in Time
              </label>
              <input
                type="time"
                value={formData.check_in_time}
                onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Check-out Time
              </label>
              <input
                type="time"
                value={formData.check_out_time}
                onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Booking Status
              </label>
              <select
                value={formData.booking_status}
                onChange={(e) =>
                  setFormData({ ...formData, booking_status: e.target.value as any })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Accommodation Type
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.accommodation_type.includes('guest')}
                    onChange={(e) => {
                      const newTypes = e.target.checked
                        ? [...formData.accommodation_type, 'guest']
                        : formData.accommodation_type.filter(t => t !== 'guest');
                      setFormData({ ...formData, accommodation_type: newTypes.length > 0 ? newTypes : ['guest'] });
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Guest</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.accommodation_type.includes('staff')}
                    onChange={(e) => {
                      const newTypes = e.target.checked
                        ? [...formData.accommodation_type, 'staff']
                        : formData.accommodation_type.filter(t => t !== 'staff');
                      setFormData({ ...formData, accommodation_type: newTypes.length > 0 ? newTypes : ['guest'] });
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Staff</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Access Method
              </label>
              <select
                value={formData.access_method}
                onChange={(e) =>
                  setFormData({ ...formData, access_method: e.target.value as any })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pdf_voucher">PDF Voucher</option>
                <option value="barcode">Barcode</option>
                <option value="eticket">E-Ticket</option>
                <option value="front_desk">Front Desk</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Meal Arrangements</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.breakfast_included}
                  onChange={(e) =>
                    setFormData({ ...formData, breakfast_included: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">Breakfast Included</span>
              </label>

              {formData.breakfast_included && (
                <div className="ml-7">
                  <select
                    value={formData.breakfast_location}
                    onChange={(e) =>
                      setFormData({ ...formData, breakfast_location: e.target.value as any })
                    }
                    className="px-3 py-1 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="in_hotel">In Hotel</option>
                    <option value="external">External</option>
                  </select>
                </div>
              )}

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.lunch_included}
                  onChange={(e) =>
                    setFormData({ ...formData, lunch_included: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">Lunch Included</span>
              </label>

              {formData.lunch_included && (
                <div className="ml-7">
                  <select
                    value={formData.lunch_location}
                    onChange={(e) =>
                      setFormData({ ...formData, lunch_location: e.target.value as any })
                    }
                    className="px-3 py-1 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="in_hotel">In Hotel</option>
                    <option value="external">External</option>
                  </select>
                </div>
              )}

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.dinner_included}
                  onChange={(e) =>
                    setFormData({ ...formData, dinner_included: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">Dinner Included</span>
              </label>

              {formData.dinner_included && (
                <div className="ml-7">
                  <select
                    value={formData.dinner_location}
                    onChange={(e) =>
                      setFormData({ ...formData, dinner_location: e.target.value as any })
                    }
                    className="px-3 py-1 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="in_hotel">In Hotel</option>
                    <option value="external">External</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment Details (Admin Only)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Status
                </label>
                <select
                  value={formData.payment_status}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_status: e.target.value as any })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Type
                </label>
                <select
                  value={formData.payment_type}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_type: e.target.value as any })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="full">Full Payment</option>
                  <option value="half_deposit">Half Deposit</option>
                  <option value="custom_installment">Custom Installment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.payment_amount}
                  onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirmation Number
            </label>
            <input
              type="text"
              value={formData.confirmation_number}
              onChange={(e) => setFormData({ ...formData, confirmation_number: e.target.value })}
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
                Add photos for this accommodation. The first image will be displayed on the card.
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
                        className="relative group rounded-lg overflow-hidden border-2 border-green-300 bg-slate-100"
                      >
                        <div className="aspect-square flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-slate-400" />
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
                Upload vouchers, confirmations, or other documents. Click the file name to view/download.
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
              {tempAccommodationId && (
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
                {loading ? 'Saving...' : accommodation ? 'Update' : 'Add'} Accommodation
              </button>
            </div>
          </div>
        </form>

        {showFeeEditor && tempAccommodationId && (
          <BookingFeeEditor
            itemId={tempAccommodationId}
            itemType="accommodation"
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
