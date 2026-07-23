import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text } from 'react-native';

import { FormInput } from '@/components/form-input';
import { createForgotSchema, type ForgotFormValues } from '@/features/auth/forgot-schema';
import { api } from '@/lib/api';

export default function ForgotPasswordScreen() {
  const { t, i18n } = useTranslation();
  const [sent, setSent] = useState(false);
  const forgotSchema = useMemo(() => createForgotSchema(t), [t, i18n.language]);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const requestMutation = useMutation({
    mutationFn: (values: ForgotFormValues) =>
      api.post('/auth/password-reset/request', values),
    // The endpoint always returns 204 (no user enumeration), so success is unconditional.
    onSettled: () => setSent(true),
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 justify-center bg-white px-8 dark:bg-neutral-950"
    >
      <Text className="text-center text-3xl font-sans-bold text-neutral-900 dark:text-neutral-50">
        {t('auth.forgotPassword.title')}
      </Text>
      <Text className="mb-2 mt-1.5 text-center text-base text-neutral-500">
        {t('auth.forgotPassword.subtitle')}
      </Text>

      {sent ? (
        <Text className="mt-4 text-center text-neutral-600 dark:text-neutral-300">
          {t('auth.forgotPassword.sentMessage')}
        </Text>
      ) : (
        <>
          <FormInput
            control={control}
            name="email"
            error={errors.email?.message}
            placeholder={t('auth.forgotPassword.emailPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <Pressable
            className={
              requestMutation.isPending
                ? 'mt-6 flex-row items-center justify-center gap-2 rounded-xl bg-primary/60 py-3.5'
                : 'mt-6 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3.5 active:opacity-80'
            }
            disabled={requestMutation.isPending}
            onPress={handleSubmit((values) => requestMutation.mutate(values))}
          >
            {requestMutation.isPending && <ActivityIndicator size="small" color="#ffffff" />}
            <Text className="text-center text-base font-sans-semibold text-white">
              {requestMutation.isPending ? t('auth.forgotPassword.submitPending') : t('auth.forgotPassword.submit')}
            </Text>
          </Pressable>
        </>
      )}

      <Link href="/login" asChild>
        <Pressable className="mt-6">
          <Text className="text-center text-primary">{t('auth.forgotPassword.backToLogin')}</Text>
        </Pressable>
      </Link>
    </KeyboardAvoidingView>
  );
}
