import { Stack } from 'expo-router';
import { LogOut, Monitor, Moon, ShieldAlert, Sun } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useMe } from '@/features/profile/queries';
import {
  useChangePassword,
  useDeleteAccount,
  useLogoutAll,
  useSendVerification,
} from '@/features/settings/queries';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore, type ThemeMode } from '@/stores/theme-store';

const THEME_OPTIONS: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: 'light', label: 'Light', Icon: Sun },
  { mode: 'dark', label: 'Dark', Icon: Moon },
  { mode: 'system', label: 'System', Icon: Monitor },
];

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View className="border-b border-neutral-100 px-4 py-5 dark:border-neutral-800">
      <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-50">{title}</Text>
      {subtitle && <Text className="mt-0.5 text-sm text-neutral-500">{subtitle}</Text>}
      <View className="mt-4">{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const { data: me } = useMe();
  const logout = useAuthStore((s) => s.logout);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  const sendVerification = useSendVerification();
  const changePassword = useChangePassword();
  const logoutAll = useLogoutAll();
  const deleteAccount = useDeleteAccount();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const submitPassword = () => {
    if (newPassword.length < 6) {
      Alert.alert('Weak password', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }
    if (oldPassword === newPassword) {
      Alert.alert('Same password', 'New password cannot equal the old one.');
      return;
    }
    changePassword.mutate({ oldPassword, newPassword });
  };

  const confirmLogoutAll = () =>
    Alert.alert('Log out everywhere?', 'All your sessions, including this device, will end.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out all', style: 'destructive', onPress: () => logoutAll.mutate() },
    ]);

  const confirmDelete = () =>
    Alert.alert('Delete account?', 'This is permanent. Your posts, likes and messages will be erased.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteAccount.mutate() },
    ]);

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <Stack.Screen options={{ title: 'Settings', headerShown: true }} />
      <ScrollView keyboardShouldPersistTaps="handled">
        {me && (
          <Section title="Account">
            <Text className="text-sm text-neutral-500">Email</Text>
            <Text className="mt-0.5 text-[15px] font-medium text-neutral-900 dark:text-neutral-50">
              {me.email}
            </Text>
          </Section>
        )}

        <Section title="Appearance" subtitle="Customize the app theme.">
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
                  <Text className={active ? 'font-semibold text-white' : 'font-medium text-neutral-500'}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {me && !me.emailVerified && (
          <Section title="Verify email" subtitle="Confirm your email to earn the verified badge.">
            <Pressable
              className="self-start rounded-xl border border-neutral-300 px-5 py-2.5 active:opacity-70 dark:border-neutral-700"
              onPress={() =>
                sendVerification.mutate(undefined, {
                  onSuccess: () => Alert.alert('Sent', 'Check your inbox for the verification email.'),
                  onError: () => Alert.alert('Error', 'Could not send the verification email.'),
                })
              }
              disabled={sendVerification.isPending}
            >
              <Text className="font-semibold text-neutral-900 dark:text-neutral-50">
                {sendVerification.isPending ? 'Sending…' : 'Send verification email'}
              </Text>
            </Pressable>
          </Section>
        )}

        <Section title="Change password" subtitle="You'll be logged out after changing it.">
          <TextInput
            className="mb-3 rounded-xl border border-neutral-200 px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
            placeholder="Current password"
            placeholderTextColor="#737373"
            secureTextEntry
            value={oldPassword}
            onChangeText={setOldPassword}
          />
          <TextInput
            className="mb-3 rounded-xl border border-neutral-200 px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
            placeholder="New password"
            placeholderTextColor="#737373"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TextInput
            className="mb-3 rounded-xl border border-neutral-200 px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
            placeholder="Confirm new password"
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
            <Text className="font-semibold text-white">
              {changePassword.isPending ? 'Updating…' : 'Update password'}
            </Text>
          </Pressable>
        </Section>

        <Section title="Session" subtitle="Manage your sessions.">
          <Pressable
            className="mb-3 flex-row items-center gap-2 self-start rounded-xl border border-neutral-300 px-5 py-2.5 active:opacity-70 dark:border-neutral-700"
            onPress={() => logout()}
          >
            <LogOut size={16} color="#737373" />
            <Text className="font-semibold text-neutral-900 dark:text-neutral-50">Log out</Text>
          </Pressable>
          <Pressable
            className="self-start rounded-xl border border-neutral-300 px-5 py-2.5 active:opacity-70 dark:border-neutral-700"
            onPress={confirmLogoutAll}
            disabled={logoutAll.isPending}
          >
            <Text className="font-semibold text-neutral-900 dark:text-neutral-50">Log out of all devices</Text>
          </Pressable>
        </Section>

        <Section title="Danger zone">
          <View className="flex-row items-center gap-2">
            <ShieldAlert size={18} color="#ef4444" />
            <Text className="text-sm text-neutral-500">These actions cannot be undone.</Text>
          </View>
          <Pressable
            className="mt-3 self-start rounded-xl border border-red-500/40 bg-red-500/5 px-5 py-2.5 active:opacity-70"
            onPress={confirmDelete}
            disabled={deleteAccount.isPending}
          >
            <Text className="font-semibold text-red-500">
              {deleteAccount.isPending ? 'Deleting…' : 'Delete account'}
            </Text>
          </Pressable>
        </Section>
      </ScrollView>
    </View>
  );
}
