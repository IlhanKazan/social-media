import { Pressable, useColorScheme, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const TRACK_WIDTH = 50;
const TRACK_HEIGHT = 30;
const KNOB = 24;
const TRAVEL = TRACK_WIDTH - KNOB - 6;

/**
 * On/off switch drawn in-app rather than delegated to the platform.
 *
 * React Native's `Switch` renders the OEM control, so it takes the vendor's
 * colours and shape — on MIUI that is a different accent and a different
 * geometry from the rest of the app, which is what made the settings screen
 * look assembled from parts.
 *
 * The knob is sprung and the track cross-fades, both on the UI thread, so it
 * stays smooth while the preference mutation is in flight. It also reports
 * state to assistive technology through the pressable's accessibility props,
 * which a hand-rolled toggle usually drops.
 */
export function Toggle({
  value,
  onValueChange,
  disabled,
}: {
  readonly value: boolean;
  readonly onValueChange: (next: boolean) => void;
  readonly disabled?: boolean;
}) {
  const dark = useColorScheme() === 'dark';
  const progress = useDerivedValue(() => withSpring(value ? 1 : 0, { damping: 18, stiffness: 220 }));

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [dark ? '#3f3f46' : '#d4d4d8', '#208AEF']
    ),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TRAVEL }],
  }));

  const dimStyle = useAnimatedStyle(() => ({
    opacity: withTiming(disabled ? 0.5 : 1, { duration: 150 }),
  }));

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
    >
      <Animated.View style={dimStyle}>
        <Animated.View
          style={[
            trackStyle,
            { width: TRACK_WIDTH, height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2, padding: 3 },
          ]}
        >
          <Animated.View style={knobStyle}>
            <View
              style={{
                width: KNOB,
                height: KNOB,
                borderRadius: KNOB / 2,
                backgroundColor: '#ffffff',
                shadowColor: '#000',
                shadowOpacity: 0.18,
                shadowRadius: 2,
                shadowOffset: { width: 0, height: 1 },
                elevation: 2,
              }}
            />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
