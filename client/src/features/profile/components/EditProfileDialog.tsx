import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { editProfileSchema, type EditProfileInput } from '../schemas';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { MyAccountResponse } from '@/types/api';

export function EditProfileDialog() {
  const account = useAuthStore((state) => state.account);
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<EditProfileInput>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      displayName: account?.displayName || '',
      bio: '',
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: EditProfileInput) => {
      const res = await api.patch<MyAccountResponse>('/accounts/me', data);
      return res.data;
    },
    onSuccess: (data) => {
      useAuthStore.setState({ account: { ...account!, displayName: data.displayName ?? account!.displayName } });
      queryClient.invalidateQueries({ queryKey: ['profile', account?.username] });
      toast.success('Profil güncellendi');
      setIsOpen(false);
    },
    onError: () => toast.error('Profil güncellenemedi'),
  });

  const uploadImageMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: 'avatar' | 'cover' }) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<string>(`/accounts/me/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return { url: res.data, type };
    },
    onSuccess: ({ url, type }) => {
      if (type === 'avatar') {
        useAuthStore.setState({ account: { ...account!, profileImageUrl: url } });
      }
      queryClient.invalidateQueries({ queryKey: ['profile', account?.username] });
      toast.success('Fotoğraf güncellendi');
    },
    onError: () => toast.error('Fotoğraf yüklenemedi'),
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImageMutation.mutate({ file, type });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button variant="outline" className="rounded-full font-bold" />}>
        Profili Düzenle
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0">
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between">
          <DialogTitle>Profili Düzenle</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <div className="h-32 sm:h-40 w-full bg-zinc-200 dark:bg-zinc-800 relative flex items-center justify-center group">
            <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="rounded-full bg-black/50 text-white hover:bg-black/70" onClick={() => coverInputRef.current?.click()} disabled={uploadImageMutation.isPending}>
                <Camera className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="absolute -bottom-12 left-4">
            <div className="relative group">
              <Avatar className="h-24 w-24 rounded-full border-4 border-background bg-background">
                <AvatarImage src={account?.profileImageUrl || undefined} />
                <AvatarFallback className="text-xl">{account?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />

              <button
                type="button"
                className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none outline-none appearance-none"
                onClick={() => avatarInputRef.current?.click()}
              >
                <Camera className="h-6 w-6 text-white" />
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit((d) => updateProfileMutation.mutate(d))} className="p-4 pt-16 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Görünen Ad</Label>
            <Input id="displayName" {...register('displayName')} aria-invalid={!!errors.displayName} />
            {errors.displayName && <span className="text-xs text-destructive">{errors.displayName.message}</span>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Biyografi</Label>
            <Textarea id="bio" className="resize-none h-24" {...register('bio')} aria-invalid={!!errors.bio} />
            {errors.bio && <span className="text-xs text-destructive">{errors.bio.message}</span>}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <DialogClose render={<Button type="button" variant="ghost" />}>
              İptal
            </DialogClose>
            <Button type="submit" disabled={updateProfileMutation.isPending || uploadImageMutation.isPending}>
              {(updateProfileMutation.isPending || uploadImageMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kaydet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
