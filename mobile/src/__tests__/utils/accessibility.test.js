import { cardInnerActions } from '../../utils/accessibility';

describe('cardInnerActions', () => {
  it('offers the inner buttons as the card\'s actions and runs the one chosen', () => {
    const follow = jest.fn();
    const props = cardInnerActions([{ name: 'follow', label: 'Seguir', onPress: follow }]);

    props.onAccessibilityAction({ nativeEvent: { actionName: 'follow' } });

    expect(props.accessibilityActions).toEqual([{ name: 'follow', label: 'Seguir' }]);
    expect(follow).toHaveBeenCalled();
  });

  it('leaves out an action that does not apply, such as following yourself', () => {
    expect(cardInnerActions([false])).toEqual({});
  });
});
