import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Loader2, CalendarDays } from 'lucide-react';

import { EditProfileDialog } from './components/EditProfileDialog';
import { useProfile } from './hooks/use-profile';
import { useProfileFeed } from './hooks/use-profile-feed';
import { useFollowUser } from './hooks/use-follow-user';
import { useAuthStore } from '@/stores/auth-store';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PostCard } from '@/features/feed/components/PostCard';

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const currentUser = useAuthStore((state) => state.account);

  const { data: profile, status: profileStatus } = useProfile(username!);
  const { data: feed, fetchNextPage, hasNextPage, isFetchingNextPage, status: feedStatus } = useProfileFeed(username!);
  const followMutation = useFollowUser(username!, profile?.id || 0);

  const { targetRef, isIntersecting } = useIntersectionObserver({ threshold: 0.5 });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (profileStatus === 'pending') {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (profileStatus === 'error' || !profile) {
    return <div className="p-8 text-center text-muted-foreground">Kullanıcı bulunamadı.</div>;
  }

  const isOwnProfile = currentUser?.username === profile.username;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="h-32 sm:h-48 w-full bg-zinc-200 dark:bg-zinc-800 relative">
        {profile.coverImageUrl && (
          <img src={profile.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="flex justify-between items-start">
          <Avatar className="h-20 w-20 sm:h-32 sm:w-32 rounded-full border-4 border-background -mt-10 sm:-mt-16 bg-background">
            <AvatarImage src={profile.profileImageUrl || undefined} />
            <AvatarFallback className="text-2xl">{profile.username.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="pt-3 border-transparent">
            {isOwnProfile ? (
                <EditProfileDialog />
              ) : (
              <Button
                variant={profile.isFollowing ? "outline" : "default"}
                className="rounded-full font-bold px-6"
                onClick={() => followMutation.mutate(profile.isFollowing)}
                disabled={followMutation.isPending}
              >
                {profile.isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-3">
          <h1 className="text-xl font-bold truncate">{profile.displayName || profile.username}</h1>
          <p className="text-muted-foreground text-sm truncate">@{profile.username}</p>
        </div>

        {profile.bio && (
          <p className="mt-3 text-sm whitespace-pre-wrap">{profile.bio}</p>
        )}

        <div className="flex items-center gap-2 mt-3 text-muted-foreground text-sm">
          <CalendarDays className="h-4 w-4" />
          <span>{format(new Date(profile.joinedAt), 'MMMM yyyy', { locale: tr })} tarihinde katıldı</span>
        </div>

        <div className="flex gap-4 mt-3 text-sm">
          <div className="flex gap-1">
            <span className="font-bold text-foreground">{profile.followingCount}</span>
            <span className="text-muted-foreground">Takip Edilen</span>
          </div>
          <div className="flex gap-1">
            <span className="font-bold text-foreground">{profile.followerCount}</span>
            <span className="text-muted-foreground">Takipçi</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList variant="line" className="w-full justify-start rounded-none border-b bg-transparent p-0 h-12">
          <TabsTrigger
            value="posts"
            className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
          >
            Gönderiler
          </TabsTrigger>
          <TabsTrigger value="replies" className="flex-1 rounded-none" disabled>
            Yanıtlar
          </TabsTrigger>
          <TabsTrigger value="likes" className="flex-1 rounded-none" disabled>
            Beğeniler
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="m-0 border-none outline-none">
          {feedStatus === 'pending' ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : feedStatus === 'error' ? (
            <div className="p-4 text-center text-sm text-destructive">Gönderiler yüklenemedi.</div>
          ) : (
            <div className="flex flex-col">
              {feed.pages.map((page) =>
                page.content.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))
              )}
              <div ref={targetRef} className="flex h-16 items-center justify-center">
                {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                {!hasNextPage && feed.pages[0]?.content.length === 0 && (
                  <span className="text-sm text-muted-foreground">Henüz gönderi yok.</span>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
