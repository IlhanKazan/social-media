import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import * as WebBrowser from 'expo-web-browser';
import { Stack } from 'expo-router';
import { ChevronRight, Languages, LogOut, Monitor, Moon, ShieldAlert, Sun } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Toggle } from '@/components/toggle';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useMobileVersionCheck } from '@/features/app-update/queries';
import { useMe } from '@/features/profile/queries';
import {
  useChangePassword,
  useDeleteAccount,
  useLogoutAll,
  useNotificationPreferences,
  useSendVerification,
  useUpdateNotificationPreferences,
} from '@/features/settings/queries';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { WEB_URL } from '@/lib/env';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguageStore, type LanguageMode } from '@/stores/language-store';
import { useThemeStore, type ThemeMode } from '@/stores/theme-store';
import type { NotificationPreferences } from '@/types/api';

const LEGAL_PATHS = ['/about', '/privacy', '/terms'] as const;

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View className="border-b border-neutral-100 px-4 py-5 dark:border-neutral-800">
      <Text className="text-lg font-sans-bold text-neutral-900 dark:text-neutral-50">{title}</Text>
      {subtitle && <Text className="mt-0.5 text-sm text-neutral-500">{subtitle}</Text>}
      <View className="mt-4">{children}</View>
    </View>
  );
}

const PREF_KEYS: (keyof NotificationPreferences)[] = [
  'likes',
  'reposts',
  'follows',
  'replies',
  'mentions',
  'recommendations',
];

