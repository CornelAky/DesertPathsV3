import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '../lib/logger';

interface UseJourneySyncOptions {
  journeyId: string;
  onDataChange?: () => void;
  enabled?: boolean;
}

export function useJourneySync({ journeyId, onDataChange, enabled = true }: UseJourneySyncOptions) {
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const onDataChangeRef = useRef(onDataChange);
  const isSubscribingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    onDataChangeRef.current = onDataChange;
  }, [onDataChange]);

  const handleChange = useCallback(() => {
    if (onDataChangeRef.current && isMountedRef.current) {
      onDataChangeRef.current();
    }
  }, []);

  const cleanupChannels = useCallback(async () => {
    const channels = channelsRef.current;
    if (channels.length === 0) return;

    logger.debug('Cleaning up realtime channels', { count: channels.length, journeyId });

    const cleanupPromises = channels.map(async (channel) => {
      try {
        await supabase.removeChannel(channel);
      } catch (error) {
        logger.error('Error removing channel', error as Error);
      }
    });

    await Promise.all(cleanupPromises);
    channelsRef.current = [];
  }, [journeyId]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !journeyId || isSubscribingRef.current) {
      return;
    }

    const setupRealtimeSubscriptions = async () => {
      if (!isMountedRef.current) return;

      isSubscribingRef.current = true;

      try {
        await cleanupChannels();

        const { data: days, error: daysError } = await supabase
          .from('itinerary_days')
          .select('id')
          .eq('journey_id', journeyId);

        if (daysError) throw daysError;

        if (!days || days.length === 0 || !isMountedRef.current) {
          isSubscribingRef.current = false;
          return;
        }

        const dayIds = days.map(d => d.id);
        const tables = ['accommodations', 'activities', 'dining', 'transportation'];
        const channels: RealtimeChannel[] = [];

        tables.forEach(tableName => {
          if (!isMountedRef.current) return;

          const channel = supabase
            .channel(`${tableName}_changes_${journeyId}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: tableName,
                filter: `day_id=in.(${dayIds.join(',')})`
              },
              (payload) => {
                logger.debug(`${tableName} change detected`, { eventType: payload.eventType, journeyId });
                handleChange();
              }
            )
            .subscribe();

          channels.push(channel);
        });

        if (!isMountedRef.current) {
          channels.forEach(ch => supabase.removeChannel(ch));
          isSubscribingRef.current = false;
          return;
        }

        const itineraryDaysChannel = supabase
          .channel(`itinerary_days_changes_${journeyId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'itinerary_days',
              filter: `journey_id=eq.${journeyId}`
            },
            (payload) => {
              logger.debug('itinerary_days change detected', { eventType: payload.eventType, journeyId });
              handleChange();
            }
          )
          .subscribe();

        channels.push(itineraryDaysChannel);

        const itineraryEntriesChannel = supabase
          .channel(`itinerary_entries_changes_${journeyId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'itinerary_entries',
              filter: `journey_id=eq.${journeyId}`
            },
            (payload) => {
              logger.debug('itinerary_entries change detected', { eventType: payload.eventType, journeyId });
              handleChange();
            }
          )
          .subscribe();

        channels.push(itineraryEntriesChannel);

        if (isMountedRef.current) {
          channelsRef.current = channels;
          logger.info('Realtime subscriptions established', { count: channels.length, journeyId });
        } else {
          channels.forEach(ch => supabase.removeChannel(ch));
        }
      } catch (error) {
        logger.error('Error setting up realtime subscriptions', error as Error, { journeyId });
      } finally {
        isSubscribingRef.current = false;
      }
    };

    setupRealtimeSubscriptions();

    return () => {
      cleanupChannels();
    };
  }, [journeyId, enabled, handleChange, cleanupChannels]);

  return {
    triggerRefresh: handleChange
  };
}
