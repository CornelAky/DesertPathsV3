import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Truck, Upload, Image as ImageIcon, FileText, Download, Trash2, ExternalLink, AlertCircle, Plus, File, DollarSign } from 'lucide-react';
import type { Transportation } from '../../lib/database.types';
import { BookingFeeEditor } from './BookingFeeEditor';

interface TransportationModalProps {
  dayId: string;
  transportation?: Transportation;
  onClose: () => void;
  onSave: () => void;
}

interface TransportationAttachment {
  id: string;
  transportation_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string;
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

const VEHICLE_TYPES = [
  'SUV',
  'Sedan',
  'Large Bus - Coach',
  'Medium Bus',
  'Minivan',
  'Train',
  'Boat',
  'Plane'
];

export default function TransportationModal({
  dayId,
  transportation,
  onClose,
  onSave,
}: TransportationModalProps) {
  const [formData, setFormData] = useState({
    car_type: transportation?.car_type || '',
    contact_details: transportation?.contact_details || '',
    pickup_time: transportation?.pickup_time || '',
    pickup_location: transportation?.pickup_location || '',
    pickup_location_link: transportation?.pickup_location_link || '',
    dropoff_time: transportation?.dropoff_time || '',
    dropoff_location: transportation?.dropoff_location || '',
    dropoff_location_link: transportation?.dropoff_location_link || '',
    notes: transportation?.notes || '',
  });
  const [images, setImages] = useState<any[]>(
    transportation?.images ? (Array.isArray(transportation.images) ? transportation.images : []) : []
  );
  const [pendingImageFiles, setPendingImageFiles] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<TransportationAttachment[]>([]);
  const [pendingDocumentFiles, setPendingDocumentFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [tempTransportationId, setTempTransportationId] = useState(transportation?.id || null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFeeEditor, setShowFeeEditor] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageFolderInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const documentFolderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (transportation?.id) {
      loadAttachments(transportation.id);
    }
  }, [transportation?.id]);

