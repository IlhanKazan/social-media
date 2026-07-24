import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod';
import type { TFunction } from 'i18next';

import { uploadAvatar, uploadCover, useMe, useUpdateProfile } from '@/features/profile/queries';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { useAuthStore } from '@/stores/auth-store';

function createSchema(t: TFunction) {
  return z.object({
    displayName: z.string().trim().max(50, t('profile.displayNameMax')).optional(),
    bio: z.string().trim().max(160, t('profile.bioMax')).optional(),
  });
}
type FormValues = z.infer<ReturnType<typeof createSchema>>;

async function pickImage(t: TFunction, aspect: [number, number]): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.8,
  });
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return null;
  if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
    Alert.alert(t('compose.imageTooLargeTitle'), t('compose.imageTooLargeBody'));
    return null;
  }
  return asset.uri;
}

export default function EditProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { data: me } = useMe();
  const keyboardHeight = useKeyboardHeight();
  const updateProfile = useUpdateProfile(me?.username);

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const schema = useMemo(() => createSchema(t), [t, i18n.language]);
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: '', bio: '' },
  });

  useEffect(() => {
    if (me) {
      reset({ displayName: me.displayName ?? '', bio: me.bio ?? '' });
    }
  }, [me, reset]);

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      let profileImageUrl = me?.profileImageUrl;
      if (avatarUri) {
        profileImageUrl = await uploadAvatar(avatarUri);
      }
      if (coverUri) {
        await uploadCover(coverUri);
      }
      await updateProfile.mutateAsync({
        displayName: values.displayName || undefined,
        bio: values.bio || undefined,
      });

      // Keep the persisted auth-store account (used across headers/tab) in sync.
      useAuthStore.setState((s) =>
        s.account
          ? { account: { ...s.account, displayName: values.displayName ?? '', profileImageUrl: profileImageUrl ?? null } }
          : {}
      );
      router.back();
    } catch {
      Alert.alert(t('profile.updateFailedTitle'), t('profile.updateFailedBody'));
    } finally {
      setSaving(false);
    }
  };

  const coverSource = coverUri ?? me?.coverImageUrl;
  const avatarSource = avatarUri ?? me?.profileImageUrl;

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <Stack.Screen
        options={{
          title: t('profile.editProfile'),
          presentation: 'modal',
          headerShown: true,
          headerRight: () => (
            <Pressable onPress={handleSubmit(onSubmit)} disabled={saving} hitSlop={10}>
              {saving ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text className="font-sans-bold text-primary">{t('profile.save')}</Text>
              )}
            </Pressable>
          ),
        }}
      />

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: keyboardHeight + 24 }}>
        <Pressable className="h-36 w-full bg-neutral-200 dark:bg-neutral-800" onPress={async () => {
          const uri = await pickImage(t, [3, 1]);
          if (uri) setCoverUri(uri);
        }}>
          {coverSource && (
            <Image source={{ uri: coverSource }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          )}
          <View className="absolute inset-0 items-center justify-center">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-black/40">
              <Camera size={18} color="#ffffff" />
            </View>
          </View>
        </Pressable>

        <View className="px-4">
          <Pressable
            className="-mt-10 h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-neutral-300 dark:border-neutral-950 dark:bg-neutral-700"
            onPress={async () => {
              const uri = await pickImage(t, [1, 1]);
              if (uri) setAvatarUri(uri);
            }}
          >
            {avatarSource ? (
              <Image source={{ uri: avatarSource }} style={{ width: 72, height: 72, borderRadius: 36 }} />
            ) : (
              <Camera size={22} color="#ffffff" />
            )}
            <View className="absolute h-7 w-7 items-center justify-center rounded-full bg-black/40">
              <Camera size={14} color="#ffffff" />
            </View>
          </Pressable>

          <View className="mt-6">
            <Text className="mb-1 text-sm font-sans-medium text-neutral-500">{t('profile.displayNameLabel')}</Text>
            <Controller
              control={control}
              name="displayName"
              render={({ field: { value, onChange }, fieldState }) => (
                <>
                  <TextInput
                    className="rounded-xl border border-neutral-200 px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
                    placeholder={t('profile.displayNamePlaceholder')}
                    placeholderTextColor="#737373"
                    value={value}
                    onChangeText={onChange}
                    maxLength={50}
                  />
                  {fieldState.error && (
                    <Text className="mt-1 text-sm text-red-500">{fieldState.error.message}</Text>
                  )}
                </>
              )}
            />
          </View>

          <View className="mt-4">
            <Text className="mb-1 text-sm font-sans-medium text-neutral-500">{t('profile.bioLabel')}</Text>
            <Controller
              control={control}
              name="bio"
              render={({ field: { value, onChange }, fieldState }) => (
                <>
                  <TextInput
                    className="min-h-[90px] rounded-xl border border-neutral-200 px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
                    placeholder={t('profile.bioPlaceholder')}
                    placeholderTextColor="#737373"
                    value={value}
                    onChangeText={onChange}
                    multiline
                    maxLength={160}
                    textAlignVertical="top"
                  />
                  {fieldState.error && (
                    <Text className="mt-1 text-sm text-red-500">{fieldState.error.message}</Text>
                  )}
                </>
              )}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
