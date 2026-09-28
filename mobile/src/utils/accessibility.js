// A screen reader treats a tappable card as a single button, so a button
// inside it (follow, like, share) can't be reached on its own. It's offered
// as one of the card's actions too (swipe up or down with VoiceOver).
export const cardInnerActions = (actions) => {
  const available = actions.filter(Boolean);
  if (available.length === 0) return {};
  return {
    accessibilityActions: available.map(({ name, label }) => ({ name, label })),
    onAccessibilityAction: ({ nativeEvent }) => available.find(action => action.name === nativeEvent.actionName)?.onPress(),
  };
};
