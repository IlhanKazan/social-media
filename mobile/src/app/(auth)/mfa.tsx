import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';

import { FormInput } from '@/components/form-input';
import { mfaSchema, type MfaFormValues } from '@/features/auth/mfa-schema';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { AuthResponse, ErrorResponse, LoginResponse, MfaMethod } from '@/types/api';

const METHOD_LABELS: Record<MfaMethod, string> = {
  TOTP: 'Authenticator app',
  EMAIL: 'Email code',
  RECOVERY: 'Recovery code',
};

export default function MfaScreen() {
  const params = useLocalSearchParams<{ mfaToken: string; methods: string }>();
  const methods = useMemo(
    () => (params.methods ? (params.methods.split(',') as MfaMethod[]) : []),
    [params.methods]
  );
  const [method, setMethod] = useState<MfaMethod>(methods[0] ?? 'TOTP');
  const [serverError, setServerError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<MfaFormValues>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { code: '' },
  });

  const verifyMutation = useMutation({
    mutationFn: async (values: MfaFormValues) => {
      const { data } = await api.post<LoginResponse>('/auth/mfa/verify', {
        mfaToken: params.mfaToken,
        method,
        code: values.code.trim(),
      });
      return data;
    },
    onSuccess: (data) => useAuthStore.getState().login(data as AuthResponse),
    onError: (error: { response?: { data?: ErrorResponse } }) => {
      setServerError(error.response?.data?.message ?? 'Verification failed.');
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => api.post('/auth/mfa/resend', { mfaToken: params.mfaToken }),
    onSuccess: () => setInfo('A new code was sent to your email.'),
    onError: () => setServerError('Could not resend the code.'),
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 justify-center bg-white px-8 dark:bg-neutral-950"
    >
      <Text className="text-center text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        Two-factor verification
      </Text>
      <Text className="mt-2 text-center text-neutral-500 dark:text-neutral-400">
        Enter the code for: {METHOD_LABELS[method]}
      </Text>

      {methods.length > 1 && (
        <View className="mt-4 flex-row justify-center gap-2">
          {methods.map((m) => (
            <Pressable
              key={m}
              className={`rounded-full border px-4 py-2 ${
                m === method ? 'border-primary bg-primary' : 'border-neutral-300 dark:border-neutral-700'
              }`}
              onPress={() => setMethod(m)}
            >
              <Text className={m === method ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}>
                {METHOD_LABELS[m]}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <FormInput
        control={control}
        name="code"
        error={errors.code?.message}
        placeholder="Verification code"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={method === 'RECOVERY' ? 'default' : 'number-pad'}
      />

      {info && <Text className="mt-3 text-center text-sm text-primary">{info}</Text>}
      {serverError && (
        <Text className="mt-3 text-center text-sm text-red-500">{serverError}</Text>
      )}

      <Pressable
        className="mt-6 rounded-xl bg-primary py-3 active:opacity-80"
        disabled={verifyMutation.isPending}
        onPress={handleSubmit((values) => {
          setServerError(null);
          verifyMutation.mutate(values);
        })}
      >
        <Text className="text-center text-base font-semibold text-white">
          {verifyMutation.isPending ? 'Verifying…' : 'Verify'}
        </Text>
      </Pressable>

      {method === 'EMAIL' && (
        <Pressable
          className="mt-4"
          disabled={resendMutation.isPending}
          onPress={() => resendMutation.mutate()}
        >
          <Text className="text-center text-primary">Resend email code</Text>
        </Pressable>
      )}
    </KeyboardAvoidingView>
  );
}
