import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { FormInput } from '@/components/form-input';
import { registerSchema, type RegisterFormValues } from '@/features/auth/register-schema';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { AuthResponse, ErrorResponse } from '@/types/api';

function Checkbox({
  value,
  onToggle,
  label,
  error,
}: {
  value: boolean;
  onToggle: () => void;
  label: string;
  error?: string;
}) {
  return (
    <>
      <Pressable className="mt-4 flex-row items-center" onPress={onToggle}>
        <View
          className={`h-6 w-6 items-center justify-center rounded-md border ${
            value ? 'border-primary bg-primary' : 'border-neutral-400'
          }`}
        >
          {value && <Text className="text-xs font-sans-bold text-white">✓</Text>}
        </View>
        <Text className="ml-3 flex-1 text-neutral-700 dark:text-neutral-300">{label}</Text>
      </Pressable>
      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
    </>
  );
}

export default function RegisterScreen() {
  const [serverError, setServerError] = useState<string | null>(null);
  const keyboardHeight = useKeyboardHeight();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
      acceptedTerms: false,
      confirmedAge: false,
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (values: RegisterFormValues) => {
      const { data } = await api.post<AuthResponse>('/auth/register', {
        username: values.username,
        email: values.email,
        password: values.password,
        displayName: values.displayName || values.username,
        acceptedTerms: values.acceptedTerms,
        confirmedAge: values.confirmedAge,
      });
      return data;
    },
    onSuccess: (data) => useAuthStore.getState().login(data),
    onError: (error: { response?: { data?: ErrorResponse } }) => {
      const data = error.response?.data;
      const fieldError = data?.fieldErrors ? Object.values(data.fieldErrors)[0] : null;
      setServerError(fieldError ?? data?.message ?? 'Kayıt olunamadı. Bağlantını kontrol et.');
    },
  });

  const onSubmit = (values: RegisterFormValues) => {
    setServerError(null);
    registerMutation.mutate(values);
  };

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-8 py-12"
        contentContainerStyle={{ paddingBottom: keyboardHeight + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-center text-3xl font-sans-bold text-neutral-900 dark:text-neutral-50">
          Hesap oluştur
        </Text>
        <Text className="mb-6 mt-1.5 text-center text-base text-neutral-500">SocialHan&apos;a katıl</Text>

        <FormInput
          control={control}
          name="username"
          error={errors.username?.message}
          placeholder="Kullanıcı adı"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <FormInput
          control={control}
          name="email"
          error={errors.email?.message}
          placeholder="E-posta"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        <FormInput
          control={control}
          name="displayName"
          error={errors.displayName?.message}
          placeholder="Görünen ad (opsiyonel)"
        />
        <FormInput
          control={control}
          name="password"
          error={errors.password?.message}
          placeholder="Şifre"
          secureTextEntry
        />
        <FormInput
          control={control}
          name="confirmPassword"
          error={errors.confirmPassword?.message}
          placeholder="Şifre (tekrar)"
          secureTextEntry
        />

        <Controller
          control={control}
          name="acceptedTerms"
          render={({ field: { value, onChange } }) => (
            <Checkbox
              value={value}
              onToggle={() => onChange(!value)}
              label="Kullanım Şartları ve Gizlilik Politikası'nı kabul ediyorum"
              error={errors.acceptedTerms?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="confirmedAge"
          render={({ field: { value, onChange } }) => (
            <Checkbox
              value={value}
              onToggle={() => onChange(!value)}
              label="Asgari yaş şartını karşıladığımı onaylıyorum"
              error={errors.confirmedAge?.message}
            />
          )}
        />

        {serverError && (
          <View className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
            <Text className="text-center text-sm font-sans-medium text-red-500">{serverError}</Text>
          </View>
        )}

        <Pressable
          className={
            registerMutation.isPending
              ? 'mt-6 flex-row items-center justify-center gap-2 rounded-xl bg-primary/60 py-3.5'
              : 'mt-6 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3.5 active:opacity-80'
          }
          disabled={registerMutation.isPending}
          onPress={handleSubmit(onSubmit)}
        >
          {registerMutation.isPending && <ActivityIndicator size="small" color="#ffffff" />}
          <Text className="text-center text-base font-sans-semibold text-white">
            {registerMutation.isPending ? 'Oluşturuluyor…' : 'Kayıt Ol'}
          </Text>
        </Pressable>

        <Link href="/login" asChild>
          <Pressable className="mt-6">
            <Text className="text-center text-neutral-500">
              Zaten hesabın var mı? <Text className="font-sans-semibold text-primary">Giriş yap</Text>
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    </View>
  );
}
