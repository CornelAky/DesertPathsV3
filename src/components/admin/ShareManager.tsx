import { useState, useEffect } from 'react';
import { Share2, UserPlus, Link as LinkIcon, X, Trash2, Copy, Check, Clock, Eye, Edit3, Calendar, AlertCircle, Users, History } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ShareManagerProps {
  journeyId: string;
  journeyName: string;
  onClose: () => void;
}

interface TripShare {
  id: string;
  shared_with: string;
  permission_level: 'view' | 'edit';
  created_at: string;
  is_active: boolean;
  revoked_at: string | null;
  user_email: string;
  user_name: string;
  user_role: 'admin' | 'guide';
}

interface ShareLink {
  id: string;
  share_token: string;
  permission_level: 'view' | 'edit';
  expires_at: string | null;
  created_at: string;
  is_active: boolean;
  access_count: number;
  last_accessed_at: string | null;
}

interface ActivityLog {
  id: string;
  user_email: string;
  action: string;
  timestamp: string;
  field_name: string | null;
  metadata: any;
}

export function ShareManager({ journeyId, journeyName, onClose }: ShareManagerProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'links' | 'activity'>('users');
  const [shares, setShares] = useState<TripShare[]>([]);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Share user form
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('view');
  const [sharing, setSharing] = useState(false);
  const [availableGuides, setAvailableGuides] = useState<Array<{id: string, email: string, name: string}>>([]);
  const [showGuidesOnly, setShowGuidesOnly] = useState(false);

  // Create link form
  const [linkPermission, setLinkPermission] = useState<'view' | 'edit'>('view');
  const [linkExpiration, setLinkExpiration] = useState('');
  const [creatingLink, setCreatingLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadGuides();
  }, [journeyId, activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'users') {
        await loadShares();
      } else if (activeTab === 'links') {
        await loadShareLinks();
      } else if (activeTab === 'activity') {
        await loadActivityLog();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadShares = async () => {
    const { data, error } = await supabase
      .from('journey_shares')
      .select(`
        id,
        shared_with,
        permission_level,
        created_at,
        is_active,
        revoked_at,
        users!journey_shares_shared_with_fkey (
          email,
          name,
          role
        )
      `)
      .eq('journey_id', journeyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedShares = data?.map(share => ({
      ...share,
      user_email: share.users?.email || 'Unknown',
      user_name: share.users?.name || 'Unknown User',
      user_role: share.users?.role || 'guide'
    })) || [];

    setShares(formattedShares);
  };

  const loadGuides = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('role', 'guide')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading guides:', error);
      return;
    }

    setAvailableGuides(data || []);
  };

  const loadShareLinks = async () => {
    const { data, error } = await supabase
      .from('journey_share_links')
      .select('id, journey_id, share_token, permission_level, expires_at, created_at, is_active, access_count, last_accessed_at')
      .eq('journey_id', journeyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setShareLinks(data || []);
  };

  const loadActivityLog = async () => {
    const { data, error } = await supabase
      .from('itinerary_activity_log')
      .select('id, user_email, action, timestamp, field_name, metadata')
      .eq('journey_id', journeyId)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) throw error;
    setActivityLog(data || []);
  };

  const handleShareWithUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmail.trim()) return;

    setSharing(true);
    setError(null);

    try {
      // Find user by email (case-insensitive)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .ilike('email', shareEmail.trim())
        .maybeSingle();

      if (userError) throw userError;
      if (!userData) {
        throw new Error('User not found. They must create an account first.');
      }

      // Get current user from users table
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      const { data: currentUser, error: currentUserError } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUser.id)
        .maybeSingle();

      if (currentUserError) throw currentUserError;
      if (!currentUser) {
        throw new Error('User profile not found. Please contact support.');
      }

      // Create share
      const { error: shareError } = await supabase
        .from('journey_shares')
        .insert({
          journey_id: journeyId,
          shared_by: currentUser.id,
          shared_with: userData.id,
          permission_level: sharePermission,
          is_active: true
        });

      if (shareError) {
        if (shareError.code === '23505') {
          throw new Error('This trip is already shared with this user');
        }
        throw shareError;
      }

      // Log the share action
      const { data: sharedUserData } = await supabase
        .from('users')
        .select('email')
        .eq('id', userData.id)
        .single();

      await supabase
        .from('itinerary_activity_log')
        .insert({
          journey_id: journeyId,
          user_id: user.id,
          action: 'shared',
          user_email: user.email || 'unknown',
          metadata: {
            shared_with: sharedUserData?.email,
            permission_level: sharePermission
          }
        });

      setShareEmail('');
      setSharePermission('view');
      await loadShares();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSharing(false);
    }
  };

  const handleRevokeShare = async (shareId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to revoke this share?')) return;

    try {
      const { error } = await supabase
        .from('journey_shares')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString()
        })
        .eq('id', shareId);

      if (error) throw error;

      // Log the revoke action
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('itinerary_activity_log')
          .insert({
            journey_id: journeyId,
            user_id: user.id,
            action: 'revoked',
            user_email: user.email || 'unknown'
          });
      }

      await loadShares();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateShareLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingLink(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const linkData: any = {
        journey_id: journeyId,
        created_by: user.id,
        permission_level: linkPermission,
        is_active: true
      };

      if (linkExpiration) {
        linkData.expires_at = new Date(linkExpiration).toISOString();
      }

      const { error } = await supabase
        .from('journey_share_links')
        .insert(linkData);

      if (error) throw error;

      setLinkPermission('view');
      setLinkExpiration('');
      await loadShareLinks();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingLink(false);
    }
  };

  const handleRevokeLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to deactivate this link?')) return;

    try {
      const { error } = await supabase
        .from('journey_share_links')
        .update({ is_active: false })
        .eq('id', linkId);

      if (error) throw error;
      await loadShareLinks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyLinkToClipboard = (token: string) => {
    const url = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created': return '+';
      case 'updated': return '✏️';
      case 'deleted': return '🗑️';
      case 'shared': return '↗️';
      case 'revoked': return '⛔';
      case 'accessed': return '👁️';
      default: return '•';
    }
  };

  return (
    <div className="fixed inset-0 bg-brand-brown bg-opacity-20 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Share2 className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Share Journey</h2>
              <p className="text-sm text-slate-600">{journeyName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Shared Users
            </div>
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'links'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Share Links
            </div>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'activity'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Activity Log
            </div>
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-500">Loading...</div>
            </div>
          ) : activeTab === 'users' ? (
            <div className="space-y-6">
              {/* Quick Share with Guides */}
              {availableGuides.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Quick Share with Guides
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {availableGuides.map((guide) => {
                      const alreadyShared = shares.some(s => s.shared_with === guide.id);
                      return (
                        <button
                          key={guide.id}
                          onClick={async () => {
                            if (alreadyShared) return;
                            setShareEmail(guide.email);
                            setSharePermission('view');
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) return;

                            try {
                              await supabase
                                .from('journey_shares')
                                .insert({
                                  journey_id: journeyId,
                                  shared_by: user.id,
                                  shared_with: guide.id,
                                  permission_level: 'view',
                                  is_active: true
                                });

                              await supabase
                                .from('itinerary_activity_log')
                                .insert({
                                  journey_id: journeyId,
                                  user_id: user.id,
                                  action: 'shared',
                                  user_email: user.email || 'unknown',
                                  metadata: {
                                    shared_with: guide.email,
                                    permission_level: 'view'
                                  }
                                });

                              await loadShares();
                            } catch (err: any) {
                              setError(err.message);
                            }
                          }}
                          disabled={alreadyShared}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                            alreadyShared
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-white border-blue-300 hover:bg-blue-50 text-slate-900'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{guide.name}</div>
                            <div className="text-sm text-slate-600 truncate">{guide.email}</div>
                          </div>
                          {alreadyShared ? (
                            <Check className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" />
                          ) : (
                            <UserPlus className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Share with user form */}
              <form onSubmit={handleShareWithUser} className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Share with User (by Email)
                </h3>
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <select
                    value={sharePermission}
                    onChange={(e) => setSharePermission(e.target.value as 'view' | 'edit')}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="view">View Only</option>
                    <option value="edit">Can Edit</option>
                  </select>
                  <button
                    type="submit"
                    disabled={sharing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {sharing ? 'Sharing...' : 'Share'}
                  </button>
                </div>
              </form>

              {/* List of shared users */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900">Shared With ({shares.length})</h3>
                  <button
                    onClick={() => setShowGuidesOnly(!showGuidesOnly)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      showGuidesOnly
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {showGuidesOnly ? 'Show All' : 'Guides Only'}
                  </button>
                </div>
                {shares.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>No users have access yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {shares
                      .filter(share => !showGuidesOnly || share.user_role === 'guide')
                      .map((share) => (
                      <div
                        key={share.id}
                        className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-slate-900">{share.user_name}</div>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              share.user_role === 'admin'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-teal-100 text-teal-700'
                            }`}>
                              {share.user_role === 'admin' ? 'Admin' : 'Guide'}
                            </span>
                          </div>
                          <div className="text-sm text-slate-600">{share.user_email}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            Shared {formatDate(share.created_at)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                            share.permission_level === 'edit'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {share.permission_level === 'edit' ? (
                              <><Edit3 className="w-3 h-3" /> Can Edit</>
                            ) : (
                              <><Eye className="w-3 h-3" /> View Only</>
                            )}
                          </span>
                          <button
                            onClick={(e) => handleRevokeShare(share.id, e)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Revoke access"
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
          ) : activeTab === 'links' ? (
            <div className="space-y-6">
              {/* Create link form */}
              <form onSubmit={handleCreateShareLink} className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  Create Share Link
                </h3>
                <div className="flex gap-3">
                  <select
                    value={linkPermission}
                    onChange={(e) => setLinkPermission(e.target.value as 'view' | 'edit')}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="view">View Only</option>
                    <option value="edit">Can Edit</option>
                  </select>
                  <input
                    type="datetime-local"
                    value={linkExpiration}
                    onChange={(e) => setLinkExpiration(e.target.value)}
                    placeholder="Expiration (optional)"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={creatingLink}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {creatingLink ? 'Creating...' : 'Create Link'}
                  </button>
                </div>
              </form>

              {/* List of share links */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Active Links ({shareLinks.length})</h3>
                {shareLinks.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <LinkIcon className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>No active share links</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {shareLinks.map((link) => {
                      const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
                      return (
                        <div
                          key={link.id}
                          className="p-4 bg-white border border-slate-200 rounded-lg"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                                  link.permission_level === 'edit'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {link.permission_level === 'edit' ? (
                                    <><Edit3 className="w-3 h-3" /> Edit</>
                                  ) : (
                                    <><Eye className="w-3 h-3" /> View</>
                                  )}
                                </span>
                                {link.expires_at && (
                                  <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                                    isExpired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    <Clock className="w-3 h-3" />
                                    {isExpired ? 'Expired' : `Expires ${formatDate(link.expires_at)}`}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500">
                                Created {formatDate(link.created_at)} • Used {link.access_count} times
                                {link.last_accessed_at && ` • Last used ${formatDate(link.last_accessed_at)}`}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRevokeLink(link.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Deactivate link"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={`${window.location.origin}/shared/${link.share_token}`}
                              readOnly
                              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm font-mono text-slate-700"
                            />
                            <button
                              onClick={() => copyLinkToClipboard(link.share_token)}
                              className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-colors flex items-center gap-2"
                            >
                              {copiedToken === link.share_token ? (
                                <><Check className="w-4 h-4" /> Copied</>
                              ) : (
                                <><Copy className="w-4 h-4" /> Copy</>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Recent Activity</h3>
              {activityLog.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <History className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p>No activity yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activityLog.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg"
                    >
                      <span className="text-lg">{getActionIcon(log.action)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-900">
                          <span className="font-medium">{log.user_email}</span>
                          {' '}
                          <span className="text-slate-600">{log.action}</span>
                          {log.field_name && ` ${log.field_name}`}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {formatDate(log.timestamp)}
                        </div>
                        {log.metadata && (
                          <div className="text-xs text-slate-600 mt-1">
                            {JSON.stringify(log.metadata)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
