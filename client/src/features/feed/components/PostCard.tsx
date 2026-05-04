import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Heart, MessageSquare, MoreHorizontal, Trash2, Edit2, CornerDownRight } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EditPostDialog } from '@/features/post/components/EditPostDialog';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { PostResponse, PageResponse } from '@/types/api';

interface PostCardProps {
  readonly post: PostResponse;
}

export function PostCard({ post }: PostCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const account = useAuthStore((state) => state.account);

  const isMine = account?.id === post.author.id;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/posts/${post.id}`);
    },
    onSuccess: () => {
      toast.success('Gönderi silindi');
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['explore'] });
      queryClient.invalidateQueries({ queryKey: ['profile-feed'] });
    },
    onError: () => {
      toast.error('Gönderi silinirken bir hata oluştu');
    }
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/posts/${post.id}/interactions/like`);
      return res.data;
    },
    onMutate: async () => {
      const listKeys = ['feed', 'explore', 'profile-feed'];

      const previousData = listKeys.map(key => ({
        key: [key],
        data: queryClient.getQueryData([key])
      }));
      const previousPost = queryClient.getQueryData(['post', post.id]);

      listKeys.forEach(key => {
        queryClient.setQueriesData<{ pages: PageResponse<PostResponse>[] }>(
          { queryKey: [key] },
          (old) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                content: page.content.map((p) => {
                  if (p.id === post.id) {
                    return {
                      ...p,
                      likeCount: p.likedByMe ? p.likeCount - 1 : p.likeCount + 1,
                      likedByMe: !p.likedByMe,
                    };
                  }
                  return p;
                }),
              })),
            };
          }
        );
      });

      queryClient.setQueryData<PostResponse>(['post', post.id], (old) => {
        if (!old) return old;
        return {
          ...old,
          likeCount: old.likedByMe ? old.likeCount - 1 : old.likeCount + 1,
          likedByMe: !old.likedByMe,
        };
      });

      return { previousData, previousPost };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach(({ key, data }) => {
          if (data) queryClient.setQueryData(key, data);
        });
      }
      if (context?.previousPost) {
        queryClient.setQueryData(['post', post.id], context.previousPost);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        predicate: (query) => ['feed', 'explore', 'profile-feed', 'post'].includes(query.queryKey[0] as string)
      });
    },
  });

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        className="border-x-0 border-t-0 border-b border-zinc-100 dark:border-zinc-800/50 ring-0 rounded-none shadow-none bg-transparent hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 cursor-pointer transition-colors focus-visible:bg-zinc-50 dark:focus-visible:bg-zinc-900/20 outline-none"
        onClick={() => navigate(`/post/${post.id}`)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(`/post/${post.id}`);
          }
        }}
      >
        <CardHeader className={cn("flex flex-col gap-0 p-3 pb-0", post.parentPostId && "pt-0")}>

          {post.parentPostId && post.parentPostAuthorUsername && (
            <button
              type="button"
              className="flex items-center gap-1.5 text-[13px] text-muted-foreground ml-[52px] mb-1.5 font-medium z-10 appearance-none bg-transparent border-none p-0 text-left cursor-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <CornerDownRight className="h-3.5 w-3.5" />
              <Link to={`/u/${post.parentPostAuthorUsername}`} className="hover:text-primary transition-colors truncate max-w-[150px]">
                @{post.parentPostAuthorUsername}
              </Link>
              <Link to={`/post/${post.parentPostId}`} className="shrink-0 hover:text-foreground hover:underline transition-colors">
                adlı kullanıcıya yanıt olarak
              </Link>
            </button>
          )}

          <div className="flex flex-row items-start gap-3">
            <Link to={`/u/${post.author.username}`} className="shrink-0 z-10" onClick={(e) => e.stopPropagation()}>
              <Avatar className="h-10 w-10 transition-opacity hover:opacity-80">
                <AvatarImage src={post.author.profileImageUrl || undefined} />
                <AvatarFallback>{post.author.username.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>

            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 truncate z-10">
                  <Link to={`/u/${post.author.username}`} className="font-bold hover:underline truncate text-[15px]" onClick={(e) => e.stopPropagation()}>
                    {post.author.displayName || post.author.username}
                  </Link>
                  <span className="text-muted-foreground text-[15px] truncate">@{post.author.username}</span>
                  <span className="text-muted-foreground text-sm shrink-0">·</span>
                  <span className="text-muted-foreground text-[15px] shrink-0 hover:underline">
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: tr })}
                  </span>
                </div>

                {isMine && (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button variant="ghost" size="icon-sm" className="h-8 w-8 shrink-0 z-10 text-muted-foreground rounded-full hover:bg-primary/10 hover:text-primary -mt-1 -mr-2 transition-colors" />
                    }>
                      <MoreHorizontal className="h-5 w-5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem className="cursor-pointer" onClick={() => setIsEditOpen(true)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        <span>Düzenle</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>{deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="mt-1">
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{post.content}</p>

                {post.imageUrl && (
                  <div className="mt-3">
                    <Dialog>
                      <DialogTrigger render={
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="w-full block overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 cursor-zoom-in group p-0 bg-transparent text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <img
                            src={post.imageUrl}
                            alt="Post attachment"
                            className="w-full object-cover max-h-[500px] transition-transform group-hover:scale-[1.02]"
                          />
                        </button>
                      } />

                      <DialogContent
                        className="max-w-none sm:max-w-none w-screen h-[100dvh] p-0 m-0 border-none bg-black/95 shadow-none flex items-center justify-center rounded-none text-white [&>button]:text-white [&>button]:hover:bg-white/20 [&>button]:right-4 [&>button]:top-4 [&>button]:h-10 [&>button]:w-10"
                        showCloseButton={true}
                      >
                        <DialogTitle className="sr-only">Fotoğrafı İncele</DialogTitle>
                        <img
                          src={post.imageUrl}
                          alt="Post attachment fullscreen"
                          className="max-w-full max-h-full w-auto h-auto object-contain select-none"
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardFooter className="p-0 pl-[3.5rem] pb-2 bg-transparent border-t-0">
          <div className="flex items-center gap-8 w-full max-w-md text-muted-foreground">

            <Button
              variant="ghost"
              className="h-9 px-3 gap-2 hover:text-blue-500 hover:bg-blue-500/10 rounded-full transition-colors z-10 font-medium"
              onClick={(e) => { e.stopPropagation(); navigate(`/post/${post.id}`); }}
            >
              <MessageSquare className="h-[18px] w-[18px]" />
              <span className="text-[14px]">{post.replyCount > 0 ? post.replyCount : ''}</span>
            </Button>

            <Button
              variant="ghost"
              className={cn(
                "h-9 px-3 gap-2 hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-colors z-10 font-medium",
                post.likedByMe ? "text-rose-500" : "text-muted-foreground"
              )}
              onClick={(e) => {
                e.stopPropagation();
                toggleLike.mutate();
              }}
              disabled={toggleLike.isPending}
            >
              <Heart className={cn("h-[18px] w-[18px]", post.likedByMe && "fill-current")} />
              <span className="text-[14px]">{post.likeCount > 0 ? post.likeCount : ''}</span>
            </Button>

          </div>
        </CardFooter>
      </Card>

      <EditPostDialog post={post} open={isEditOpen} onOpenChange={setIsEditOpen} />
    </>
  );
}
