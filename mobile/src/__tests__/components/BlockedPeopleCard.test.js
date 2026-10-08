import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock('@tobeatraveller/shared', () => ({ getBlockedUsers: jest.fn(), unblockUser: jest.fn() }));

import { getBlockedUsers, unblockUser } from '@tobeatraveller/shared';
import BlockedPeopleCard from '../../components/BlockedPeopleCard';

const OTHER = { id: 'user-2', username: 'otherwalker' };

const renderCard = async () => {
  render(<BlockedPeopleCard />);
  await act(async () => {});
};

describe('BlockedPeopleCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('says so when nobody is blocked', async () => {
    getBlockedUsers.mockResolvedValue([]);

    await renderCard();

    expect(screen.getByText('settings.blockedPeopleEmpty')).toBeTruthy();
  });

  it('lists who is blocked and unblocks them from there', async () => {
    getBlockedUsers.mockResolvedValue([OTHER]);
    unblockUser.mockResolvedValue(null);
    await renderCard();

    await act(async () => { fireEvent.press(screen.getByLabelText('block.unblockButton @otherwalker')); });

    expect(unblockUser).toHaveBeenCalledWith('user-2');
    expect(screen.queryByText('@otherwalker')).toBeNull();
  });

  it('keeps them listed and says so when the unblock fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    getBlockedUsers.mockResolvedValue([OTHER]);
    unblockUser.mockRejectedValue(new Error('down'));
    await renderCard();

    await act(async () => { fireEvent.press(screen.getByLabelText('block.unblockButton @otherwalker')); });

    expect(alertSpy).toHaveBeenCalledWith('errors.somethingWrong', 'block.error');
    expect(screen.getByText('@otherwalker')).toBeTruthy();
  });

  it('shows an error when the list cannot be loaded', async () => {
    getBlockedUsers.mockRejectedValue(new Error('down'));

    await renderCard();

    expect(screen.getByText('block.listError')).toBeTruthy();
  });
});
