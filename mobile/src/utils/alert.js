import { Alert, Platform } from 'react-native';

// Alert.alert does nothing on react-native-web, so on the web the browser dialogs stand in.
// Same signature as Alert.alert; with several buttons, the one that is not 'cancel' is the confirm.
export const showAlert = (title, message, buttons) => {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  const text = message ? `${title}\n\n${message}` : title;
  const confirmButton = buttons?.find((button) => button.style !== 'cancel');
  if (buttons?.length > 1) {
    if (window.confirm(text)) confirmButton?.onPress?.();
    return;
  }
  window.alert(text);
  confirmButton?.onPress?.();
};
