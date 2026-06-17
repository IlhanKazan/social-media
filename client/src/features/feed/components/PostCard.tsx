import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { formatDistanceToNow, formatDistanceToNowStrict } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Heart, MessageSquare, MoreHorizontal, Trash2, Edit2, CornerDownRight, BadgeCheck, Repeat2, Flag, Send } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EditPostDialog } from '@/features/post/components/EditPostDialog';
import { QuoteDialog } from './QuoteDialog';
import { ShareToDmDialog } from './ShareToDmDialog';
import { useRepost } from '../hooks/use-repost';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { ReportDialog } from './ReportDialog'
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type {PostResponse, PublicAccountResponse} from '@/types/api';

interface PostCardProps {
  readonly post: PostResponse;
  readonly feedType?: 'POST' | 'REPOST';
  readonly reposter?: PublicAccountResponse;
  readonly connector?: 'none' | 'top' | 'bottom' | 'both';
}

export function PostCard({ post, feedType = 'POST', reposter, connector = 'none' }: PostCardProps) {
  const hasTopConnector = connector === 'top' || connector === 'both';
  const hasBottomConnector = connector === 'bottom' || connector === 'both';
  const showReplyContext = !hasTopConnector && !!post.parentPostId && !!post.parentPostAuthorUsername;
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const account = useAuthStore((state) => state.account);
  const repostMutation = useRepost();

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
        queryClient.setQueriesData<any>(
          { queryKey: [key] },
          (old: any) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                content: page.content.map((item: any) => {
                  const isFeedItem = 'post' in item && 'type' in item;
                  const actualPost = isFeedItem ? item.post : item;

                  if (actualPost.id === post.id) {
                    const updatedPost = {
                      ...actualPost,
                      likeCount: actualPost.likedByMe
                        ? Math.max(0, actualPost.likeCount - 1)
                        : actualPost.likeCount + 1,
                      likedByMe: !actualPost.likedByMe,
                    };
                    return isFeedItem ? { ...item, post: updatedPost } : updatedPost;
                  }
                  return item;
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
          likeCount: old.likedByMe
            ? Math.max(0, old.likeCount - 1)
            : old.likeCount + 1,
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
      <article
        role="button"
        tabIndex={0}
        className="relative flex flex-col border-b border-zinc-100 dark:border-zinc-800/50 bg-transparent hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 cursor-pointer transition-colors focus-visible:bg-zinc-50 dark:focus-visible:bg-zinc-900/20 outline-none"
        onClick={() => navigate(`/post/${post.id}`)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(`/post/${post.id}`);
          }
        }}
      >
        {hasTopConnector && (
          <span aria-hidden className="absolute left-[31px] top-0 h-3 w-0.5 bg-zinc-200 dark:bg-zinc-700" />
        )}
        {hasBottomConnector && (
          <span aria-hidden className="absolute left-[31px] top-13 bottom-0 w-0.5 bg-zinc-200 dark:bg-zinc-700" />
        )}
        {feedType === 'REPOST' && reposter && (
          <div className="flex items-center gap-1.5 px-4 pt-2.5 pb-0.5 text-[13px] font-bold text-muted-foreground">
            <Repeat2 className="h-4 w-4 ml-[36px]" />
            <Link
              to={`/u/${reposter.username}`}
              className="hover:underline hover:text-foreground transition-colors relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {reposter.id === account?.id ? 'Sen paylaştın' : `${reposter.displayName} paylaştı`}
            </Link>
          </div>
        )}

        <Card className="border-0 ring-0 rounded-none shadow-none bg-transparent">
          <CardHeader className={cn("flex flex-col gap-0 p-3 pb-0", (showReplyContext || feedType === 'REPOST') && "pt-0")}>

            {showReplyContext && (
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
              <Link
                to={`/u/${post.author.username}`}
                className="shrink-0 z-10 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
                onClick={(e) => e.stopPropagation()}
              >
                <Avatar className="h-10 w-10 transition-opacity hover:opacity-80">
                  <AvatarImage src={post.author.profileImageUrl || undefined} />
                  <AvatarFallback>{post.author.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Link>

              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2 w-full">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0 flex-1 z-10">
                    <Link
                      to={`/u/${post.author.username}`}
                      className="font-bold hover:underline truncate text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {post.author.displayName || post.author.username}
                    </Link>

                    {post.author.emailVerified && (
                      <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" />
                    )}

                    <Link
                      to={`/u/${post.author.username}`}
                      className="text-muted-foreground text-[15px] truncate hover:underline outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      @{post.author.username}
                    </Link>

                    <span className="text-muted-foreground text-sm shrink-0">·</span>
                    <span className="text-muted-foreground text-[15px] shrink-0 whitespace-nowrap">
                      {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: tr })}
                    </span>

                    {post.isEdited === true && (
                      <span className="text-muted-foreground text-xs italic shrink-0 whitespace-nowrap">
                        (Düzenlendi)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-auto shrink-0 z-20" onClick={(e) => e.stopPropagation()}>
                    {isMine && post.moderationStatus === 'FLAGGED' && (
                      <Badge variant="destructive" className="h-5 text-[10px] pointer-events-none">
                        İhlal: Gizlendi
                      </Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground rounded-full hover:bg-primary/10 hover:text-primary -mt-1 transition-colors" />
                      }>
                        <MoreHorizontal className="h-5 w-5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
                        {isMine ? (
                          <>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsEditOpen(true);
                              }}
                            >
                              <Edit2 className="mr-2 h-4 w-4" />
                              <span>Düzenle</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMutation.mutate();
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>{deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}</span>
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsReportOpen(true);
                            }}
                          >
                            <Flag className="mr-2 h-4 w-4" />
                            <span>Bildir</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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
                          onClick={(e) => e.stopPropagation()}
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

                  {post.quotedPost && (
                    <div
                      role="button"
                      tabIndex={0}
                      className="mt-3 block overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors text-left outline-none focus-visible:ring-2 focus-visible:ring-primary p-3 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/post/${post.quotedPost!.id}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/post/${post.quotedPost!.id}`);
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                        <Avatar className="h-5 w-5 shrink-0">
                          <AvatarImage src={post.quotedPost.author.profileImageUrl || undefined} />
                          <AvatarFallback>{post.quotedPost.author.username.substring(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-[14px] truncate">{post.quotedPost.author.displayName || post.quotedPost.author.username}</span>
                        {post.quotedPost.author.emailVerified && <BadgeCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                        <span className="text-muted-foreground text-[14px] truncate">@{post.quotedPost.author.username}</span>
                        <span className="text-muted-foreground text-sm shrink-0">·</span>
                        <span className="text-muted-foreground text-[14px] shrink-0">
                          {formatDistanceToNowStrict(new Date(post.quotedPost.createdAt), { locale: tr })}
                        </span>
                      </div>
                      <p className="text-[14px] line-clamp-3 whitespace-pre-wrap">{post.quotedPost.content}</p>
                      {post.quotedPost.imageUrl && (
                        <div className="mt-2 text-primary text-[13px] font-medium">Fotoğrafı gör</div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </div>
          </CardHeader>

          <CardFooter className="p-0 pl-[3.5rem] pb-2 bg-transparent border-t-0">
            <div className="flex items-center justify-start gap-4 sm:gap-8 w-full max-w-md text-muted-foreground">

              <Button
                variant="ghost"
                className="group/reply h-9 px-0 gap-1.5 bg-transparent hover:bg-transparent dark:hover:bg-transparent hover:text-blue-500 rounded-full transition-colors z-10 font-medium"
                onClick={(e) => { e.stopPropagation(); navigate(`/post/${post.id}`); }}
              >
                <span className="grid place-items-center h-9 w-9 rounded-full transition-colors group-hover/reply:bg-blue-500/10">
                  <MessageSquare className="h-[18px] w-[18px]" />
                </span>
                <span className="text-[14px]">{post.replyCount > 0 ? post.replyCount : ''}</span>
              </Button>

              <div className="shrink-0 z-20" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <Button
                      variant="ghost"
                      className={cn(
                        "group/repost h-9 px-0 gap-1.5 bg-transparent hover:bg-transparent dark:hover:bg-transparent rounded-full transition-colors font-medium outline-none",
                        post.repostedByMe ? "text-green-500" : "text-muted-foreground hover:text-green-500"
                      )}
                    >
                      <span className="grid place-items-center h-9 w-9 rounded-full transition-colors group-hover/repost:bg-green-500/10">
                        <Repeat2 className="h-[18px] w-[18px]" />
                      </span>
                      <span className="text-[14px]">{post.repostCount > 0 ? post.repostCount : ''}</span>
                    </Button>
                  } />
                  <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        repostMutation.mutate(post.id);
                      }}
                      disabled={repostMutation.isPending}
                    >
                      <Repeat2 className="mr-2 h-4 w-4" />
                      <span>{post.repostedByMe ? 'Repostu Geri Al' : 'Repost'}</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsQuoteOpen(true);
                      }}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span>Alıntı ile Paylaş</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsShareOpen(true);
                      }}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      <span>Mesajla Paylaş</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Button
                variant="ghost"
                className={cn(
                  "group/like h-9 px-0 gap-1.5 bg-transparent hover:bg-transparent dark:hover:bg-transparent hover:text-rose-500 rounded-full transition-colors z-10 font-medium",
                  post.likedByMe ? "text-rose-500" : "text-muted-foreground"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLike.mutate();
                }}
                disabled={toggleLike.isPending}
              >
                <span className="grid place-items-center h-9 w-9 rounded-full transition-colors group-hover/like:bg-rose-500/10">
                  <Heart className={cn("h-[18px] w-[18px]", post.likedByMe && "fill-current")} />
                </span>
                <span className="text-[14px]">{post.likeCount > 0 ? post.likeCount : ''}</span>
              </Button>

            </div>
          </CardFooter>
        </Card>
      </article>

      <EditPostDialog post={post} open={isEditOpen} onOpenChange={setIsEditOpen} />
      <ReportDialog postId={post.id} open={isReportOpen} onOpenChange={setIsReportOpen} />
      <QuoteDialog post={post} open={isQuoteOpen} onOpenChange={setIsQuoteOpen} />
      <ShareToDmDialog post={post} open={isShareOpen} onOpenChange={setIsShareOpen} />
    </>
  );
}
