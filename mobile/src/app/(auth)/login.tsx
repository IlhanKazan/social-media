import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';

import { FormInput } from '@/components/form-input';
import { loginSchema, type LoginFormValues } from '@/features/auth/login-schema';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { AuthResponse, ErrorResponse, LoginResponse } from '@/types/api';

export default function LoginScreen() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const { data } = await api.post<LoginResponse>('/auth/login', values);
      return data;
    },
    onSuccess: async (data) => {
      if (data.status === 'MFA_REQUIRED') {
        router.push({
          pathname: '/mfa',
          params: { mfaToken: data.mfaToken, methods: (data.methods ?? []).join(',') },
        });
        return;
      }
      await useAuthStore.getState().login(data as AuthResponse);
    },
    onError: (error: { response?: { data?: ErrorResponse } }) => {
      setServerError(error.response?.data?.message ?? 'Giriş yapılamadı. Bağlantını kontrol et.');
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    setServerError(null);
    loginMutation.mutate(values);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 justify-center bg-white px-8 dark:bg-neutral-950"
    >
      <Text className="text-center text-3xl font-sans-bold text-neutral-900 dark:text-neutral-50">
        Tekrar hoş geldin
      </Text>
      <Text className="mb-8 mt-1.5 text-center text-base text-neutral-500">Hesabına giriş yap</Text>

      <FormInput
        control={control}
        name="identifier"
        error={errors.identifier?.message}
        placeholder="Kullanıcı adı veya e-posta"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <FormInput
        control={control}
        name="password"
        error={errors.password?.message}
        placeholder="Şifre"
        secureTextEntry
      />

      {serverError && (
        <View className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
          <Text className="text-center text-sm font-sans-medium text-red-500">{serverError}</Text>
        </View>
      )}

      <Pressable
        className={
          loginMutation.isPending
            ? 'mt-6 flex-row items-center justify-center gap-2 rounded-xl bg-primary/60 py-3.5'
            : 'mt-6 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3.5 active:opacity-80'
        }
        disabled={loginMutation.isPending}
        onPress={handleSubmit(onSubmit)}
      >
        {loginMutation.isPending && <ActivityIndicator size="small" color="#ffffff" />}
        <Text className="text-center text-base font-sans-semibold text-white">
          {loginMutation.isPending ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </Text>
      </Pressable>

      <Link href="/forgot-password" asChild>
        <Pressable className="mt-5">
          <Text className="text-center text-primary">Şifreni mi unuttun?</Text>
        </Pressable>
      </Link>
      <Link href="/register" asChild>
        <Pressable className="mt-3">
          <Text className="text-center text-neutral-500">
            Hesabın yok mu? <Text className="font-sans-semibold text-primary">Kayıt ol</Text>
          </Text>
        </Pressable>
      </Link>
    </KeyboardAvoidingView>
  );
}
