import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Upload, Image as ImageIcon, AlertCircle, Plus, Trash2, FileText, Download, File, Search, DollarSign, Save, ExternalLink } from 'lucide-react';
import type { Activity } from '../../lib/database.types';
import { useAuth } from '../../contexts/AuthContext';
import { safeParseFloat, safeParseInt } from '../../lib/numberValidation';
import { BookingFeeEditor } from './BookingFeeEditor';

interface ActivityModalProps {
  dayId: string;
  activity?: Activity;
  defaultSection?: 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night';
  onClose: () => void;
  onSave: () => void;
}

interface ActivityImage {
  file_name: string;
  file_path: string;
  file_url: string;
  uploaded_at: string;
  uploaded_by: string;
}

interface ActivityAttachment {
  id: string;
  activity_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string;
}

interface MasterSite {
  id: string;
  name: string;
  category: string | null;
  location: string | null;
  city: string | null;
  contact_number: string | null;
  map_link: string | null;
  typical_duration_minutes: number | null;
  description: string | null;
  notes: string | null;
  images?: ActivityImage[];
  fees?: Array<{
    id: string;
    fee_name: string;
    applies_to: string;
    amount: number;
    currency: string;
    per_person: boolean;
  }>;
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

export default function ActivityModal({ dayId, activity, defaultSection = 'morning', onClose, onSave }: ActivityModalProps) {
  const { userProfile } = useAuth();

  const getDefaultTime = () => {
    if (activity?.activity_time) return activity.activity_time;
    switch (defaultSection) {
      case 'early_morning': return '06:00';
      case 'morning': return '09:00';
      case 'afternoon': return '14:00';
      case 'evening': return '18:00';
      case 'night': return '21:00';
      default: return '09:00';
    }
  };

  const getSectionFromTime = (time: string): 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night' => {
    if (!time) return 'morning';
    const [hours] = time.split(':').map(Number);
    if (hours < 7) return 'early_morning';
    if (hours < 12) return 'morning';
    if (hours < 18) return 'afternoon';
    if (hours < 21) return 'evening';
    return 'night';
  };

