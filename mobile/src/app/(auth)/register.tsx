import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { AuthHeader } from '@/components/auth-header';
import Animated, { LinearTransition, ZoomIn } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';

import { FormInput } from '@/components/form-input';
import { RevealField } from '@/components/reveal-field';
import { createRegisterSchema, type RegisterFormValues } from '@/features/auth/register-schema';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { WEB_URL } from '@/lib/env';
import { useAuthStore } from '@/stores/auth-store';
import type { AuthResponse, ErrorResponse } from '@/types/api';

function Checkbox({
  value,
  onToggle,
  error,
  children,
}: {
  value: boolean;
  onToggle: () => void;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <View className="mt-4 flex-row items-center">
        <Pressable
          onPress={onToggle}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: value }}
        >
          <Animated.View
            layout={LinearTransition.duration(160)}
            className={`h-6 w-6 items-center justify-center rounded-md border-2 ${
              value ? 'border-primary bg-primary' : error ? 'border-red-500' : 'border-neutral-400'
            }`}
          >
            {value && (
              // Springs in rather than appearing, so the tick reads as a
              // response to the tap instead of a repaint.
              <Animated.View entering={ZoomIn.duration(180).springify().damping(12)}>
                <Check size={15} color="#ffffff" strokeWidth={3.5} />
              </Animated.View>
            )}
          </Animated.View>
        </Pressable>
        <Text className="ml-3 flex-1 text-neutral-700 dark:text-neutral-300" onPress={onToggle}>
          {children}
        </Text>
      </View>
      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
    </>
  );
}

export default function RegisterScreen() {
  const { t, i18n } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const keyboardHeight = useKeyboardHeight();
  const registerSchema = useMemo(() => createRegisterSchema(t), [t, i18n.language]);
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
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
      setServerError(fieldError ?? getApiErrorMessage(t, error, 'auth.register.genericError'));
    },
  });

  // Same progressive steps as the web form, so the two behave alike. Length
  // checks rather than full validation, so the form does not appear to stall
  // while someone is still mid-word.
  const username = watch('username');
  const email = watch('email');
  const password = watch('password');

  const showEmail = (username?.length ?? 0) >= 3;
  const showRest = showEmail && (email?.length ?? 0) >= 3 && email.includes('@');
  const showConsent = showRest && (password?.length ?? 0) >= 6;

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
        <AuthHeader />
        <Text className="text-center text-3xl font-sans-bold text-neutral-900 dark:text-neutral-50">
          {t('auth.register.title')}
        </Text>
        <Text className="mb-6 mt-1.5 text-center text-base text-neutral-500">{t('auth.register.subtitle')}</Text>

        <FormInput
          control={control}
          name="username"
          label={t('auth.register.usernameLabel')}
          error={errors.username?.message}
          placeholder={t('auth.register.usernamePlaceholder')}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <RevealField show={showEmail}>
        <FormInput
          control={control}
          name="email"
          label={t('auth.register.emailLabel')}
          error={errors.email?.message}
          placeholder={t('auth.register.emailPlaceholder')}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        </RevealField>

        <RevealField show={showRest}>
        <FormInput
          control={control}
          name="displayName"
          label={t('auth.register.displayNameLabel')}
          error={errors.displayName?.message}
          placeholder={t('auth.register.displayNamePlaceholder')}
        />
        <FormInput
          control={control}
          name="password"
          label={t('auth.register.passwordLabel')}
          error={errors.password?.message}
          placeholder={t('auth.register.passwordPlaceholder')}
          secureTextEntry
        />
        <FormInput
          control={control}
          name="confirmPassword"
          label={t('auth.register.confirmPasswordLabel')}
          error={errors.confirmPassword?.message}
          placeholder={t('auth.register.confirmPasswordPlaceholder')}
          secureTextEntry
        />
        </RevealField>

        <RevealField show={showConsent}>
        <Controller
          control={control}
          name="acceptedTerms"
          render={({ field: { value, onChange } }) => (
            <Checkbox value={value} onToggle={() => onChange(!value)} error={errors.acceptedTerms?.message}>
              {t('auth.register.termsPrefix')}
              <Text
                className="text-primary underline"
                onPress={() => void WebBrowser.openBrowserAsync(`${WEB_URL}/terms`)}
              >
                {t('auth.register.termsLink')}
              </Text>
              {t('auth.register.termsAnd')}
              <Text
                className="text-primary underline"
                onPress={() => void WebBrowser.openBrowserAsync(`${WEB_URL}/privacy`)}
              >
                {t('auth.register.privacyLink')}
              </Text>
              {t('auth.register.termsSuffix')}
            </Checkbox>
          )}
        />
        <Controller
          control={control}
          name="confirmedAge"
          render={({ field: { value, onChange } }) => (
            <Checkbox value={value} onToggle={() => onChange(!value)} error={errors.confirmedAge?.message}>
              {t('auth.register.confirmAge')}
            </Checkbox>
          )}
        />
        </RevealField>

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
            {registerMutation.isPending ? t('auth.register.submitPending') : t('auth.register.submit')}
          </Text>
        </Pressable>

        <Link href="/login" asChild>
          <Pressable className="mt-6">
            <Text className="text-center text-neutral-500">
              {t('auth.register.haveAccount')} <Text className="font-sans-semibold text-primary">{t('auth.register.signIn')}</Text>
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    </View>
  );
}
