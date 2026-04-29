import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Heart, MessageSquare, Repeat2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PostResponse, PageResponse } from '@/types/api';

interface PostCardProps {
  post: PostResponse;
}

export function PostCard({ post }: PostCardProps) {
  const queryClient = useQueryClient();

  const toggleLike = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/posts/${post.id}/interactions/like`);
      return res.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      const previousFeed = queryClient.getQueryData(['feed']);

      // Optimistic update
      queryClient.setQueryData<{ pages: PageResponse<PostResponse>[] }>(['feed'], (old) => {
        if (!old) return old;
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
      });

      return { previousFeed };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(['feed'], context.previousFeed);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  return (
    <Card className="border-x-0 rounded-none sm:border-x sm:rounded-xl shadow-none">
      <CardHeader className="flex flex-row items-start gap-4 p-4 pb-2">
        <Avatar>
          <AvatarImage src={post.author.profileImageUrl || undefined} />
          <AvatarFallback>{post.author.username.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold">{post.author.displayName || post.author.username}</span>
            <span className="text-muted-foreground text-sm">@{post.author.username}</span>
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-muted-foreground text-sm">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: tr })}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 pl-[4.5rem]">
        <p className="whitespace-pre-wrap text-sm">{post.content}</p>
        {post.imageUrl && (
          <div className="mt-3 overflow-hidden rounded-xl border">
            <img src={post.imageUrl} alt="Post attachment" className="w-full object-cover max-h-96" />
          </div>
        )}
      </CardContent>
      <CardFooter className="p-2 pl-[4rem] bg-transparent border-t-0">
        <div className="flex items-center gap-6 text-muted-foreground">
          <Button variant="ghost" size="sm" className="gap-2 hover:text-blue-500">
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs">{post.commentCount > 0 ? post.commentCount : ''}</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-2 hover:text-green-500">
            <Repeat2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("gap-2 hover:text-red-500", post.likedByMe && "text-red-500")}
            onClick={() => toggleLike.mutate()}
            disabled={toggleLike.isPending}
          >
            <Heart className={cn("h-4 w-4", post.likedByMe && "fill-current")} />
            <span className="text-xs">{post.likeCount > 0 ? post.likeCount : ''}</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
