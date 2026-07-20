import { LucideIcon } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ActionSheetOption {
  label: string;
  icon?: LucideIcon;
  destructive?: boolean;
  onPress: () => void;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  options: ActionSheetOption[];
}

export function ActionSheet({ visible, onClose, title, options }: Props) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      slide.setValue(0);
      Animated.timing(slide, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slide]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [320, 0] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Animated.View style={{ transform: [{ translateY }] }}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              className="rounded-t-3xl bg-white px-4 pt-3 dark:bg-neutral-900"
              style={{ paddingBottom: insets.bottom + 12 }}
            >
              <View className="mb-3 h-1 w-10 self-center rounded-full bg-neutral-300 dark:bg-neutral-700" />

              {title && (
                <Text className="mb-1 px-2 py-1 text-[13px] font-sans-medium text-neutral-500">
                  {title}
                </Text>
              )}

              {options.map(({ label, icon: Icon, destructive, onPress }) => (
                <Pressable
                  key={label}
                  className="flex-row items-center gap-3 rounded-2xl px-3 py-3.5 active:bg-neutral-100 dark:active:bg-neutral-800"
                  onPress={() => {
                    onClose();
                    // Let the sheet dismiss before the action runs (avoids Modal-on-Modal jank).
                    setTimeout(onPress, 120);
                  }}
                >
                  {Icon && <Icon size={20} color={destructive ? '#ef4444' : '#71767b'} />}
                  <Text
                    className={
                      destructive
                        ? 'text-[16px] font-sans-semibold text-red-500'
                        : 'text-[16px] font-sans-semibold text-neutral-900 dark:text-neutral-50'
                    }
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}

              <Pressable
                className="mt-2 items-center rounded-2xl border border-neutral-200 py-3.5 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
                onPress={onClose}
              >
                <Text className="text-[16px] font-sans-semibold text-neutral-900 dark:text-neutral-50">
                  Vazgeç
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
