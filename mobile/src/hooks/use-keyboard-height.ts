import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// Under Expo's edge-to-edge the window is adjustResize but the RN root view never
// actually resizes, so KeyboardAvoidingView-style solutions silently do nothing.
// Track the keyboard frame ourselves and let screens pad their bottom with it.
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    // Android's keyboardDidShow can be late/missed on the very first open of a
    // session (IME cold start); keyboardDidChangeFrame fires reliably and acts
    // as a backstop so the composer doesn't stay hidden behind the keyboard.
    const changeFrame =
      Platform.OS === 'android'
        ? Keyboard.addListener('keyboardDidChangeFrame', (e) => {
            if (e.endCoordinates.height > 0) setHeight(e.endCoordinates.height);
          })
        : null;

    return () => {
      show.remove();
      hide.remove();
      changeFrame?.remove();
    };
  }, []);

  return height;
}
