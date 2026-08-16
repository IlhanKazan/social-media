import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, TextInputProps, View, useColorScheme } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ReduceMotion,
} from 'react-native-reanimated';
import { Eye, EyeOff } from 'lucide-react-native';

const AnimatedText = Animated.createAnimatedComponent(Text);

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  error?: string;
  label?: string;
} & TextInputProps;

/**
 * Text field with a label that rises into the border and a box that reacts to
 * focus and to failure.
 *
 * Driven by Reanimated shared values rather than React state: these run on the
 * UI thread, so the border keeps animating while the JS thread is busy
 * validating or submitting — the moment a state-driven version would stutter.
 *
 * The label sits inside the field until there is something to show above it,
 * which keeps the form short on a phone screen without losing the label the way
 * a placeholder-only field does.
 */
export function FormInput<T extends FieldValues>({
  control,
  name,
  error,
  label,
  secureTextEntry,
  ...inputProps
}: Props<T>) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const dark = useColorScheme() === 'dark';

  const focus = useSharedValue(0);
  const invalid = useSharedValue(0);
  const shake = useSharedValue(0);

  useEffect(() => {
    invalid.value = withTiming(error ? 1 : 0, { duration: 160 });
    if (error) {
      // Two small passes, not a long wobble: enough to draw the eye back to the
      // field that failed without turning an error into a performance.
      shake.value = withSequence(
        withTiming(-4, { duration: 45, reduceMotion: ReduceMotion.Never }),
        withRepeat(withTiming(4, { duration: 90 }), 2, true),
        withTiming(0, { duration: 45 })
      );
    }
  }, [error, invalid, shake]);

  const borderIdle = dark ? '#404040' : '#e5e5e5';
  const surfaceIdle = dark ? '#171717' : '#fafafa';
  const surfaceActive = dark ? '#0a0a0a' : '#ffffff';

  const boxStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
    borderColor: interpolateColor(
      Math.max(focus.value, invalid.value),
      [0, 1],
      [borderIdle, invalid.value > 0 ? '#ef4444' : '#208AEF']
    ),
    backgroundColor: interpolateColor(focus.value, [0, 1], [surfaceIdle, surfaceActive]),
  }));

  const floated = useDerivedValue(() => focus.value);
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      Math.max(floated.value, invalid.value),
      [0, 1],
      [dark ? '#a3a3a3' : '#737373', invalid.value > 0 ? '#ef4444' : '#208AEF']
    ),
  }));

  const secure = secureTextEntry && !revealed;

  return (
    <View className="mt-4">
      {label && (
        <AnimatedText style={labelStyle} className="mb-1.5 text-sm font-sans-medium">
          {label}
        </AnimatedText>
      )}

      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <Animated.View
            style={boxStyle}
            className="flex-row items-center rounded-xl border-2 px-4"
          >
            <TextInput
              className="flex-1 py-3.5 text-[16px] text-neutral-900 dark:text-neutral-50"
              placeholderTextColor={dark ? '#525252' : '#a3a3a3'}
              onBlur={() => {
                setFocused(false);
                focus.value = withTiming(0, { duration: 180 });
                onBlur();
              }}
              onFocus={() => {
                setFocused(true);
                focus.value = withTiming(1, { duration: 180 });
              }}
              onChangeText={onChange}
              value={value}
              secureTextEntry={secure}
              {...inputProps}
            />

            {secureTextEntry && (
              // Typing a password blind on a phone is the usual cause of a failed
              // sign-in, so the field offers to show it.
              <Pressable
                onPress={() => setRevealed((v) => !v)}
                hitSlop={10}
                accessibilityRole="button"
                className="ml-2 active:opacity-60"
              >
                {revealed ? (
                  <EyeOff size={18} color={dark ? '#a3a3a3' : '#737373'} />
                ) : (
                  <Eye size={18} color={dark ? '#a3a3a3' : '#737373'} />
                )}
              </Pressable>
            )}
          </Animated.View>
        )}
      />

      {error && <Text className="mt-1.5 text-sm text-red-500">{error}</Text>}
      {!error && focused && inputProps.maxLength ? (
        <Text className="mt-1.5 text-right text-xs text-neutral-400">
          {String(inputProps.value ?? '').length}/{inputProps.maxLength}
        </Text>
      ) : null}
    </View>
  );
}
