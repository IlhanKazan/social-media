import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Loader2, Send, ArrowLeft, CheckCheck, Clock, ImagePlus } from 'lucide-react';
import { format } from 'date-fns';
import { useMessages, useMarkMessagesRead } from '../hooks/use-messages';
import { useSendDmImage } from '../hooks/use-dm-attachments';
import { useAuthStore } from '@/stores/auth-store';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { useWebSocket } from '@/hooks/use-websocket';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useConversations } from '../hooks/use-conversations';
import type { MessageResponse, PageResponse } from '@/types/api';

export function ConversationView() {
  const { conversationId } = useParams();
  const id = Number(conversationId);
  const account = useAuthStore((state) => state.account);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { publish, isConnected } = useWebSocket();
  const [content, setContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendImage = useSendDmImage(id);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) sendImage.mutate({ file });
  };

  const { data: convData } = useConversations();
  const conversation = convData?.pages.flatMap(p => p.content).find(c => c.id === id);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useMessages(id);
  const markAsRead = useMarkMessagesRead();
  const { targetRef, isIntersecting } = useIntersectionObserver({ threshold: 0.1 });

  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);

  useEffect(() => {
    if (conversationId) {
      markAsRead.mutate(id);
    }
  }, [conversationId]);

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !isConnected) return;

    const tempId = -Date.now();
    const newMsg: MessageResponse = {
      id: tempId,
      conversationId: id,
      sender: {
        id: account!.id,
        username: account!.username,
        displayName: account!.displayName,
        profileImageUrl: account!.profileImageUrl ?? undefined,
        bio: undefined,
        coverImageUrl: undefined,
        emailVerified: false,
        followerCount: 0,
        followingCount: 0,
        isFollowing: false,
        joinedAt: new Date().toISOString()
      },
      content: content.trim(),
      readAt: null,
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };

    queryClient.setQueryData<InfiniteData<PageResponse<MessageResponse>>>(['messages', id], (old) => {
      if (!old) return old;
      const newPages = [...old.pages];
      if (newPages[0]) {
        newPages[0] = { ...newPages[0], content: [newMsg, ...newPages[0].content] };
      }
      return { ...old, pages: newPages };
    });

    publish('/app/dm.send', { conversationId: id, content: content.trim() });
    setContent('');
  };

  if (!conversationId) {
    return (
      <div className="hidden md:flex h-full items-center justify-center text-muted-foreground flex-col gap-4">
        <div className="h-20 w-20 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center">
          <Send className="h-8 w-8 text-zinc-400" />
        </div>
        <p className="font-medium text-lg">Bir mesaj seç</p>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-background relative min-h-0">
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur z-10 shrink-0">
        <Link to="/messages" className="md:hidden">
          <Button variant="ghost" size="icon-sm" className="-ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        {conversation && (
          <Link to={`/u/${conversation.otherParticipant.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Avatar className="h-10 w-10">
              <AvatarImage src={conversation.otherParticipant.profileImageUrl || undefined} />
              <AvatarFallback>{conversation.otherParticipant.username.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-bold text-[15px] leading-tight">
                {conversation.otherParticipant.displayName || conversation.otherParticipant.username}
              </span>
              <span className="text-xs text-muted-foreground">@{conversation.otherParticipant.username}</span>
            </div>
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col-reverse gap-1.5 min-h-0">
        {data?.pages.map((page, pageIndex) =>
          page.content.map((msg, msgIndex) => {
            const isMine = msg.sender.id === account?.id;
            const isLatestMessage = pageIndex === 0 && msgIndex === 0;
            const showDetails = selectedMessageId === msg.id || (isLatestMessage && isMine && !!msg.readAt);

            return (
              <div key={msg.id} className={cn("flex w-full flex-col gap-1", isMine ? "items-end" : "items-start")}>
                <div className={cn("flex max-w-[75%] flex-col gap-1", isMine ? "items-end" : "items-start", msg.isOptimistic && "opacity-70")}>
                  {msg.imageUrl && (
                    <Dialog>
                      <DialogTrigger render={
                        <button
                          type="button"
                          className={cn(
                            "block overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 cursor-zoom-in outline-none",
                            isMine ? "rounded-br-sm" : "rounded-bl-sm"
                          )}
                        >
                          <img src={msg.imageUrl} alt="" className="max-h-80 w-auto max-w-full object-cover" />
                        </button>
                      } />
                      <DialogContent
                        className="max-w-none sm:max-w-none w-screen h-[100dvh] p-0 m-0 border-none bg-black/95 shadow-none flex items-center justify-center rounded-none text-white [&>button]:text-white [&>button]:hover:bg-white/20 [&>button]:right-4 [&>button]:top-4"
                        showCloseButton={true}
                      >
                        <DialogTitle className="sr-only">Fotoğraf</DialogTitle>
                        <img src={msg.imageUrl} alt="" className="max-w-full max-h-full w-auto h-auto object-contain select-none" />
                      </DialogContent>
                    </Dialog>
                  )}

                  {msg.sharedPost && (
                    <button
                      type="button"
                      onClick={() => navigate(`/post/${msg.sharedPost!.id}`)}
                      className="w-60 text-left rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-background hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors p-2.5 outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-1.5 mb-1 min-w-0">
                        <Avatar className="h-5 w-5 shrink-0">
                          <AvatarImage src={msg.sharedPost.author.profileImageUrl || undefined} />
                          <AvatarFallback>{msg.sharedPost.author.username.substring(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-[13px] truncate">{msg.sharedPost.author.displayName || msg.sharedPost.author.username}</span>
                        <span className="text-muted-foreground text-[13px] truncate">@{msg.sharedPost.author.username}</span>
                      </div>
                      {msg.sharedPost.contentSnippet && (
                        <p className="text-[13px] leading-snug line-clamp-3 whitespace-pre-wrap">{msg.sharedPost.contentSnippet}</p>
                      )}
                      {msg.sharedPost.imageUrl && (
                        <img src={msg.sharedPost.imageUrl} alt="" className="mt-1.5 rounded-lg w-full max-h-32 object-cover" />
                      )}
                    </button>
                  )}

                  {msg.content && (
                    <button
                      type="button"
                      onClick={() => setSelectedMessageId(showDetails ? null : msg.id)}
                      className={cn(
                        "rounded-2xl px-4 py-2 text-[15px] leading-relaxed cursor-pointer transition-all active:scale-[0.98] text-left border-none outline-none appearance-none",
                        isMine
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-zinc-100 dark:bg-zinc-800/80 rounded-bl-sm"
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </button>
                  )}

                  {!msg.content && !msg.imageUrl && !msg.sharedPost && (
                    <div className="rounded-2xl px-4 py-2 text-[13px] italic text-muted-foreground bg-zinc-100 dark:bg-zinc-800/80">
                      Bu gönderi artık mevcut değil
                    </div>
                  )}
                </div>

                {isMine && msg.isOptimistic && (
                  <div className="flex items-center gap-1 mt-1 mb-1 text-[11px] text-muted-foreground pr-1">
                    <Clock className="h-3 w-3" /> Gönderiliyor...
                  </div>
                )}

                {showDetails && !msg.isOptimistic && (
                  <div className={cn(
                    "flex items-center gap-1 mt-1 mb-2 text-[11px] text-muted-foreground",
                    isMine ? "pr-1" : "pl-1"
                  )}>
                    <span>{format(new Date(msg.createdAt), 'HH:mm')}</span>
                    {isMine && msg.readAt && (
                      <>
                        <span>·</span>
                        <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                        <span>Görüldü</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={targetRef} className="h-4 shrink-0 flex items-center justify-center">
          {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      <div className="p-3 border-t bg-background shrink-0 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <form onSubmit={handleSend} className="flex items-end gap-2 max-w-4xl mx-auto w-full bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-1 border">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleImageSelect}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl mb-1 ml-1 text-muted-foreground hover:text-primary"
            disabled={!isConnected || sendImage.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="h-5 w-5" />
          </Button>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Yeni mesaj..."
            className="min-h-[44px] max-h-32 border-0 shadow-none resize-none bg-transparent py-3 px-4 focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl mb-1 mr-1"
            disabled={!content.trim() || !isConnected}
          >
            <Send className="h-4 w-4 ml-0.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
