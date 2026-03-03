import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, FileText, Download, Trash2, Save, AlertCircle, Clock, Sparkles } from 'lucide-react';

interface TripDocument {
  id: string;
  journey_id: string;
  uploaded_by: string;
  file_name: string;
  storage_path: string;
  file_size: number;
  file_type: string;
  document_category: string;
  upload_direction: 'admin_to_guide' | 'guide_to_admin';
  notes: string;
  created_at: string;
  uploader_name?: string;
  is_new?: boolean;
  viewed_by_guide?: boolean;
}

interface Activity {
  id: string;
  action_type: string;
  created_at: string;
  user_name: string;
  details: any;
}

interface JourneyDocumentsBriefingProps {
  journeyId: string;
}

export function JourneyDocumentsBriefing({ journeyId }: JourneyDocumentsBriefingProps) {
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [managerBriefing, setManagerBriefing] = useState('');
  const [adminDocuments, setAdminDocuments] = useState<TripDocument[]>([]);
  const [guideDocuments, setGuideDocuments] = useState<TripDocument[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string>('tickets');
  const [uploadNotes, setUploadNotes] = useState('');

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel(`journey_documents_${journeyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'journey_documents',
        filter: `journey_id=eq.${journeyId}`
      }, () => {
        loadData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'journey_document_activities',
        filter: `journey_id=eq.${journeyId}`
      }, () => {
        loadActivities();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [journeyId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: journeyData, error: journeyError } = await supabase
        .from('journeys')
        .select('special_requirements, manager_briefing')
        .eq('id', journeyId)
        .single();

      if (journeyError) throw journeyError;

      setSpecialRequirements(journeyData.special_requirements || '');
      setManagerBriefing(journeyData.manager_briefing || '');

      const { data: { user } } = await supabase.auth.getUser();

      const { data: adminDocs, error: adminDocsError } = await supabase
        .from('journey_documents')
        .select(`
          *,
          users:uploaded_by(name)
        `)
        .eq('journey_id', journeyId)
        .eq('upload_direction', 'admin_to_guide')
        .order('created_at', { ascending: false });

      if (adminDocsError) throw adminDocsError;

      const { data: guideDocs, error: guideDocsError } = await supabase
        .from('journey_documents')
        .select(`
          *,
          users:uploaded_by(name)
        `)
        .eq('journey_id', journeyId)
        .eq('upload_direction', 'guide_to_admin')
        .order('created_at', { ascending: false });

      if (guideDocsError) throw guideDocsError;

      const { data: views } = await supabase
        .from('journey_document_views')
        .select('document_id')
        .eq('user_id', user?.id);

      const viewedDocIds = new Set(views?.map(v => v.document_id) || []);

      const { data: allViews } = await supabase
        .from('journey_document_views')
        .select('document_id, user_id, users:user_id(role)');

      const guideViewedDocs = new Set(
        (allViews || [])
          .filter((v: any) => v.users?.role === 'guide')
          .map((v: any) => v.document_id)
      );

      setAdminDocuments((adminDocs || []).map((doc: any) => ({
        ...doc,
        uploader_name: doc.users?.name || 'Unknown',
        is_new: !viewedDocIds.has(doc.id),
        viewed_by_guide: guideViewedDocs.has(doc.id)
      })));

      setGuideDocuments((guideDocs || []).map((doc: any) => ({
        ...doc,
        uploader_name: doc.users?.name || 'Unknown',
        is_new: !viewedDocIds.has(doc.id)
      })));

      await loadActivities();
    } catch (error) {
      console.error('Error loading trip documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('journey_document_activities')
        .select(`
          *,
          users:user_id(name)
        `)
        .eq('journey_id', journeyId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setActivities((data || []).map((act: any) => ({
        ...act,
        user_name: act.users?.name || 'Unknown'
      })));
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const markDocumentAsViewed = async (docId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('journey_document_views')
        .upsert({
          document_id: docId,
          user_id: user.id
        }, {
          onConflict: 'document_id,user_id'
        });

      await loadData();
    } catch (error) {
      console.error('Error marking document as viewed:', error);
    }
  };

  const saveTextFields = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('journeys')
        .update({
          special_requirements: specialRequirements,
          manager_briefing: managerBriefing
        })
        .eq('id', journeyId);

      if (error) throw error;

      alert('Saved successfully!');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `admin-uploads/${journeyId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('trip-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('journey_documents')
          .insert({
            journey_id: journeyId,
            uploaded_by: user.id,
            file_name: file.name,
            storage_path: filePath,
            file_size: file.size,
            file_type: file.type,
            document_category: uploadCategory,
            upload_direction: 'admin_to_guide',
            notes: uploadNotes
          });

        if (dbError) throw dbError;
      }

      setUploadNotes('');
      event.target.value = '';
      await loadData();
      alert('Files uploaded successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const downloadFile = async (doc: TripDocument) => {
    try {
      await markDocumentAsViewed(doc.id);

      const { data, error } = await supabase.storage
        .from('trip-documents')
        .download(doc.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file. Please try again.');
    }
  };

  const deleteFile = async (doc: TripDocument) => {
    if (!confirm(`Are you sure you want to delete ${doc.file_name}?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('trip-documents')
        .remove([doc.storage_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('journey_documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      await loadData();
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Error deleting file. Please try again.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getActivityMessage = (activity: Activity) => {
    switch (activity.action_type) {
      case 'document_uploaded':
        return `${activity.user_name} uploaded "${activity.details?.file_name}"`;
      case 'document_deleted':
        return `${activity.user_name} deleted a document`;
      case 'briefing_updated':
        return `${activity.user_name} updated the briefing notes`;
      case 'requirements_updated':
        return `${activity.user_name} updated special requirements`;
      case 'document_viewed':
        return `${activity.user_name} viewed a document`;
      default:
        return `${activity.user_name} performed an action`;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const newGuideUploadsCount = guideDocuments.filter(d => d.is_new).length;

  return (
    <div className="space-y-6">
      {activities.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
            <Clock className="w-4 h-4" />
            Recent Activity
          </h4>
          <div className="space-y-2">
            {activities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-start gap-2 text-sm">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <div className="flex-1">
                  <p className="text-gray-700">{getActivityMessage(activity)}</p>
                  <p className="text-xs text-gray-500">{getTimeAgo(activity.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <label className="block text-sm font-semibold text-yellow-900 mb-2">
              Client Special Requirements
            </label>
            <textarea
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              placeholder="Enter allergies, wheelchair needs, dietary restrictions, medical conditions, etc."
              className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
              rows={3}
            />
            <p className="text-xs text-yellow-700 mt-1">
              This will be prominently displayed to guides
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Manager's Briefing (Internal Notes for Guide)
        </label>
        <textarea
          value={managerBriefing}
          onChange={(e) => setManagerBriefing(e.target.value)}
          placeholder="Enter internal instructions, tips, or important information for the guide..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
          rows={4}
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={saveTextFields}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Notes'}
        </button>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Official Documents (Admin to Guide)
        </h3>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Documents for Guide
          </label>

          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Document Type</label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="tickets">Tickets</option>
                <option value="passports">Passports</option>
                <option value="vouchers">Vouchers</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Notes (Optional)</label>
              <input
                type="text"
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                placeholder="Add notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload Files'}
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {adminDocuments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No documents uploaded yet</p>
        ) : (
          <div className="space-y-2">
            {adminDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.file_name}
                      {doc.viewed_by_guide ? (
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded" title="Guide has viewed this">
                          ✓ Read by Guide
                        </span>
                      ) : (
                        <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded" title="Guide hasn't viewed yet">
                          Pending
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {doc.document_category} • {formatFileSize(doc.file_size)} • Uploaded by {doc.uploader_name}
                      {doc.notes && ` • ${doc.notes}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadFile(doc)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteFile(doc)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Guide Uploads (Guide to Admin)
          </h3>
          {newGuideUploadsCount > 0 && (
            <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full">
              <Sparkles className="w-4 h-4" />
              {newGuideUploadsCount} New
            </span>
          )}
        </div>

        {guideDocuments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No uploads from guide yet</p>
        ) : (
          <div className="space-y-2">
            {guideDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                  doc.is_new
                    ? 'bg-green-50 border-green-400 shadow-md'
                    : 'bg-green-50 border-green-200 hover:bg-green-100'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.file_name}
                      {doc.is_new && (
                        <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded animate-pulse">
                          NEW!
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {doc.document_category.toUpperCase()} • {formatFileSize(doc.file_size)} • Uploaded by {doc.uploader_name}
                      {doc.notes && ` • ${doc.notes}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {getTimeAgo(doc.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadFile(doc)}
                    className="p-2 text-green-600 hover:bg-green-100 rounded-lg"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteFile(doc)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}