import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod';

import { uploadAvatar, uploadCover, useMe, useUpdateProfile } from '@/features/profile/queries';
import { useAuthStore } from '@/stores/auth-store';

const schema = z.object({
  displayName: z.string().trim().max(50, 'At most 50 characters').optional(),
  bio: z.string().trim().max(160, 'At most 160 characters').optional(),
});
type FormValues = z.infer<typeof schema>;

async function pickImage(aspect: [number, number]): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.8,
  });
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return null;
  if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
    Alert.alert('Image too large', 'The image must be smaller than 5MB.');
    return null;
  }
  return asset.uri;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile(me?.username);

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      Alert.alert('Update failed', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const coverSource = coverUri ?? me?.coverImageUrl;
  const avatarSource = avatarUri ?? me?.profileImageUrl;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-neutral-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: 'Edit profile',
          presentation: 'modal',
          headerShown: true,
          headerRight: () => (
            <Pressable onPress={handleSubmit(onSubmit)} disabled={saving} hitSlop={10}>
              {saving ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text className="font-bold text-primary">Save</Text>
              )}
            </Pressable>
          ),
        }}
      />

      <ScrollView keyboardShouldPersistTaps="handled">
        <Pressable className="h-36 w-full bg-neutral-200 dark:bg-neutral-800" onPress={async () => {
          const uri = await pickImage([3, 1]);
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
              const uri = await pickImage([1, 1]);
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
            <Text className="mb-1 text-sm font-medium text-neutral-500">Display name</Text>
            <Controller
              control={control}
              name="displayName"
              render={({ field: { value, onChange }, fieldState }) => (
                <>
                  <TextInput
                    className="rounded-xl border border-neutral-200 px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
                    placeholder="Your name"
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
            <Text className="mb-1 text-sm font-medium text-neutral-500">Bio</Text>
            <Controller
              control={control}
              name="bio"
              render={({ field: { value, onChange }, fieldState }) => (
                <>
                  <TextInput
                    className="min-h-[90px] rounded-xl border border-neutral-200 px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
                    placeholder="Tell people about yourself"
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
    </KeyboardAvoidingView>
  );
}
