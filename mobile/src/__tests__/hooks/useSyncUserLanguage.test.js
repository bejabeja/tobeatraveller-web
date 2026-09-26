jest.mock('@tobeatraveller/shared', () => ({ updateMyLanguage: jest.fn() }));

import { renderHook, waitFor } from '@testing-library/react-native';
import { updateMyLanguage } from '@tobeatraveller/shared';
import { useSyncUserLanguage } from '../../hooks/useSyncUserLanguage';

describe('useSyncUserLanguage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updateMyLanguage.mockResolvedValue();
  });

  it("saves the app's language for the signed-in user, and again when it changes", async () => {
    const { rerender } = renderHook(({ language }) => useSyncUserLanguage('user-1', language), { initialProps: { language: 'es' } });
    await waitFor(() => expect(updateMyLanguage).toHaveBeenCalledWith('es'));

    rerender({ language: 'en' });

    await waitFor(() => expect(updateMyLanguage).toHaveBeenLastCalledWith('en'));
  });

  it('does nothing while signed out', () => {
    renderHook(() => useSyncUserLanguage(null, 'es'));

    expect(updateMyLanguage).not.toHaveBeenCalled();
  });
});