  const [formData, setFormData] = useState({
    activity_name: activity?.activity_name || '',
    location: activity?.location || '',
    map_link: activity?.map_link || '',
    activity_time: getDefaultTime(),
    duration_minutes: activity?.duration_minutes || '',
    booking_status: activity?.booking_status || 'pending',
    paid_by: activity?.paid_by || 'desert_paths',
    payment_status: activity?.payment_status || 'pending',
    access_method: activity?.access_method || 'pdf_ticket',
    guide_notes: activity?.guide_notes || '',
    display_order: activity?.display_order || 0,
  });
  const [activitySection, setActivitySection] = useState<'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night'>(
    activity?.activity_time ? getSectionFromTime(activity.activity_time) : defaultSection
  );
  const [manualSectionOverride, setManualSectionOverride] = useState(false);
  const [images, setImages] = useState<ActivityImage[]>(
    activity?.images ? (Array.isArray(activity.images) ? activity.images : []) : []
  );
  const [pendingImageFiles, setPendingImageFiles] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<ActivityAttachment[]>([]);
  const [pendingDocumentFiles, setPendingDocumentFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [tempActivityId, setTempActivityId] = useState(activity?.id || null);
  const [showFeeEditor, setShowFeeEditor] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageFolderInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const documentFolderInputRef = useRef<HTMLInputElement>(null);

  const [siteSuggestions, setSiteSuggestions] = useState<MasterSite[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saveToMaster, setSaveToMaster] = useState(false);
  const [selectedSite, setSelectedSite] = useState<MasterSite | null>(null);
  const [searchingMaster, setSearchingMaster] = useState(false);

  const isManagerOrAdmin = userProfile?.role === 'manager' || userProfile?.role === 'admin';

  useEffect(() => {
    if (activity?.id) {
      loadAttachments(activity.id);
    }
  }, [activity?.id]);

  const loadAttachments = async (activityId: string) => {
    try {
      const { data, error } = await supabase
        .from('activity_attachments')
        .select('*')
        .eq('activity_id', activityId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setAttachments(data as ActivityAttachment[]);
      }
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  };

  const searchMasterSites = async (query: string) => {
    if (query.length < 2) {
      setSiteSuggestions([]);
      return;
    }

    try {
      setSearchingMaster(true);
      const { data: sites, error } = await supabase
        .from('master_touristic_sites')
        .select('*, master_site_fees!master_site_fees_site_id_fkey(*)')
        .or(`name.ilike.%${query}%,location.ilike.%${query}%,city.ilike.%${query}%`)
        .eq('is_active', true)
        .limit(10);

      if (error) throw error;

      const formattedSites: MasterSite[] = (sites || []).map((site) => ({
        id: site.id,
        name: site.name,
        category: site.category,
        location: site.location,
        city: site.city,
        contact_number: site.contact_number,
        map_link: site.map_link,
        typical_duration_minutes: site.typical_duration_minutes,
        description: site.description,
        notes: site.notes,
        images: site.images || [],
        fees: (site.master_site_fees || [])
          .filter((f) => f.is_active)
          .map((f) => ({
            id: f.id,
            fee_name: f.fee_name,
            applies_to: f.applies_to,
            amount: safeParseFloat(f.amount, 0) || 0,
            currency: f.currency,
            per_person: f.per_person,
          })),
      }));

      setSiteSuggestions(formattedSites);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error searching master sites:', error);
      setSiteSuggestions([]);
    } finally {
      setSearchingMaster(false);
    }
  };

  const selectMasterSite = (site: MasterSite) => {
    setSelectedSite(site);
    setFormData({
      ...formData,
      activity_name: site.name,
      location: site.location || '',
      map_link: site.map_link || '',
      duration_minutes: site.typical_duration_minutes || formData.duration_minutes,
      guide_notes: site.notes || formData.guide_notes,
    });
    setShowSuggestions(false);

    if (site.images && site.images.length > 0) {
      setImages(site.images);
    }
  };

  const uploadDocumentFiles = async (activityId: string) => {
    if (pendingDocumentFiles.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (const file of pendingDocumentFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `activities/${activityId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('activity-documents')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('activity-documents')
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from('activity_attachments')
          .insert({
            activity_id: activityId,
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

      await loadAttachments(activityId);
      setPendingDocumentFiles([]);
    } catch (error) {
      console.error('Error uploading documents:', error);
      alert('Failed to upload some documents');
    }
  };

  const deleteAttachment = async (attachment: ActivityAttachment) => {
    if (!confirm(`Delete ${attachment.file_name}?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('activity-documents')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('activity_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      setAttachments(attachments.filter(a => a.id !== attachment.id));
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Failed to delete attachment');
    }
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

  const deleteImage = async (image: ActivityImage) => {
    if (!confirm(`Delete ${image.file_name}?`)) return;
    if (!tempActivityId) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('section-images')
        .remove([image.file_path]);

      if (storageError) console.error('Storage error:', storageError);

      const updatedImages = images.filter(img => img.file_path !== image.file_path);
      setImages(updatedImages);

      await supabase
        .from('activities')
        .update({ images: updatedImages })
        .eq('id', tempActivityId);
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    }
  };

  const uploadPendingImages = async (activityId: string) => {
    if (pendingImageFiles.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const uploadedImages: ActivityImage[] = [];

    for (let i = 0; i < pendingImageFiles.length; i++) {
      const file = pendingImageFiles[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${i}.${fileExt}`;
      const filePath = `activities/${activityId}/${fileName}`;

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
        .from('activities')
        .update({ images: allImages })
        .eq('id', activityId);
      setImages(allImages);
    }
    setPendingImageFiles([]);
  };


  const parseDuration = (value: string | number): number | null => {
    if (!value) return null;

    const numValue = typeof value === 'string' ? safeParseFloat(value, null) : value;
    if (isNaN(numValue)) return null;

    if (numValue >= 60) {
      const hours = Math.floor(numValue / 60);
      const minutes = numValue % 60;
      return hours * 60 + minutes;
    }

    return numValue;
  };

  const saveToMasterDatabase = async () => {
    try {
      const { data: site, error } = await supabase
        .from('master_touristic_sites')
        .insert({
          name: formData.activity_name,
          location: formData.location,
          map_link: formData.map_link,
          typical_duration_minutes: parseDuration(formData.duration_minutes),
          notes: formData.guide_notes,
          category: 'attraction',
          is_active: true,
          images: images,
        })
        .select()
        .single();

      if (error) throw error;
    } catch (error) {
      console.error('Error saving to master database:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let finalTime = formData.activity_time;
      if (manualSectionOverride && !formData.activity_time) {
        switch (activitySection) {
          case 'early_morning':
            finalTime = '05:00';
            break;
          case 'morning':
            finalTime = '09:00';
            break;
          case 'afternoon':
            finalTime = '14:00';
            break;
          case 'evening':
            finalTime = '18:00';
            break;
          case 'night':
            finalTime = '21:00';
            break;
        }
      }

      if (activity && activity.activity_time && finalTime && activity.activity_time !== finalTime) {
        const oldSection = getSectionFromTime(activity.activity_time);
        const newSection = getSectionFromTime(finalTime);

        if (oldSection !== newSection) {
          const confirmed = window.confirm(
            `Changing the time from ${activity.activity_time} to ${finalTime} will move this activity from the "${oldSection.replace('_', ' ')}" section to the "${newSection.replace('_', ' ')}" section.\n\nDo you want to continue?`
          );

          if (!confirmed) {
            setLoading(false);
            return;
          }
        }
      }

      const data = {
        day_id: dayId,
        ...formData,
        activity_time: finalTime || null,
        duration_minutes: parseDuration(formData.duration_minutes),
        images: images,
      };

      if (activity) {
        const { error } = await supabase
          .from('activities')
          .update(data)
          .eq('id', activity.id);

        if (error) throw error;

        await uploadPendingImages(activity.id);
        await uploadDocumentFiles(activity.id);
      } else {
        const { data: newActivity, error } = await supabase
          .from('activities')
          .insert(data)
          .select()
          .single();

        if (error) throw error;

        if (!newActivity) {
          throw new Error('Failed to create activity');
        }

        await uploadPendingImages(newActivity.id);
        await uploadDocumentFiles(newActivity.id);

        if (saveToMaster && isManagerOrAdmin && !selectedSite) {
          await saveToMasterDatabase();
        }
      }

      onSave();
    } catch (error) {
      console.error('Error saving activity:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to save activity: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-slate-900">
            {activity ? 'Edit' : 'Add'} Activity
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Activity Name
              </label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.activity_name}
                    onChange={(e) => {
                      setFormData({ ...formData, activity_name: e.target.value });
                      searchMasterSites(e.target.value);
                    }}
                    onFocus={() => {
                      if (formData.activity_name.length >= 2 && siteSuggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    placeholder="Search or enter new activity name"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searchingMaster && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>

                {showSuggestions && siteSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {siteSuggestions.map((site) => (
                      <button
                        key={site.id}
                        type="button"
                        onClick={() => selectMasterSite(site)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-slate-200 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-slate-900">{site.name}</div>
                            {site.location && (
                              <div className="text-sm text-slate-600 mt-0.5">{site.location}</div>
                            )}
                            {site.city && (
                              <div className="text-xs text-slate-500 mt-0.5">{site.city}</div>
                            )}
                          </div>
                          {site.fees && site.fees.length > 0 && (
                            <div className="ml-2 flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              <DollarSign className="w-3 h-3" />
                              {site.fees.length} {site.fees.length === 1 ? 'fee' : 'fees'}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedSite && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <MapPin className="w-4 h-4" />
                      <span>Loaded from database: {selectedSite.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSite(null);
                          setFormData({ ...formData, activity_name: '' });
                        }}
                        className="ml-auto text-green-600 hover:text-green-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {!activity && isManagerOrAdmin && !selectedSite && formData.activity_name && (
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
                      Save this activity to the master database for future use
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Address or venue name"
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
                Activity Time
              </label>
              <input
                type="time"
                value={formData.activity_time}
                onChange={(e) => {
                  setFormData({ ...formData, activity_time: e.target.value });
                  if (!manualSectionOverride && e.target.value) {
                    setActivitySection(getSectionFromTime(e.target.value));
                  }
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {formData.activity_time && !manualSectionOverride && (
                <p className="text-xs text-blue-600 mt-1">
                  Auto-categorized as {activitySection.replace('_', ' ')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Activity Section
              </label>
              <select
                value={activitySection}
                onChange={(e) => {
                  setActivitySection(e.target.value as 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night');
                  setManualSectionOverride(true);
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="early_morning">Early Morning (before 7 AM)</option>
                <option value="morning">Morning (7 AM - 12 PM)</option>
                <option value="afternoon">Afternoon (12 PM - 6 PM)</option>
                <option value="evening">Evening (6 PM - 9 PM)</option>
                <option value="night">Night (after 9 PM)</option>
              </select>
              {manualSectionOverride && (
                <p className="text-xs text-amber-600 mt-1">
                  Manual override active - activity will appear in {activitySection.replace('_', ' ')} section
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Duration (minutes or 60+ for hours)
              </label>
              <input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                placeholder="e.g., 75 = 1h 15min, 120 = 2h"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {formData.duration_minutes && (safeParseInt(formData.duration_minutes.toString(), 0) || 0) >= 60 && (
                <p className="text-xs text-slate-500 mt-1">
                  = {Math.floor((safeParseInt(formData.duration_minutes.toString(), 0) || 0) / 60)}h {(safeParseInt(formData.duration_minutes.toString(), 0) || 0) % 60}min
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Booking Status
              </label>
              <select
                value={formData.booking_status}
                onChange={(e) =>
                  setFormData({ ...formData, booking_status: e.target.value as 'confirmed' | 'pending' })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
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
              <label className="block text-sm font-medium text-slate-700 mb-1">
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

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Access Method
              </label>
              <select
                value={formData.access_method}
                onChange={(e) =>
                  setFormData({ ...formData, access_method: e.target.value as 'pdf_ticket' | 'barcode' | 'qr_code' | 'evoucher' | 'physical_ticket' | 'n_a' | 'not_included_in_invoice' | 'paid_by_client' })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pdf_ticket">PDF Ticket</option>
                <option value="barcode">Barcode</option>
                <option value="qr_code">QR Code</option>
                <option value="evoucher">E-Voucher</option>
                <option value="physical_ticket">Physical Ticket</option>
                <option value="n_a">N/A</option>
                <option value="not_included_in_invoice">Not included in invoice</option>
                <option value="paid_by_client">Paid by client</option>
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
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Images
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Add photos for this activity. The first image will be displayed on the card.
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Guide Notes
            </label>
            <textarea
              rows={3}
              value={formData.guide_notes}
              onChange={(e) => setFormData({ ...formData, guide_notes: e.target.value })}
              placeholder="Special instructions for the guide (e.g., meet at back entrance, contact person details, allergies)..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="border-t border-slate-200 pt-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Upload tickets, permits, vouchers, or other documents. Click the file name to view/download.
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
              {tempActivityId && (
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
                {loading ? 'Saving...' : activity ? 'Update' : 'Add'} Activity
              </button>
            </div>
          </div>
        </form>

        {showFeeEditor && tempActivityId && (
          <BookingFeeEditor
            itemId={tempActivityId}
            itemType="activity"
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
