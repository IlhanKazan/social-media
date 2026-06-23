import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2, Trash2 } from 'lucide-react';
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

const clampPosition = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

export function EditProfileDialog() {
  const account = useAuthStore((state) => state.account);
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverPosition, setCoverPosition] = useState(50);
  const dragState = useRef<{ startY: number; startPos: number; height: number } | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditProfileInput>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: { displayName: '', bio: '' },
  });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get<MyAccountResponse>('/accounts/me')).data,
    enabled: isOpen,
  });

  useEffect(() => {
    if (!me) return;
    setAvatarUrl(me.profileImageUrl ?? null);
    setCoverUrl(me.coverImageUrl ?? null);
    setCoverPosition(me.coverPosition ?? 50);
    reset({ displayName: me.displayName ?? '', bio: me.bio ?? '' });
  }, [me, reset]);

  const syncCaches = () => {
    queryClient.invalidateQueries({ queryKey: ['me'] });
    queryClient.invalidateQueries({ queryKey: ['profile', account?.username] });
  };

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
        setAvatarUrl(url);
        useAuthStore.setState({ account: { ...account!, profileImageUrl: url } });
      } else {
        setCoverUrl(url);
      }
      syncCaches();
      toast.success('Fotoğraf güncellendi');
    },
    onError: () => toast.error('Fotoğraf yüklenemedi'),
  });

  const removeImageMutation = useMutation({
    mutationFn: async (type: 'avatar' | 'cover') =>
      (await api.delete<MyAccountResponse>(`/accounts/me/${type}`)).data,
    onSuccess: (data, type) => {
      if (type === 'avatar') {
        setAvatarUrl(null);
        useAuthStore.setState({ account: { ...account!, profileImageUrl: null } });
      } else {
        setCoverUrl(null);
        setCoverPosition(data.coverPosition ?? 50);
      }
      syncCaches();
      toast.success('Fotoğraf kaldırıldı');
    },
    onError: () => toast.error('Fotoğraf kaldırılamadı'),
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: EditProfileInput) => {
      const res = await api.patch<MyAccountResponse>('/accounts/me', { ...data, coverPosition });
      return res.data;
    },
    onSuccess: (data) => {
      useAuthStore.setState({ account: { ...account!, displayName: data.displayName ?? account!.displayName } });
      syncCaches();
      toast.success('Profil güncellendi');
      setIsOpen(false);
    },
    onError: () => toast.error('Profil güncellenemedi'),
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) uploadImageMutation.mutate({ file, type });
    e.target.value = '';
  };

  // Drag the cover up/down to set its vertical focal point (object-position Y).
  const onCoverPointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!coverUrl) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = {
      startY: e.clientY,
      startPos: coverPosition,
      height: e.currentTarget.clientHeight,
    };
  };

  const onCoverPointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    const drag = dragState.current;
    if (!drag) return;
    const deltaPct = ((e.clientY - drag.startY) / drag.height) * 100;
    setCoverPosition(clampPosition(drag.startPos - deltaPct));
  };

  const onCoverPointerUp = (e: React.PointerEvent<HTMLImageElement>) => {
    if (dragState.current) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      dragState.current = null;
    }
  };

  const busy = uploadImageMutation.isPending || removeImageMutation.isPending || updateProfileMutation.isPending;

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
          <div className="h-32 sm:h-40 w-full bg-zinc-200 dark:bg-zinc-800 relative overflow-hidden group">
            <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} />
            {coverUrl && (
              <img
                src={coverUrl}
                alt="Kapak"
                draggable={false}
                onPointerDown={onCoverPointerDown}
                onPointerMove={onCoverPointerMove}
                onPointerUp={onCoverPointerUp}
                className="h-full w-full touch-none cursor-grab object-cover active:cursor-grabbing"
                style={{ objectPosition: `50% ${coverPosition}%` }}
              />
            )}

            <div className="pointer-events-none absolute inset-0 bg-black/10 opacity-0 transition-opacity group-hover:opacity-100" />

            <div className="absolute right-2 top-2 flex gap-2">
              <Button
                variant="ghost" size="icon"
                className="rounded-full bg-black/50 text-white hover:bg-black/70"
                onClick={() => coverInputRef.current?.click()}
                disabled={busy}
              >
                <Camera className="h-4 w-4" />
              </Button>
              {coverUrl && (
                <Button
                  variant="ghost" size="icon"
                  className="rounded-full bg-black/50 text-white hover:bg-black/70"
                  onClick={() => removeImageMutation.mutate('cover')}
                  disabled={busy}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {coverUrl && (
              <span className="pointer-events-none absolute bottom-1 left-2 rounded bg-black/40 px-1.5 py-0.5 text-[11px] text-white/90">
                Sürükleyerek hizala
              </span>
            )}
          </div>

          <div className="absolute -bottom-12 left-4">
            <div className="relative group">
              <Avatar className="h-24 w-24 rounded-full border-4 border-background bg-background">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-xl">{account?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />

              <button
                type="button"
                className="absolute inset-0 flex items-center justify-center rounded-full border-none bg-black/20 opacity-0 outline-none transition-opacity group-hover:opacity-100"
                onClick={() => avatarInputRef.current?.click()}
                disabled={busy}
              >
                <Camera className="h-6 w-6 text-white" />
              </button>

              {avatarUrl && (
                <Button
                  variant="ghost" size="icon"
                  className="absolute -right-1 -top-1 h-7 w-7 rounded-full bg-black/60 text-white hover:bg-black/80"
                  onClick={() => removeImageMutation.mutate('avatar')}
                  disabled={busy}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
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
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kaydet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
