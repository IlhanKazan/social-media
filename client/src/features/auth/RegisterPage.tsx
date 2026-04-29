import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { registerSchema, type RegisterInput } from './schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AuthResponse, ErrorResponse } from '@/types/api';

export function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const { register, handleSubmit, formState: { errors }, setError } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '', displayName: '' },
  });

  const mutation = useMutation<AuthResponse, AxiosError<ErrorResponse>, RegisterInput>({
    mutationFn: async (data) => {
      const res = await api.post<AuthResponse>('/auth/register', data);
      return res.data;
    },
    onSuccess: (data) => {
      login(data);
      navigate('/');
    },
    onError: (error) => {
      if (error.response?.data?.fieldErrors) {
        Object.entries(error.response.data.fieldErrors).forEach(([field, msg]) => {
          setError(field as keyof RegisterInput, { message: msg });
        });
      } else if (error.response?.data?.message) {
        setError('root', { message: error.response.data.message });
      } else {
        setError('root', { message: 'Registration failed. Please try again.' });
      }
    }
  });

  const onSubmit = (values: RegisterInput) => {
    mutation.mutate(values);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-sm text-muted-foreground mt-1">Enter your details to get started</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            placeholder="ilhankazan"
            className="bg-background"
            aria-invalid={!!errors.username}
            {...register('username')}
          />
          {errors.username && (
            <p className="text-sm font-medium text-destructive">{errors.username.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="mail@example.com"
            className="bg-background"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm font-medium text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name (Optional)</Label>
          <Input
            id="displayName"
            placeholder="İlhan Kazan"
            className="bg-background"
            aria-invalid={!!errors.displayName}
            {...register('displayName')}
          />
          {errors.displayName && (
            <p className="text-sm font-medium text-destructive">{errors.displayName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className="bg-background"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm font-medium text-destructive">{errors.password.message}</p>
          )}
        </div>

        {errors.root && (
          <p className="text-sm font-medium text-destructive">{errors.root.message}</p>
        )}

        <Button type="submit" className="w-full mt-2" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating account...' : 'Sign up'}
        </Button>
      </form>

      <div className="text-sm text-center text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
