import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput } from 'react-native';

import { api } from '@/lib/api';
import { loginSchema, type LoginFormValues } from '@/features/auth/login-schema';
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
      setServerError(error.response?.data?.message ?? 'Login failed. Check your connection.');
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
      <Text className="mb-8 text-center text-3xl font-sans-bold text-neutral-900 dark:text-neutral-50">
        SocialHan
      </Text>

      <Controller
        control={control}
        name="identifier"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            className="mb-1 rounded-xl border border-neutral-300 px-4 py-3 text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
            placeholder="Kullanıcı adı veya e-posta"
            placeholderTextColor="#737373"
            autoCapitalize="none"
            autoCorrect={false}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
          />
        )}
      />
      {errors.identifier && (
        <Text className="mb-2 text-sm text-red-500">{errors.identifier.message}</Text>
      )}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            className="mb-1 mt-3 rounded-xl border border-neutral-300 px-4 py-3 text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
            placeholder="Şifre"
            placeholderTextColor="#737373"
            secureTextEntry
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
          />
        )}
      />
      {errors.password && (
        <Text className="mb-2 text-sm text-red-500">{errors.password.message}</Text>
      )}

      {serverError && (
        <Text className="mt-3 text-center text-sm text-red-500">{serverError}</Text>
      )}

      <Pressable
        className="mt-6 rounded-xl bg-primary py-3 active:opacity-80"
        disabled={loginMutation.isPending}
        onPress={handleSubmit(onSubmit)}
      >
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
          <Text className="text-center text-primary">Hesabın yok mu? Kayıt ol</Text>
        </Pressable>
      </Link>
    </KeyboardAvoidingView>
  );
}
