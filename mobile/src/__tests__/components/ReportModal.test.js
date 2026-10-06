jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock('@tobeatraveller/shared', () => ({
  COLORS: jest.requireActual('../../../../shared/src/utils/constants/colors.js').COLORS,
  ...jest.requireActual('../../../../shared/src/utils/contentReports.js'),
  submitReport: jest.fn(),
}));

import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { submitReport } from '@tobeatraveller/shared';
import ReportModal from '../../components/ReportModal';

const renderModal = (onClose = jest.fn()) => {
  render(<ReportModal targetType="comment" targetId="comment-1" onClose={onClose} />);
  return onClose;
};

describe('ReportModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    submitReport.mockResolvedValue({});
  });

  it('cannot be sent until a reason is chosen', () => {
    renderModal();

    fireEvent.press(screen.getByText('report.submit'));

    expect(submitReport).not.toHaveBeenCalled();
  });

  it('sends the reason and the target, tells the person and closes', async () => {
    const onClose = renderModal();

    fireEvent.press(screen.getByText('report.reason.spam'));
    fireEvent.press(screen.getByText('report.submit'));

    await waitFor(() => expect(submitReport).toHaveBeenCalledWith({ targetType: 'comment', targetId: 'comment-1', reason: 'spam', details: '' }));
    expect(Alert.alert).toHaveBeenCalledWith('report.button', 'report.sent');
    expect(onClose).toHaveBeenCalled();
  });

  // The law asks that a notice about illegal content says why it is illegal.
  it('does not send illegal content without saying why', async () => {
    renderModal();

    fireEvent.press(screen.getByText('report.reason.illegal'));
    fireEvent.press(screen.getByText('report.submit'));
    expect(submitReport).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByLabelText('report.detailsLabelIllegal'), 'It sells counterfeit goods');
    fireEvent.press(screen.getByText('report.submit'));

    await waitFor(() => expect(submitReport).toHaveBeenCalledWith(expect.objectContaining({ reason: 'illegal', details: 'It sells counterfeit goods' })));
  });

  it('says why it could not be sent and stays open', async () => {
    submitReport.mockRejectedValue(new Error('You already reported this'));
    const onClose = renderModal();

    fireEvent.press(screen.getByText('report.reason.spam'));
    fireEvent.press(screen.getByText('report.submit'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('errors.somethingWrong', 'You already reported this'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