function NotificationPreferencesControls() {
  const { t } = useTranslation();
  const { data: prefs } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  if (!prefs) return null;

  return (
    <View>
      {PREF_KEYS.map((key) => (
        <View key={key} className="flex-row items-center justify-between py-1.5">
          <Text className="text-[15px] text-neutral-900 dark:text-neutral-50">
            {t(`notificationPreferences.${key}`)}
          </Text>
          <Toggle
            value={prefs[key]}
            onValueChange={(value) => update.mutate({ ...prefs, [key]: value })}
            disabled={update.isPending}
          />
        </View>
      ))}
    </View>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { data: me } = useMe();
  const keyboardHeight = useKeyboardHeight();
  const logout = useAuthStore((s) => s.logout);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const languageMode = useLanguageStore((s) => s.mode);
  const setLanguageMode = useLanguageStore((s) => s.setMode);

  const THEME_OPTIONS: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
    { mode: 'light', label: t('settings.appearance.light'), Icon: Sun },
    { mode: 'dark', label: t('settings.appearance.dark'), Icon: Moon },
    { mode: 'system', label: t('settings.appearance.system'), Icon: Monitor },
  ];

  const LANGUAGE_OPTIONS: { mode: LanguageMode; label: string }[] = [
    { mode: 'tr', label: t('settings.language.turkish') },
    { mode: 'en', label: t('settings.language.english') },
  ];

  const LEGAL_LINKS = [
    { label: t('settings.legal.about'), path: '/about' },
    { label: t('settings.legal.privacy'), path: '/privacy' },
    { label: t('settings.legal.terms'), path: '/terms' },
  ] satisfies { label: string; path: (typeof LEGAL_PATHS)[number] }[];

  const sendVerification = useSendVerification();
  const changePassword = useChangePassword();
  const logoutAll = useLogoutAll();
  const deleteAccount = useDeleteAccount();
  const { refetch: refetchVersion, isFetching: checkingVersion } = useMobileVersionCheck();
  const [checkingOta, setCheckingOta] = useState(false);

  const checkAppUpdate = async () => {
    const { data } = await refetchVersion();
    if (!data) return;
    const installed = Number.parseInt(Application.nativeBuildVersion ?? '0', 10) || 0;
    if (data.latestVersionCode > installed) {
      Alert.alert(
        t('settings.updates.title'),
        t('settings.updates.updateAvailable', { version: data.latestVersionName }),
        [
          { text: t('settings.dangerZone.cancel'), style: 'cancel' },
          { text: t('appUpdate.updateButton'), onPress: () => void WebBrowser.openBrowserAsync(data.apkUrl) },
        ]
      );
    } else {
      Alert.alert(t('settings.updates.title'), t('settings.updates.upToDate'));
    }
  };

  const checkOtaUpdate = async () => {
    if (!Updates.isEnabled) {
      Alert.alert(t('settings.updates.title'), t('settings.updates.otaUpToDate'));
      return;
    }
    setCheckingOta(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        Alert.alert(t('settings.updates.title'), t('settings.updates.otaUpToDate'));
        return;
      }
      await Updates.fetchUpdateAsync();
      Alert.alert(t('settings.updates.otaReadyTitle'), t('settings.updates.otaReadyBody'), [
        { text: t('settings.updates.otaLater'), style: 'cancel' },
        { text: t('settings.updates.otaRestart'), onPress: () => void Updates.reloadAsync() },
      ]);
    } catch {
      Alert.alert(t('settings.updates.title'), t('settings.updates.otaError'));
    } finally {
      setCheckingOta(false);
    }
  };

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const submitPassword = () => {
    if (newPassword.length < 6) {
      Alert.alert(t('settings.changePassword.weakPasswordTitle'), t('settings.changePassword.weakPasswordBody'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('settings.changePassword.mismatchTitle'), t('settings.changePassword.mismatchBody'));
      return;
    }
    if (oldPassword === newPassword) {
      Alert.alert(t('settings.changePassword.sameTitle'), t('settings.changePassword.sameBody'));
      return;
    }
    changePassword.mutate({ oldPassword, newPassword });
  };

  const confirmLogoutAll = () =>
    Alert.alert(t('settings.session.signOutAllConfirmTitle'), t('settings.session.signOutAllConfirmBody'), [
      { text: t('settings.session.cancel'), style: 'cancel' },
      { text: t('settings.session.confirmSignOutAll'), style: 'destructive', onPress: () => logoutAll.mutate() },
    ]);

  const confirmDelete = () =>
    Alert.alert(t('settings.dangerZone.deleteConfirmTitle'), t('settings.dangerZone.deleteConfirmBody'), [
      { text: t('settings.dangerZone.cancel'), style: 'cancel' },
      { text: t('settings.dangerZone.confirmDelete'), style: 'destructive', onPress: () => deleteAccount.mutate() },
    ]);

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <Stack.Screen options={{ title: t('settings.title'), headerShown: true }} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: keyboardHeight + 24 }}>
        {me && (
          <Section title={t('settings.account.title')}>
            <Text className="text-sm text-neutral-500">{t('settings.account.emailLabel')}</Text>
            <Text className="mt-0.5 text-[15px] font-sans-medium text-neutral-900 dark:text-neutral-50">
              {me.email}
            </Text>
          </Section>
        )}

        <Section title={t('settings.appearance.title')} subtitle={t('settings.appearance.subtitle')}>
          <View className="flex-row gap-2">
            {THEME_OPTIONS.map(({ mode: m, label, Icon }) => {
              const active = mode === m;
              return (
                <Pressable
                  key={m}
                  className={
                    active
                      ? 'flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-2.5'
                      : 'flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-neutral-300 py-2.5 dark:border-neutral-700'
                  }
                  onPress={() => setMode(m)}
                >
                  <Icon size={16} color={active ? '#ffffff' : '#737373'} />
                  <Text className={active ? 'font-sans-semibold text-white' : 'font-sans-medium text-neutral-500'}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title={t('settings.language.title')} subtitle={t('settings.language.subtitle')}>
          <View className="flex-row gap-2">
            {LANGUAGE_OPTIONS.map(({ mode: m, label }) => {
              const active = languageMode === m;
              return (
                <Pressable
                  key={m}
                  className={
                    active
                      ? 'flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-2.5'
                      : 'flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-neutral-300 py-2.5 dark:border-neutral-700'
                  }
                  onPress={() => setLanguageMode(m)}
                >
                  <Languages size={16} color={active ? '#ffffff' : '#737373'} />
                  <Text className={active ? 'font-sans-semibold text-white' : 'font-sans-medium text-neutral-500'}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title={t('settings.notificationPreferences.title')} subtitle={t('settings.notificationPreferences.subtitle')}>
          <NotificationPreferencesControls />
        </Section>

        {me && !me.emailVerified && (
          <Section title={t('settings.emailVerification.title')} subtitle={t('settings.emailVerification.subtitle')}>
            <Pressable
              className="self-start rounded-xl border border-neutral-300 px-5 py-2.5 active:opacity-70 dark:border-neutral-700"
              onPress={() =>
                sendVerification.mutate(undefined, {
                  onSuccess: () => Alert.alert(t('settings.emailVerification.successTitle'), t('settings.emailVerification.successBody')),
                  onError: () => Alert.alert(t('settings.emailVerification.errorTitle'), t('settings.emailVerification.errorBody')),
                })
              }
              disabled={sendVerification.isPending}
            >
              <Text className="font-sans-semibold text-neutral-900 dark:text-neutral-50">
                {sendVerification.isPending ? t('settings.emailVerification.sendButtonPending') : t('settings.emailVerification.sendButton')}
              </Text>
            </Pressable>
          </Section>
        )}

        <Section title={t('settings.changePassword.title')} subtitle={t('settings.changePassword.subtitle')}>
          <TextInput
            className="mb-3 rounded-xl border border-neutral-200 px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
            placeholder={t('settings.changePassword.currentPlaceholder')}
            placeholderTextColor="#737373"
            secureTextEntry
            value={oldPassword}
            onChangeText={setOldPassword}
          />
          <TextInput
            className="mb-3 rounded-xl border border-neutral-200 px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
            placeholder={t('settings.changePassword.newPlaceholder')}
            placeholderTextColor="#737373"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TextInput
            className="mb-3 rounded-xl border border-neutral-200 px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
            placeholder={t('settings.changePassword.confirmPlaceholder')}
            placeholderTextColor="#737373"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <Pressable
            className={
              oldPassword && newPassword && confirmPassword && !changePassword.isPending
                ? 'self-start rounded-xl bg-primary px-5 py-2.5 active:opacity-80'
                : 'self-start rounded-xl bg-primary/50 px-5 py-2.5'
            }
            onPress={submitPassword}
            disabled={!oldPassword || !newPassword || !confirmPassword || changePassword.isPending}
          >
            <Text className="font-sans-semibold text-white">
              {changePassword.isPending ? t('settings.changePassword.submitPending') : t('settings.changePassword.submit')}
            </Text>
          </Pressable>
        </Section>

        <Section title={t('settings.session.title')} subtitle={t('settings.session.subtitle')}>
          <Pressable
            className="mb-3 flex-row items-center gap-2 self-start rounded-xl border border-neutral-300 px-5 py-2.5 active:opacity-70 dark:border-neutral-700"
            onPress={() => logout()}
          >
            <LogOut size={16} color="#737373" />
            <Text className="font-sans-semibold text-neutral-900 dark:text-neutral-50">{t('settings.session.signOut')}</Text>
          </Pressable>
          <Pressable
            className="self-start rounded-xl border border-neutral-300 px-5 py-2.5 active:opacity-70 dark:border-neutral-700"
            onPress={confirmLogoutAll}
            disabled={logoutAll.isPending}
          >
            <Text className="font-sans-semibold text-neutral-900 dark:text-neutral-50">{t('settings.session.signOutAll')}</Text>
          </Pressable>
        </Section>

        <Section title={t('settings.legal.title')}>
          {LEGAL_LINKS.map(({ label, path }, index) => (
            <Pressable
              key={path}
              className={
                index < LEGAL_LINKS.length - 1
                  ? 'flex-row items-center justify-between border-b border-neutral-100 py-3 active:opacity-70 dark:border-neutral-800'
                  : 'flex-row items-center justify-between py-3 active:opacity-70'
              }
              onPress={() => void WebBrowser.openBrowserAsync(`${WEB_URL}${path}`)}
            >
              <Text className="text-[15px] text-neutral-900 dark:text-neutral-50">{label}</Text>
              <ChevronRight size={18} color="#a3a3a3" />
            </Pressable>
          ))}
        </Section>

        <Section title={t('settings.updates.title')}>
          <Pressable
            className="mb-3 self-start rounded-xl border border-neutral-300 px-5 py-2.5 active:opacity-70 dark:border-neutral-700"
            onPress={() => void checkAppUpdate()}
            disabled={checkingVersion}
          >
            <Text className="font-sans-semibold text-neutral-900 dark:text-neutral-50">
              {t('settings.updates.checkAppUpdate')}
            </Text>
          </Pressable>
          <Pressable
            className="self-start rounded-xl border border-neutral-300 px-5 py-2.5 active:opacity-70 dark:border-neutral-700"
            onPress={() => void checkOtaUpdate()}
            disabled={checkingOta}
          >
            <Text className="font-sans-semibold text-neutral-900 dark:text-neutral-50">
              {t('settings.updates.checkOta')}
            </Text>
          </Pressable>
        </Section>

        <Section title={t('settings.dangerZone.title')}>
          <View className="flex-row items-center gap-2">
            <ShieldAlert size={18} color="#ef4444" />
            <Text className="text-sm text-neutral-500">{t('settings.dangerZone.disclaimer')}</Text>
          </View>
          <Pressable
            className="mt-3 self-start rounded-xl border border-red-500/40 bg-red-500/5 px-5 py-2.5 active:opacity-70"
            onPress={confirmDelete}
            disabled={deleteAccount.isPending}
          >
            <Text className="font-sans-semibold text-red-500">
              {deleteAccount.isPending ? t('settings.dangerZone.deleteAccountPending') : t('settings.dangerZone.deleteAccount')}
            </Text>
          </Pressable>
        </Section>
      </ScrollView>
    </View>
  );
}
