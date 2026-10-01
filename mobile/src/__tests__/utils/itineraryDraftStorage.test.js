jest.mock('@tobeatraveller/shared', () => jest.requireActual('../../../../shared/src/utils/itineraryDraft.js'));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ITINERARY_DRAFT_KINDS, itineraryDraftKey, serializeItineraryDraft } from '@tobeatraveller/shared';
import {
  clearAllItineraryDrafts,
  clearItineraryDraft,
  readItineraryDraft,
  saveItineraryDraft,
} from '../../utils/itineraryDraftStorage';

const draft = { values: { title: 'Ruta por Portugal', destination: { name: 'Lisboa' }, places: [] }, days: [1], step: 0 };

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

it('gives back the draft that was saved for that account', async () => {
  await saveItineraryDraft('user-1', draft);

  expect(await readItineraryDraft('user-1')).toMatchObject({ values: draft.values, days: [1] });
});

it('never offers one account the draft of another', async () => {
  await saveItineraryDraft('user-1', draft);

  expect(await readItineraryDraft('user-2')).toBeNull();
});

it('forgets a draft once it is cleared', async () => {
  await saveItineraryDraft('user-1', draft);

  await clearItineraryDraft('user-1');

  expect(await readItineraryDraft('user-1')).toBeNull();
});

it('is no draft when what is stored is damaged', async () => {
  await AsyncStorage.setItem(itineraryDraftKey('user-1'), '{not json');

  expect(await readItineraryDraft('user-1')).toBeNull();
});

// Regression-in-waiting: the next person on this phone must not find a trip the previous one was writing.
it('removes the drafts of every account on signing out, and nothing else', async () => {
  await saveItineraryDraft('user-1', draft);
  await saveItineraryDraft('user-2', draft);
  await AsyncStorage.setItem('some-other-setting', 'kept');

  await clearAllItineraryDrafts();

  expect(await readItineraryDraft('user-1')).toBeNull();
  expect(await readItineraryDraft('user-2')).toBeNull();
  expect(await AsyncStorage.getItem('some-other-setting')).toBe('kept');
});

it('keeps the draft of the form apart from the one of the AI plan', async () => {
  await saveItineraryDraft('user-1', draft, ITINERARY_DRAFT_KINDS.AI_PLAN);

  expect(await readItineraryDraft('user-1', ITINERARY_DRAFT_KINDS.AI_PLAN)).not.toBeNull();
  expect(await readItineraryDraft('user-1', ITINERARY_DRAFT_KINDS.FORM)).toBeNull();
  expect(await readItineraryDraft('user-1')).toBeNull();
});

it('forgets only the kind that is cleared', async () => {
  await saveItineraryDraft('user-1', draft);
  await saveItineraryDraft('user-1', draft, ITINERARY_DRAFT_KINDS.AI_PLAN);

  await clearItineraryDraft('user-1', ITINERARY_DRAFT_KINDS.AI_PLAN);

  expect(await readItineraryDraft('user-1')).not.toBeNull();
  expect(await readItineraryDraft('user-1', ITINERARY_DRAFT_KINDS.AI_PLAN)).toBeNull();
});

it('removes the drafts of both kinds on signing out', async () => {
  await saveItineraryDraft('user-1', draft);
  await saveItineraryDraft('user-1', draft, ITINERARY_DRAFT_KINDS.AI_PLAN);

  await clearAllItineraryDrafts();

  expect(await readItineraryDraft('user-1')).toBeNull();
  expect(await readItineraryDraft('user-1', ITINERARY_DRAFT_KINDS.AI_PLAN)).toBeNull();
});

// Regression-in-waiting: it stopped being offered after 30 days but stayed on the phone, against what the policy says.
it('removes a draft that is too old from the phone, not only stops offering it', async () => {
  const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
  await AsyncStorage.setItem(itineraryDraftKey('user-1'), serializeItineraryDraft(draft, old));

  expect(await readItineraryDraft('user-1')).toBeNull();
  expect(await AsyncStorage.getItem(itineraryDraftKey('user-1'))).toBeNull();
});

it('removes a damaged draft from the phone', async () => {
  await AsyncStorage.setItem(itineraryDraftKey('user-1'), '{not json');

  await readItineraryDraft('user-1');

  expect(await AsyncStorage.getItem(itineraryDraftKey('user-1'))).toBeNull();
});

it('keeps a draft that is recent enough', async () => {
  const recent = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
  await AsyncStorage.setItem(itineraryDraftKey('user-1'), serializeItineraryDraft(draft, recent));

  expect(await readItineraryDraft('user-1')).not.toBeNull();
  expect(await AsyncStorage.getItem(itineraryDraftKey('user-1'))).not.toBeNull();
});

// Last: it makes the storage fail, and the test storage cannot be put back afterwards.
it('neither saving nor reading breaks the screen when the storage fails', async () => {
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(new Error('disk full'));
  jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('unavailable'));

  await expect(saveItineraryDraft('user-1', draft)).resolves.toBeUndefined();
  expect(await readItineraryDraft('user-1')).toBeNull();
});
