import { useRef, useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth-store';
import { Loader2, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import type { PostResponse } from '@/types/api';

const createPostSchema = z.object({
  content: z.string().min(1, 'Gönderi boş olamaz').max(500, 'Maksimum 500 karakter'),
  imageUrl: z.string().optional(),
});

type CreatePostInput = z.infer<typeof createPostSchema>;

export function CreatePost() {
  const account = useAuthStore((state) => state.account);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: { content: '' }
  });

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ url: string }>('/posts/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.url;
    },
    onError: () => {
      toast.error('Fotoğraf yüklenemedi. Sadece JPG, PNG, WEBP veya GIF formatında (Max 5MB) olmalıdır.');
    }
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: CreatePostInput) => {
      const res = await api.post<PostResponse>('/posts', data);
      return res.data;
    },
    onSuccess: () => {
      reset();
      handleRemoveImage(); // Formu ve resmi sıfırla
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['explore'] });
      toast.success('Gönderi paylaşıldı!');
    },
    onError: () => {
      toast.error('Gönderi paylaşılamadı. Lütfen tekrar dene.');
    }
  });

  const onSubmit = async (data: CreatePostInput) => {
    let uploadedUrl = undefined;

    if (selectedFile) {
      try {
        uploadedUrl = await uploadImageMutation.mutateAsync(selectedFile);
      } catch (error) {
        return;
      }
    }

    createPostMutation.mutate({ ...data, imageUrl: uploadedUrl });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 5MB frontend kontrolü
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Dosya 5MB'dan büyük olamaz.");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isUploading = uploadImageMutation.isPending || createPostMutation.isPending;

  return (
    <div className="flex gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/50 bg-background">
      <Avatar className="h-10 w-10 shrink-0 mt-1">
        <AvatarImage src={account?.profileImageUrl || undefined} />
        <AvatarFallback>{account?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col w-full pt-0.5">
        <Textarea
          placeholder="Neler oluyor?"
          className="resize-none border-none shadow-none focus-visible:ring-0 px-3 py-2 text-[16px] min-h-[52px] bg-transparent text-foreground placeholder:text-muted-foreground/70 overflow-hidden"
          aria-invalid={!!errors.content}
          {...register('content')}
        />
        {errors.content && (
          <span className="text-xs font-medium text-destructive mt-1 px-3">{errors.content.message}</span>
        )}

        {previewUrl && (
          <div className="relative mt-2 mx-3 w-fit">
            <div className="relative group">
              <img src={previewUrl} alt="Upload preview" className="h-auto max-h-64 rounded-2xl border border-zinc-200 dark:border-zinc-800 object-cover" />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full transition-colors md:opacity-0 md:group-hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isUploading && (
              <div className="absolute inset-0 bg-background/50 rounded-2xl flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800/50">
          <div className="flex items-center">
            <input
              type="file"
              accept="image/jpeg, image/png, image/webp, image/gif"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageSelect}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-primary hover:bg-primary/10 transition-colors -ml-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || !!previewUrl}
            >
              <ImageIcon className="h-5 w-5" />
            </Button>
          </div>

          <Button
            type="submit"
            className="rounded-full font-bold px-5 h-9 transition-transform active:scale-95"
            disabled={isUploading || !watch('content')?.trim()}
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gönder'}
          </Button>
        </div>
      </form>
    </div>
  );
}
