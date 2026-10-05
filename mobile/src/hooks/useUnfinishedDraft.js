import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { draftToResume, ITINERARY_DRAFT_KINDS } from '@tobeatraveller/shared';
import { readItineraryDraft } from '../utils/itineraryDraftStorage';

const DRAFT_SCREENS = {
  [ITINERARY_DRAFT_KINDS.FORM]: 'CreateItinerary',
  [ITINERARY_DRAFT_KINDS.AI_PLAN]: 'PlanExperience',
};

// The trip they left half done on this phone, with the screen to pick it up
// in. On every focus: the draft changes in the form screens, which the Home
// stays under.
export const useUnfinishedDraft = (userId) => {
  const [draft, setDraft] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return undefined;
      let cancelled = false;
      Promise.all([
        readItineraryDraft(userId, ITINERARY_DRAFT_KINDS.FORM),
        readItineraryDraft(userId, ITINERARY_DRAFT_KINDS.AI_PLAN),
      ]).then(([form, plan]) => {
        if (cancelled) return;
        const resume = draftToResume({ form, plan });
        setDraft(resume && { ...resume, screen: DRAFT_SCREENS[resume.kind] });
      });
      return () => { cancelled = true; };
    }, [userId])
  );

  return draft;
};
