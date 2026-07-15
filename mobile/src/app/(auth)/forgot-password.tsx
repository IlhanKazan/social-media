import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, Text } from 'react-native';

import { FormInput } from '@/components/form-input';
import { forgotSchema, type ForgotFormValues } from '@/features/auth/forgot-schema';
import { api } from '@/lib/api';

export default function ForgotPasswordScreen() {
  const [sent, setSent] = useState(false);
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
      <Text className="text-center text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        Reset password
      </Text>

      {sent ? (
        <Text className="mt-4 text-center text-neutral-600 dark:text-neutral-300">
          If that email exists, a reset link is on its way. The link opens the web app to set a
          new password; afterwards sign in here again.
        </Text>
      ) : (
        <>
          <FormInput
            control={control}
            name="email"
            error={errors.email?.message}
            placeholder="Email"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <Pressable
            className="mt-6 rounded-xl bg-primary py-3 active:opacity-80"
            disabled={requestMutation.isPending}
            onPress={handleSubmit((values) => requestMutation.mutate(values))}
          >
            <Text className="text-center text-base font-semibold text-white">
              {requestMutation.isPending ? 'Sending…' : 'Send reset link'}
            </Text>
          </Pressable>
        </>
      )}

      <Link href="/login" asChild>
        <Pressable className="mt-6">
          <Text className="text-center text-primary">Back to sign in</Text>
        </Pressable>
      </Link>
    </KeyboardAvoidingView>
  );
}
