import { RefreshControl, RefreshControlProps } from 'react-native';
import { useColorScheme } from 'nativewind';

// RefreshControl matching the app theme instead of the stock Android green spinner.
export function ThemedRefreshControl(props: RefreshControlProps) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const foreground = dark ? '#f5f5f5' : '#0a0a0a';

  return (
    <RefreshControl
      tintColor={foreground}
      colors={[foreground]}
      progressBackgroundColor={dark ? '#171717' : '#ffffff'}
      {...props}
    />
  );
}
