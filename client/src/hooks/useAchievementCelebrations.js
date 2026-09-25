import { useCallback, useEffect, useRef, useState } from "react";
import { isSameMoment, pickCelebrations, rememberCelebrations } from "@tobeatraveller/shared";
import { fetchNotifications } from "../services/notifications";
import { getCelebratedNotifications, setCelebratedNotifications } from "../utils/celebratedNotifications";

const NO_CELEBRATIONS = { queue: [], shown: 0 };

// New badges and countries are granted in the background after saving, and
// arrive as notifications: each new unread one is celebrated on screen once
// in this browser. Checked whenever the unread count changes.
export const useAchievementCelebrations = (userId, unreadCount) => {
  const [state, setState] = useState(NO_CELEBRATIONS);
  // Moments whose card the user opened from their notification: already on
  // screen, so celebrating them on top would stack two screens.
  const skippedMoments = useRef([]);
  const isSkipped = (celebration) => skippedMoments.current.some(moment => isSameMoment(moment, celebration.moment));

  useEffect(() => {
    if (!userId) setState(NO_CELEBRATIONS);
  }, [userId]);

  useEffect(() => {
    if (!userId || unreadCount === 0) return undefined;
    let cancelled = false;

    fetchNotifications(1)
      .then(({ notifications }) => {
        if (cancelled) return;
        const celebrated = getCelebratedNotifications();
        const picked = pickCelebrations(notifications, celebrated);
        if (picked.length === 0) return;
        setCelebratedNotifications(rememberCelebrations(celebrated, picked.map(celebration => celebration.notificationId)));
        const toShow = picked.filter(celebration => !isSkipped(celebration));
        if (toShow.length > 0) {
          setState(current => ({
            ...current,
            queue: [...current.queue, ...toShow.filter(celebration => !current.queue.some(queued => queued.notificationId === celebration.notificationId))],
          }));
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [userId, unreadCount]);

  const dismiss = useCallback(() => {
    setState(current => (current.queue.length > 1 ? { queue: current.queue.slice(1), shown: current.shown + 1 } : NO_CELEBRATIONS));
  }, []);

  const dismissAll = useCallback(() => setState(NO_CELEBRATIONS), []);

  const skip = useCallback((moment) => {
    skippedMoments.current = [...skippedMoments.current, moment];
    setState((current) => {
      const queue = current.queue.filter(celebration => !isSameMoment(celebration.moment, moment));
      if (queue.length === current.queue.length) return current;
      return queue.length > 0 ? { ...current, queue } : NO_CELEBRATIONS;
    });
  }, []);

  return {
    celebration: state.queue[0] ?? null,
    position: state.shown + 1,
    total: state.shown + state.queue.length,
    dismiss,
    dismissAll,
    skip,
  };
};
