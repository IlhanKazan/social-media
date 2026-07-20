import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';

import { FormInput } from '@/components/form-input';
import { mfaSchema, type MfaFormValues } from '@/features/auth/mfa-schema';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { AuthResponse, ErrorResponse, LoginResponse, MfaMethod } from '@/types/api';

const METHOD_LABELS: Record<MfaMethod, string> = {
  TOTP: 'Kimlik doğrulayıcı uygulama',
  EMAIL: 'E-posta kodu',
  RECOVERY: 'Kurtarma kodu',
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
      setServerError(error.response?.data?.message ?? 'Doğrulama başarısız.');
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => api.post('/auth/mfa/resend', { mfaToken: params.mfaToken }),
    onSuccess: () => setInfo('E-postana yeni bir kod gönderildi.'),
    onError: () => setServerError('Kod tekrar gönderilemedi.'),
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 justify-center bg-white px-8 dark:bg-neutral-950"
    >
      <Text className="text-center text-3xl font-sans-bold text-neutral-900 dark:text-neutral-50">
        İki Adımlı Doğrulama
      </Text>
      <Text className="mt-1.5 text-center text-base text-neutral-500">
        Doğrulama yöntemi: {METHOD_LABELS[method]}
      </Text>

      {methods.length > 1 && (
        <View className="mt-4 flex-row flex-wrap justify-center gap-2">
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
        placeholder="Doğrulama kodu"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={method === 'RECOVERY' ? 'default' : 'number-pad'}
      />

      {info && <Text className="mt-3 text-center text-sm text-primary">{info}</Text>}
      {serverError && (
        <View className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
          <Text className="text-center text-sm font-sans-medium text-red-500">{serverError}</Text>
        </View>
      )}

      <Pressable
        className={
          verifyMutation.isPending
            ? 'mt-6 flex-row items-center justify-center gap-2 rounded-xl bg-primary/60 py-3.5'
            : 'mt-6 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3.5 active:opacity-80'
        }
        disabled={verifyMutation.isPending}
        onPress={handleSubmit((values) => {
          setServerError(null);
          verifyMutation.mutate(values);
        })}
      >
        {verifyMutation.isPending && <ActivityIndicator size="small" color="#ffffff" />}
        <Text className="text-center text-base font-sans-semibold text-white">
          {verifyMutation.isPending ? 'Doğrulanıyor…' : 'Doğrula'}
        </Text>
      </Pressable>

      {method === 'EMAIL' && (
        <Pressable
          className="mt-4"
          disabled={resendMutation.isPending}
          onPress={() => resendMutation.mutate()}
        >
          <Text className="text-center text-primary">E-posta kodunu tekrar gönder</Text>
        </Pressable>
      )}
    </KeyboardAvoidingView>
  );
}
