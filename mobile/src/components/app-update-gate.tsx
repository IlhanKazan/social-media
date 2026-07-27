import * as Application from 'expo-application';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { useMobileVersionCheck } from '@/features/app-update/queries';

const installedVersionCode = Number.parseInt(Application.nativeBuildVersion ?? '0', 10) || 0;

export function AppUpdateGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { data } = useMobileVersionCheck();
  const [dismissed, setDismissed] = useState(false);

  const openApk = (url: string) => {
    if (url) void WebBrowser.openBrowserAsync(url);
  };

  if (data && data.minSupportedVersionCode > 0 && installedVersionCode < data.minSupportedVersionCode) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-white px-8 dark:bg-neutral-950">
        <Text className="text-center text-xl font-sans-bold text-neutral-900 dark:text-neutral-50">
          {t('appUpdate.requiredTitle')}
        </Text>
        <Text className="text-center text-[15px] text-neutral-500">{t('appUpdate.requiredBody')}</Text>
        <Pressable
          className="mt-2 rounded-xl bg-primary px-6 py-3 active:opacity-80"
          onPress={() => openApk(data.apkUrl)}
        >
          <Text className="font-sans-semibold text-white">{t('appUpdate.updateButton')}</Text>
        </Pressable>
      </View>
    );
  }

  const showSoftNudge =
    !dismissed && data && data.latestVersionCode > 0 && installedVersionCode < data.latestVersionCode;

  return (
    <View className="flex-1">
      {children}
      {showSoftNudge && (
        <View className="absolute inset-x-4 bottom-6 flex-row items-center justify-between rounded-2xl bg-neutral-900 px-4 py-3 shadow-lg dark:bg-neutral-100">
          <Text className="flex-1 pr-3 text-sm font-sans-medium text-white dark:text-neutral-900">
            {t('appUpdate.availableBanner', { version: data.latestVersionName })}
          </Text>
          <Pressable className="mr-2 active:opacity-70" onPress={() => openApk(data.apkUrl)}>
            <Text className="font-sans-bold text-sm text-primary">{t('appUpdate.updateButton')}</Text>
          </Pressable>
          <Pressable className="active:opacity-70" onPress={() => setDismissed(true)}>
            <Text className="text-sm text-neutral-400">{t('appUpdate.dismiss')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
