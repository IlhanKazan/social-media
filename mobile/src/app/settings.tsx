import * as WebBrowser from 'expo-web-browser';
import { Stack } from 'expo-router';
import { ChevronRight, LogOut, Monitor, Moon, ShieldAlert, Sun } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

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
import { useThemeStore, type ThemeMode } from '@/stores/theme-store';
import type { NotificationPreferences } from '@/types/api';

const LEGAL_LINKS: { label: string; path: string }[] = [
  { label: 'Hakkında', path: '/about' },
  { label: 'Gizlilik Politikası', path: '/privacy' },
  { label: 'Kullanım Şartları', path: '/terms' },
];

const THEME_OPTIONS: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: 'light', label: 'Aydınlık', Icon: Sun },
  { mode: 'dark', label: 'Karanlık', Icon: Moon },
  { mode: 'system', label: 'Sistem', Icon: Monitor },
];

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View className="border-b border-neutral-100 px-4 py-5 dark:border-neutral-800">
      <Text className="text-lg font-sans-bold text-neutral-900 dark:text-neutral-50">{title}</Text>
      {subtitle && <Text className="mt-0.5 text-sm text-neutral-500">{subtitle}</Text>}
      <View className="mt-4">{children}</View>
    </View>
  );
}

const PREF_ROWS: { key: keyof NotificationPreferences; label: string }[] = [
  { key: 'likes', label: 'Beğeniler' },
  { key: 'reposts', label: 'Yeniden paylaşımlar' },
  { key: 'follows', label: 'Yeni takipçiler' },
  { key: 'replies', label: 'Yanıtlar' },
  { key: 'mentions', label: 'Bahsetmeler' },
  { key: 'recommendations', label: 'Senin için öneriler' },
];

function NotificationPreferencesControls() {
  const { data: prefs } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  if (!prefs) return null;

  return (
    <View>
      {PREF_ROWS.map(({ key, label }) => (
        <View key={key} className="flex-row items-center justify-between py-1.5">
          <Text className="text-[15px] text-neutral-900 dark:text-neutral-50">{label}</Text>
          <Switch
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
  const { data: me } = useMe();
  const keyboardHeight = useKeyboardHeight();
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
      Alert.alert('Zayıf şifre', 'Yeni şifre en az 6 karakter olmalı.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Uyuşmuyor', 'Yeni şifreler eşleşmiyor.');
      return;
    }
    if (oldPassword === newPassword) {
      Alert.alert('Aynı şifre', 'Yeni şifre eskisiyle aynı olamaz.');
      return;
    }
    changePassword.mutate({ oldPassword, newPassword });
  };

  const confirmLogoutAll = () =>
    Alert.alert('Her yerden çıkış yapılsın mı?', 'Bu cihaz dahil tüm oturumların sonlanacak.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Tümünden çık', style: 'destructive', onPress: () => logoutAll.mutate() },
    ]);

  const confirmDelete = () =>
    Alert.alert('Hesap silinsin mi?', 'Bu işlem kalıcıdır. Gönderilerin, beğenilerin ve mesajların silinecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteAccount.mutate() },
    ]);

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <Stack.Screen options={{ title: 'Ayarlar', headerShown: true }} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: keyboardHeight + 24 }}>
        {me && (
          <Section title="Hesap">
            <Text className="text-sm text-neutral-500">E-posta</Text>
            <Text className="mt-0.5 text-[15px] font-sans-medium text-neutral-900 dark:text-neutral-50">
              {me.email}
            </Text>
          </Section>
        )}

        <Section title="Görünüm" subtitle="Uygulama temasını özelleştir.">
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

        <Section title="Bildirim Tercihleri" subtitle="Hangi anlık bildirimleri alacağını seç.">
          <NotificationPreferencesControls />
        </Section>

        {me && !me.emailVerified && (
          <Section title="E-posta doğrulama" subtitle="Mavi tik rozeti için e-postanı doğrula.">
            <Pressable
              className="self-start rounded-xl border border-neutral-300 px-5 py-2.5 active:opacity-70 dark:border-neutral-700"
              onPress={() =>
                sendVerification.mutate(undefined, {
                  onSuccess: () => Alert.alert('Gönderildi', 'Doğrulama e-postası için gelen kutunu kontrol et.'),
                  onError: () => Alert.alert('Hata', 'Doğrulama e-postası gönderilemedi.'),
                })
              }
              disabled={sendVerification.isPending}
            >
              <Text className="font-sans-semibold text-neutral-900 dark:text-neutral-50">
                {sendVerification.isPending ? 'Gönderiliyor…' : 'Doğrulama e-postası gönder'}
              </Text>
            </Pressable>
          </Section>
        )}

        <Section title="Şifre değiştir" subtitle="Değiştirdikten sonra oturumun kapanacak.">
          <TextInput
            className="mb-3 rounded-xl border border-neutral-200 px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
            placeholder="Mevcut şifre"
            placeholderTextColor="#737373"
            secureTextEntry
            value={oldPassword}
            onChangeText={setOldPassword}
          />
          <TextInput
            className="mb-3 rounded-xl border border-neutral-200 px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
            placeholder="Yeni şifre"
            placeholderTextColor="#737373"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TextInput
            className="mb-3 rounded-xl border border-neutral-200 px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
            placeholder="Yeni şifre (tekrar)"
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
              {changePassword.isPending ? 'Güncelleniyor…' : 'Şifreyi güncelle'}
            </Text>
          </Pressable>
        </Section>

        <Section title="Oturum" subtitle="Oturumlarını yönet.">
          <Pressable
            className="mb-3 flex-row items-center gap-2 self-start rounded-xl border border-neutral-300 px-5 py-2.5 active:opacity-70 dark:border-neutral-700"
            onPress={() => logout()}
          >
            <LogOut size={16} color="#737373" />
            <Text className="font-sans-semibold text-neutral-900 dark:text-neutral-50">Çıkış yap</Text>
          </Pressable>
          <Pressable
            className="self-start rounded-xl border border-neutral-300 px-5 py-2.5 active:opacity-70 dark:border-neutral-700"
            onPress={confirmLogoutAll}
            disabled={logoutAll.isPending}
          >
            <Text className="font-sans-semibold text-neutral-900 dark:text-neutral-50">Tüm cihazlardan çıkış yap</Text>
          </Pressable>
        </Section>

        <Section title="Yasal">
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

        <Section title="Tehlikeli bölge">
          <View className="flex-row items-center gap-2">
            <ShieldAlert size={18} color="#ef4444" />
            <Text className="text-sm text-neutral-500">Bu işlemler geri alınamaz.</Text>
          </View>
          <Pressable
            className="mt-3 self-start rounded-xl border border-red-500/40 bg-red-500/5 px-5 py-2.5 active:opacity-70"
            onPress={confirmDelete}
            disabled={deleteAccount.isPending}
          >
            <Text className="font-sans-semibold text-red-500">
              {deleteAccount.isPending ? 'Siliniyor…' : 'Hesabı sil'}
            </Text>
          </Pressable>
        </Section>
      </ScrollView>
    </View>
  );
}