  const loadAttachments = async (transportationId: string) => {
    try {
      const { data, error } = await supabase
        .from('transportation_attachments')
        .select('*')
        .eq('transportation_id', transportationId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setAttachments(data as TransportationAttachment[]);
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
    if (!tempTransportationId) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('section-images')
        .remove([image.file_path]);

      if (storageError) console.error('Storage error:', storageError);

      const updatedImages = images.filter(img => img.file_path !== image.file_path);
      setImages(updatedImages);

      await supabase
        .from('transportation')
        .update({ images: updatedImages })
        .eq('id', tempTransportationId);
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    }
  };

  const uploadPendingImages = async (transportationId: string) => {
    if (pendingImageFiles.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const uploadedImages: any[] = [];

    for (let i = 0; i < pendingImageFiles.length; i++) {
      const file = pendingImageFiles[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${i}.${fileExt}`;
      const filePath = `transportation/${transportationId}/${fileName}`;

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
        .from('transportation')
        .update({ images: allImages })
        .eq('id', transportationId);
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

  const uploadDocumentFiles = async (transportationId: string) => {
    if (pendingDocumentFiles.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (const file of pendingDocumentFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `transportation/${transportationId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('transportation-documents')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('transportation-documents')
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from('transportation_attachments')
          .insert({
            transportation_id: transportationId,
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

      await loadAttachments(transportationId);
      setPendingDocumentFiles([]);
    } catch (error) {
      console.error('Error uploading documents:', error);
      alert('Failed to upload some documents');
    }
  };

  const deleteAttachment = async (attachment: TransportationAttachment) => {
    if (!confirm(`Delete ${attachment.file_name}?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('transportation-documents')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('transportation_attachments')
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
      const data: any = {
        day_id: dayId,
        car_type: formData.car_type,
        contact_details: formData.contact_details,
        pickup_time: formData.pickup_time || null,
        pickup_location: formData.pickup_location,
        pickup_location_link: formData.pickup_location_link,
        dropoff_time: formData.dropoff_time || null,
        dropoff_location: formData.dropoff_location,
        dropoff_location_link: formData.dropoff_location_link,
        notes: formData.notes,
        images: images,
      };

      let transportationId: string;

      if (transportation) {
        const { data: updatedTransportation, error: updateError } = await supabase
          .from('transportation')
          .update(data)
          .eq('id', transportation.id)
          .select()
          .single();

        if (updateError) throw updateError;

        if (!updatedTransportation) {
          throw new Error('Transportation not found or could not be updated');
        }

        transportationId = transportation.id;

        await uploadPendingImages(transportationId);
        await uploadDocumentFiles(transportationId);
      } else {
        const { data: newTransportation, error: insertError } = await supabase
          .from('transportation')
          .insert(data)
          .select()
          .single();

        if (insertError) throw insertError;

        if (!newTransportation) {
          throw new Error('Failed to create transportation');
        }

        transportationId = newTransportation.id;
        setTempTransportationId(transportationId);

        await uploadPendingImages(transportationId);
        await uploadDocumentFiles(transportationId);
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving transportation:', error);
      setError(error.message || 'Failed to save transportation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {transportation ? 'Edit Transportation' : 'Add Transportation'}
              </h2>
              <p className="text-sm text-gray-600">Driver and vehicle information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-600">{error}</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Vehicle Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vehicle Type
            </label>
            <select
              value={formData.car_type}
              onChange={(e) => setFormData({ ...formData, car_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Select vehicle type</option>
              {VEHICLE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Contact Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Details
            </label>
            <textarea
              value={formData.contact_details}
              onChange={(e) => setFormData({ ...formData, contact_details: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y"
              rows={3}
              placeholder="Driver name, phone number, email, or any other contact information"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pickup Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pickup Time
              </label>
              <input
                type="time"
                value={formData.pickup_time}
                onChange={(e) => setFormData({ ...formData, pickup_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Dropoff Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dropoff Time
              </label>
              <input
                type="time"
                value={formData.dropoff_time}
                onChange={(e) => setFormData({ ...formData, dropoff_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Pickup Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pickup Location
            </label>
            <input
              type="text"
              value={formData.pickup_location}
              onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="e.g., Hotel lobby, Airport Terminal 3"
            />
          </div>

          {/* Pickup Location Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              Pickup Location Link
              <ExternalLink className="w-4 h-4 text-gray-500" />
            </label>
            <input
              type="text"
              value={formData.pickup_location_link}
              onChange={(e) => setFormData({ ...formData, pickup_location_link: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Google Maps link"
            />
          </div>

          {/* Dropoff Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dropoff Location
            </label>
            <input
              type="text"
              value={formData.dropoff_location}
              onChange={(e) => setFormData({ ...formData, dropoff_location: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="e.g., Restaurant entrance, Train station"
            />
          </div>

          {/* Dropoff Location Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              Dropoff Location Link
              <ExternalLink className="w-4 h-4 text-gray-500" />
            </label>
            <input
              type="text"
              value={formData.dropoff_location_link}
              onChange={(e) => setFormData({ ...formData, dropoff_location_link: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Google Maps link"
            />
          </div>

          {/* Guide Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Guide Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y min-h-[100px]"
              placeholder="Enter notes about where and how this transportation will be used (e.g., 'Airport pickup at 9am', 'Transfer to hotel after lunch')"
            />
            <p className="text-xs text-gray-500 mt-1">
              Describe where and how this transportation will be used during the day
            </p>
          </div>

          {/* Images Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Images
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Add photos for this transportation. The first image will be displayed on the card.
              </p>
            </div>

            <div className="space-y-4">
              {images.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Images ({images.length})
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {images.map((image, index) => (
                      <div
                        key={index}
                        className="relative group rounded-lg overflow-hidden border-2 border-gray-200"
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
                    className="px-4 py-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors text-sm font-medium text-gray-700 flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Add Files
                  </button>
                  <button
                    type="button"
                    onClick={() => imageFolderInputRef.current?.click()}
                    className="px-4 py-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors text-sm font-medium text-gray-700 flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Add Folder
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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

          {/* Documents Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Upload contracts, permits, or other documents. Click the file name to view/download.
              </p>
            </div>

            <div className="space-y-4">
              {attachments.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                            <p className="text-xs text-gray-500">
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
                    className="px-4 py-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors text-sm font-medium text-gray-700 flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Add Files
                  </button>
                  <button
                    type="button"
                    onClick={() => documentFolderInputRef.current?.click()}
                    className="px-4 py-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors text-sm font-medium text-gray-700 flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Add Folder
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, Word, Excel (max 10MB each)
                </p>
              </div>

              {pendingDocumentFiles.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">
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

          {/* Action Buttons */}
          <div className="flex justify-between items-center gap-3 pt-4 border-t border-gray-200">
            <div>
              {tempTransportationId && (
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
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{transportation ? 'Update' : 'Add'} Transportation</span>
                )}
              </button>
            </div>
          </div>
        </form>

        {showFeeEditor && tempTransportationId && (
          <BookingFeeEditor
            itemId={tempTransportationId}
            itemType="transportation"
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
