import React from 'react';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';

// Make Inter the app-wide default without touching every <Text>. RN's Text/TextInput
// are forwardRef components, so their render fn lives on `.render`; we prepend a default
// fontFamily so any explicit style (e.g. a font-sans-bold className) still wins.
const DEFAULT_FONT = 'Inter_400Regular';

function patch(Component: unknown) {
  const comp = Component as { render?: (...args: unknown[]) => React.ReactElement | null; __fontPatched?: boolean };
  if (!comp || typeof comp.render !== 'function' || comp.__fontPatched) return;
  const original = comp.render;
  comp.render = function patchedRender(...args: unknown[]) {
    const element = original.apply(this, args);
    if (!element) return element;
    return React.cloneElement(element, {
      style: [{ fontFamily: DEFAULT_FONT }, (element.props as { style?: unknown }).style],
    } as Partial<typeof element.props>);
  };
  comp.__fontPatched = true;
}

patch(RNText);
patch(RNTextInput);
