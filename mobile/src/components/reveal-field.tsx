import type { ReactNode } from 'react';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

/**
 * Reveals a form step once the one before it has been filled.
 *
 * Uses Reanimated's layout animations rather than an animated height: measuring
 * and animating height on native means a JS round trip per frame, while
 * `LinearTransition` lets the native side interpolate the layout change itself.
 * Siblings below shift smoothly because they carry the same transition.
 *
 * Everything already entered stays visible and editable — this shortens how
 * much of the form is on screen at once, it does not turn it into a wizard that
 * traps someone who needs to go back.
 */
export function RevealField({ show, children }: { readonly show: boolean; readonly children: ReactNode }) {
  if (!show) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(260).springify().damping(18)}
      exiting={FadeOut.duration(140)}
      layout={LinearTransition.duration(220)}
    >
      {children}
    </Animated.View>
  );
}
