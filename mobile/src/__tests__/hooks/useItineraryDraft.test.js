import { act, renderHook } from '@testing-library/react-native';

jest.mock('../../utils/itineraryDraftStorage', () => ({
  readItineraryDraft: jest.fn().mockResolvedValue(null),
  saveItineraryDraft: jest.fn(),
  clearItineraryDraft: jest.fn(),
}));

import { clearItineraryDraft, saveItineraryDraft } from '../../utils/itineraryDraftStorage';
import { useItineraryDraft } from '../../hooks/useItineraryDraft';

const draft = { values: { title: 'Ruta por Portugal' }, days: [1], step: 0 };

const renderDraft = async () => {
  const hook = renderHook(() => useItineraryDraft('user-1'));
  await act(async () => {});
  return hook;
};

describe('useItineraryDraft', () => {
  beforeEach(() => jest.clearAllMocks());

  // Regression: the form stayed on screen while the published trip's page opened, kept autosaving,
  // and the trip came back as "unfinished".
  it('does not save again once the trip is published', async () => {
    const { result } = await renderDraft();

    act(() => result.current.finish());
    act(() => result.current.save(draft));

    expect(clearItineraryDraft).toHaveBeenCalledWith('user-1', undefined);
    expect(saveItineraryDraft).not.toHaveBeenCalled();
  });

  it('keeps saving after a draft was merely cleared, since the person can start writing again', async () => {
    const { result } = await renderDraft();

    act(() => result.current.clear());
    act(() => result.current.save(draft));

    expect(saveItineraryDraft).toHaveBeenCalledWith('user-1', draft, undefined);
  });
});
