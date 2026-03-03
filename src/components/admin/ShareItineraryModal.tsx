import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Link as LinkIcon, Copy, Check, Calendar, Eye, Clock, Trash2, ExternalLink } from 'lucide-react';
import type { Journey } from '../../lib/database.types';

interface ShareItineraryModalProps {
  journey: Journey;
  onClose: () => void;
}

interface ShareableLink {
  id: string;
  token: string;
  expires_at: string;
  is_active: boolean;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
}

export function ShareItineraryModal({ journey, onClose }: ShareItineraryModalProps) {
  const [links, setLinks] = useState<ShareableLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expiryDays, setExpiryDays] = useState(7);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    fetchLinks();
  }, [journey.id]);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shareable_itinerary_links')
        .select('*')
        .eq('journey_id', journey.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (err) {
      console.error('Error fetching links:', err);
    } finally {
      setLoading(false);
    }
  };

  const createShareLink = async () => {
    try {
      setCreating(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate token
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_share_token');

      if (tokenError) throw tokenError;

      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      // Create link
      const { error: insertError } = await supabase
        .from('shareable_itinerary_links')
        .insert({
          journey_id: journey.id,
          token: tokenData,
          expires_at: expiresAt.toISOString(),
          created_by: user.id,
        });

      if (insertError) throw insertError;

      await fetchLinks();
    } catch (err) {
      console.error('Error creating link:', err);
      alert('Failed to create share link');
    } finally {
      setCreating(false);
    }
  };

  const deactivateLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('shareable_itinerary_links')
        .update({ is_active: false })
        .eq('id', linkId);

      if (error) throw error;
      await fetchLinks();
    } catch (err) {
      console.error('Error deactivating link:', err);
      alert('Failed to deactivate link');
    }
  };

  const deleteLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this link? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('shareable_itinerary_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
      await fetchLinks();
    } catch (err) {
      console.error('Error deleting link:', err);
      alert('Failed to delete link');
    }
  };

  const getShareUrl = (token: string) => {
    return `${window.location.origin}/shared/${token}`;
  };

  const copyToClipboard = async (token: string) => {
    try {
      await navigator.clipboard.writeText(getShareUrl(token));
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      alert('Failed to copy link');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Share Itinerary</h2>
              <p className="text-sm text-gray-600">{journey.journey_name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <LinkIcon className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">Create Shareable Link</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Generate a time-limited link to share this complete itinerary with clients. They can view the full schedule without logging in.
                </p>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-blue-900 mb-1">
                      Link expires in:
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600 w-4 h-4" />
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={expiryDays}
                        onChange={(e) => setExpiryDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
                        className="w-full pl-10 pr-16 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-blue-700 font-medium">
                        days
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={createShareLink}
                    disabled={creating}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                  >
                    <LinkIcon className="w-4 h-4" />
                    {creating ? 'Creating...' : 'Generate Link'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading links...</p>
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-8">
              <LinkIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No shareable links created yet</p>
              <p className="text-sm text-gray-500 mt-1">Create a link above to share this itinerary</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Active & Past Links</h3>
              {links.map((link) => {
                const expired = isExpired(link.expires_at);
                const inactive = !link.is_active;
                const status = inactive ? 'Deactivated' : expired ? 'Expired' : 'Active';
                const statusColor = inactive || expired ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50';

                return (
                  <div
                    key={link.id}
                    className={`border rounded-lg p-4 ${inactive || expired ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200'}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                            {status}
                          </span>
                          {link.view_count > 0 && (
                            <span className="flex items-center gap-1 text-xs text-gray-600">
                              <Eye className="w-3 h-3" />
                              {link.view_count} {link.view_count === 1 ? 'view' : 'views'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {expired ? 'Expired' : 'Expires'}: {formatDate(link.expires_at)}
                          </span>
                        </div>
                        {link.last_viewed_at && (
                          <div className="text-xs text-gray-500">
                            Last viewed: {formatDate(link.last_viewed_at)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {!inactive && !expired && (
                          <>
                            <button
                              onClick={() => window.open(getShareUrl(link.token), '_blank')}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Open in new tab"
                            >
                              <ExternalLink className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => copyToClipboard(link.token)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Copy link"
                            >
                              {copiedToken === link.token ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => deleteLink(link.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete link"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                    {!inactive && !expired && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={getShareUrl(link.token)}
                          readOnly
                          className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-300 rounded text-sm text-gray-700 font-mono"
                        />
                        <button
                          onClick={() => deactivateLink(link.id)}
                          className="px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 border border-orange-300 rounded transition-colors"
                        >
                          Deactivate
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
