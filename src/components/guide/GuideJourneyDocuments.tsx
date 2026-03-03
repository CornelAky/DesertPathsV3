import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, FileText, Download, AlertCircle, Info, Clock, Bell, Sparkles } from 'lucide-react';

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
}

interface Activity {
  id: string;
  action_type: string;
  created_at: string;
  user_name: string;
  details: any;
}

interface Notification {
  id: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface GuideJourneyDocumentsProps {
  journeyId: string;
}

export function GuideJourneyDocuments({ journeyId }: GuideJourneyDocumentsProps) {
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [managerBriefing, setManagerBriefing] = useState('');
  const [adminDocuments, setAdminDocuments] = useState<TripDocument[]>([]);
  const [myUploads, setMyUploads] = useState<TripDocument[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string>('receipts');
  const [uploadNotes, setUploadNotes] = useState('');

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel(`guide_journey_documents_${journeyId}`)
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
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'journey_notifications'
      }, () => {
        loadNotifications();
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

      const { data: myDocs, error: myDocsError } = await supabase
        .from('journey_documents')
        .select(`
          *,
          users:uploaded_by(name)
        `)
        .eq('journey_id', journeyId)
        .eq('upload_direction', 'guide_to_admin')
        .eq('uploaded_by', user?.id)
        .order('created_at', { ascending: false });

      if (myDocsError) throw myDocsError;

      const { data: views } = await supabase
        .from('journey_document_views')
        .select('document_id')
        .eq('user_id', user?.id);

      const viewedDocIds = new Set(views?.map(v => v.document_id) || []);

      setAdminDocuments((adminDocs || []).map((doc: any) => ({
        ...doc,
        uploader_name: doc.users?.name || 'Admin',
        is_new: !viewedDocIds.has(doc.id)
      })));

      setMyUploads((myDocs || []).map((doc: any) => ({
        ...doc,
        uploader_name: doc.users?.name || 'You',
        is_new: false
      })));

      await loadActivities();
      await loadNotifications();
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

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('journey_notifications')
        .select('id, journey_id, user_id, notification_type, title, message, is_read, created_at')
        .eq('journey_id', journeyId)
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markNotificationsAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const notifIds = notifications.map(n => n.id);
      if (notifIds.length === 0) return;

      await supabase
        .from('journey_notifications')
        .update({ is_read: true })
        .in('id', notifIds);

      setNotifications([]);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
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
        const filePath = `guide-uploads/${journeyId}/${fileName}`;

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
            upload_direction: 'guide_to_admin',
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

  const newAdminDocsCount = adminDocuments.filter(d => d.is_new).length;

  return (
    <div className="space-y-6">
      {notifications.length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-500 rounded-lg p-4 shadow-lg animate-pulse">
          <div className="flex items-start gap-3">
            <Bell className="w-6 h-6 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-base font-bold text-orange-900 mb-2">
                New Updates from Admin!
              </h3>
              <div className="space-y-1 mb-3">
                {notifications.map((notif) => (
                  <p key={notif.id} className="text-sm text-orange-900">
                    • {notif.message}
                  </p>
                ))}
              </div>
              <button
                onClick={markNotificationsAsRead}
                className="text-sm px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

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

      {specialRequirements && (
        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">
                Client Special Requirements - IMPORTANT!
              </h3>
              <div className="text-sm text-red-900 whitespace-pre-wrap bg-white p-3 rounded border border-red-300">
                {specialRequirements}
              </div>
            </div>
          </div>
        </div>
      )}

      {managerBriefing && (
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-base font-semibold text-blue-900 mb-2">
                Manager's Briefing
              </h3>
              <div className="text-sm text-blue-900 whitespace-pre-wrap bg-white p-3 rounded border border-blue-200">
                {managerBriefing}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Official Documents from Admin
          </h3>
          {newAdminDocsCount > 0 && (
            <span className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 text-sm font-semibold rounded-full">
              <Sparkles className="w-4 h-4" />
              {newAdminDocsCount} New
            </span>
          )}
        </div>

        {adminDocuments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No documents available yet
          </p>
        ) : (
          <div className="space-y-2">
            {adminDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                  doc.is_new
                    ? 'bg-blue-50 border-blue-400 shadow-md'
                    : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.file_name}
                      {doc.is_new && (
                        <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded animate-pulse">
                          NEW!
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {doc.document_category.toUpperCase()} • {formatFileSize(doc.file_size)}
                      {doc.notes && ` • ${doc.notes}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {getTimeAgo(doc.created_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => downloadFile(doc)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-green-600" />
          Upload Documents (Receipts, Photos, etc.)
        </h3>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-green-800 mb-3">
            Upload receipts, trip photos, or any documents for the admin to review
          </p>

          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Document Type</label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="receipts">Receipts</option>
                <option value="photos">Trip Photos</option>
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

          <label className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer">
            <Upload className="w-5 h-5" />
            {uploading ? 'Uploading...' : 'Choose Files to Upload'}
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {myUploads.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">My Uploads</h4>
            <div className="space-y-2">
              {myUploads.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.file_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {doc.document_category.toUpperCase()} • {formatFileSize(doc.file_size)}
                        {doc.notes && ` • ${doc.notes}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {getTimeAgo(doc.created_at)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadFile(doc)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          <strong>Note:</strong> You can only upload files in this section.
          You cannot modify the trip itinerary or fees from this view.
          All uploads are immediately visible to the admin.
        </p>
      </div>
    </div>
  );
}