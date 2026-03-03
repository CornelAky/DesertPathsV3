import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Eye, Edit3, Calendar, MapPin, User, Mail, Phone, Loader, AlertCircle } from 'lucide-react';

interface GuideAccess {
  guide_id: string;
  guide_name: string;
  guide_email: string | null;
  guide_phone: string | null;
  has_user_account: boolean;
  journeys: {
    journey_id: string;
    journey_name: string;
    permission_level: 'view' | 'edit';
    share_all_days: boolean;
    shared_days_count: number;
    total_days_count: number;
    shared_days: Array<{
      day_number: number;
      date: string;
      city_destination: string;
    }>;
  }[];
}

export function GuideAccessView() {
  const [guideAccess, setGuideAccess] = useState<GuideAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGuides, setExpandedGuides] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchGuideAccess();
  }, []);

  const fetchGuideAccess = async () => {
    try {
      setLoading(true);

      // Fetch all active journey shares with guide and journey information
      const { data: shares, error: sharesError } = await supabase
        .from('journey_shares')
        .select(`
          id,
          journey_id,
          shared_with,
          master_staff_id,
          permission_level,
          share_all_days,
          journeys!inner (
            id,
            journey_name,
            deleted_at
          ),
          users:shared_with (
            id,
            name,
            email,
            phone
          ),
          master_staff!journey_shares_master_staff_id_fkey (
            id,
            name,
            email,
            phone,
            user_id
          )
        `)
        .eq('is_active', true)
        .is('revoked_at', null)
        .is('journeys.deleted_at', null)
        .order('created_at', { ascending: false });

      if (sharesError) throw sharesError;

      // Group by guide
      const guidesMap = new Map<string, GuideAccess>();

      for (const share of shares || []) {
        let guideId: string;
        let guideName: string;
        let guideEmail: string | null;
        let guidePhone: string | null;
        let hasUserAccount: boolean;

        // Determine guide information
        if (share.shared_with && share.users) {
          guideId = share.users.id;
          guideName = share.users.name || 'Unknown User';
          guideEmail = share.users.email || null;
          guidePhone = share.users.phone || null;
          hasUserAccount = true;
        } else if (share.master_staff_id && share.master_staff) {
          guideId = share.master_staff.id;
          guideName = share.master_staff.name || 'Unknown Guide';
          guideEmail = share.master_staff.email || null;
          guidePhone = share.master_staff.phone || null;
          hasUserAccount = share.master_staff.user_id !== null;
        } else {
          continue; // Skip if no valid guide info
        }

        // Get or create guide entry
        if (!guidesMap.has(guideId)) {
          guidesMap.set(guideId, {
            guide_id: guideId,
            guide_name: guideName,
            guide_email: guideEmail,
            guide_phone: guidePhone,
            has_user_account: hasUserAccount,
            journeys: [],
          });
        }

        const guideEntry = guidesMap.get(guideId)!;

        // Get total days count for the journey
        const { count: totalDaysCount } = await supabase
          .from('itinerary_days')
          .select('*', { count: 'exact', head: true })
          .eq('journey_id', share.journey_id);

        // Get shared days if not sharing all days
        let sharedDays: Array<{ day_number: number; date: string; city_destination: string }> = [];
        let sharedDaysCount = totalDaysCount || 0;

        if (!share.share_all_days) {
          const { data: shareDaysData } = await supabase
            .from('journey_share_days')
            .select('day_id')
            .eq('journey_share_id', share.id);

          const dayIds = (shareDaysData || []).map(d => d.day_id);
          sharedDaysCount = dayIds.length;

          if (dayIds.length > 0) {
            const { data: daysData } = await supabase
              .from('itinerary_days')
              .select('day_number, date, city_destination')
              .in('id', dayIds)
              .order('day_number', { ascending: true });

            sharedDays = daysData || [];
          }
        }

        // Add journey to guide's access list
        guideEntry.journeys.push({
          journey_id: share.journey_id,
          journey_name: share.journeys.journey_name,
          permission_level: share.permission_level,
          share_all_days: share.share_all_days,
          shared_days_count: sharedDaysCount,
          total_days_count: totalDaysCount || 0,
          shared_days: sharedDays,
        });
      }

      // Convert map to array and sort by guide name
      const guidesArray = Array.from(guidesMap.values()).sort((a, b) =>
        a.guide_name.localeCompare(b.guide_name)
      );

      setGuideAccess(guidesArray);
    } catch (error) {
      console.error('Error fetching guide access:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGuideExpansion = (guideId: string) => {
    const newExpanded = new Set(expandedGuides);
    if (newExpanded.has(guideId)) {
      newExpanded.delete(guideId);
    } else {
      newExpanded.add(guideId);
    }
    setExpandedGuides(newExpanded);
  };

  const filteredGuides = guideAccess.filter((guide) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      guide.guide_name.toLowerCase().includes(searchLower) ||
      guide.guide_email?.toLowerCase().includes(searchLower) ||
      guide.journeys.some(j => j.journey_name.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-brand-charcoal">Guide Journey Access</h2>
          <p className="text-brand-chocolate mt-1">
            View which guides have access to which journeys and their permission levels
          </p>
        </div>
        <button
          onClick={fetchGuideAccess}
          className="flex items-center gap-2 px-4 py-2 bg-brand-terracotta text-white rounded-lg hover:bg-brand-terracotta-light transition-colors shadow-soft font-semibold"
        >
          <Loader className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-brown-light w-5 h-5" />
        <input
          type="text"
          placeholder="Search guides or journeys..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent shadow-soft font-medium text-brand-charcoal"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader className="w-8 h-8 text-brand-terracotta animate-spin mb-3" />
          <p className="text-brand-chocolate font-medium">Loading guide access...</p>
        </div>
      ) : filteredGuides.length === 0 ? (
        <div className="text-center py-12 bg-brand-tan-light rounded-lg">
          {searchQuery ? (
            <>
              <Search className="w-12 h-12 text-brand-brown-light mx-auto mb-3" />
              <p className="text-brand-chocolate font-medium">No guides found matching your search</p>
            </>
          ) : (
            <>
              <AlertCircle className="w-12 h-12 text-brand-brown-light mx-auto mb-3" />
              <p className="text-brand-chocolate font-medium">No guides have access to any journeys yet</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGuides.map((guide) => (
            <div
              key={guide.guide_id}
              className="bg-white rounded-lg border border-brand-tan shadow-soft overflow-hidden"
            >
              <div
                onClick={() => toggleGuideExpansion(guide.guide_id)}
                className="p-4 cursor-pointer hover:bg-brand-beige-light transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <User className="w-5 h-5 text-brand-terracotta flex-shrink-0" />
                      <h3 className="text-lg font-bold text-brand-charcoal">
                        {guide.guide_name}
                        {!guide.has_user_account && (
                          <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">
                            No Account
                          </span>
                        )}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-brand-chocolate">
                      {guide.guide_email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {guide.guide_email}
                        </div>
                      )}
                      {guide.guide_phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {guide.guide_phone}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-brand-terracotta">
                        {guide.journeys.length}
                      </div>
                      <div className="text-xs text-brand-chocolate font-medium">
                        {guide.journeys.length === 1 ? 'Journey' : 'Journeys'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {expandedGuides.has(guide.guide_id) && (
                <div className="border-t border-brand-tan bg-brand-tan-light">
                  <div className="p-4 space-y-3">
                    {guide.journeys.map((journey) => (
                      <div
                        key={journey.journey_id}
                        className="bg-white rounded-lg border border-brand-tan p-4 shadow-soft"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-bold text-brand-charcoal mb-1">
                              {journey.journey_name}
                            </h4>
                            <div className="flex items-center gap-2">
                              {journey.permission_level === 'view' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                                  <Eye className="w-3 h-3" />
                                  Viewer
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                                  <Edit3 className="w-3 h-3" />
                                  Editor
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {journey.share_all_days ? (
                          <div className="flex items-center gap-2 text-sm text-brand-chocolate">
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">Access to all days ({journey.total_days_count} days)</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-brand-terracotta font-semibold">
                              <Calendar className="w-4 h-4" />
                              <span>
                                Access to {journey.shared_days_count} of {journey.total_days_count} days
                              </span>
                            </div>
                            {journey.shared_days.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {journey.shared_days.map((day) => (
                                  <div
                                    key={day.day_number}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-terracotta bg-opacity-10 text-sm"
                                  >
                                    <div className="font-bold text-brand-charcoal">
                                      Day {day.day_number}
                                    </div>
                                    <div className="flex items-center gap-1 text-brand-chocolate">
                                      <MapPin className="w-3 h-3" />
                                      {day.city_destination}
                                    </div>
                                    <div className="text-brand-brown-light text-xs">
                                      {new Date(day.date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric'
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && filteredGuides.length > 0 && (
        <div className="text-center text-sm text-brand-chocolate font-medium py-4">
          Showing {filteredGuides.length} {filteredGuides.length === 1 ? 'guide' : 'guides'} with journey access
        </div>
      )}
    </div>
  );
}
