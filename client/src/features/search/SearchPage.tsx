import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Loader2, UserX, FileQuestion } from 'lucide-react';
import { useSearch } from './hooks/use-search';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PostCard } from '@/features/feed/components/PostCard';
import { useDebounce } from "@/hooks/use-debounce";
import { SuggestedUsers } from '@/features/profile/components/SuggestedUsers';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';

  const [inputValue, setInputValue] = useState(queryParam);
  const [activeTab, setActiveTab] = useState('users');

  const debouncedValue = useDebounce(inputValue, 500);

  useEffect(() => {
    setInputValue(queryParam);
  }, [queryParam]);

  useEffect(() => {
    if (debouncedValue.trim()) {
      setSearchParams({ q: debouncedValue.trim() });
    } else {
      setSearchParams({});
    }
  }, [debouncedValue, setSearchParams]);

  const { data, status, isFetching } = useSearch(queryParam);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const renderContent = () => {
    if (!queryParam) {
      return (
        <div className="flex flex-col items-center justify-center py-20 flex-1 text-muted-foreground gap-3">
          <Search className="h-12 w-12 opacity-20" />
          <p>Aramak istediğin kelimeyi yukarıya yaz.</p>
        </div>
      );
    }

    if (status === 'pending' || isFetching) {
      return (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="p-8 text-center text-sm text-destructive">
          Arama sonuçları getirilirken bir hata oluştu.
        </div>
      );
    }

    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList variant="line" className="w-full justify-start rounded-none border-b bg-transparent p-0 h-12">
          <TabsTrigger value="users" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">
            Kişiler ({data?.users.length || 0})
          </TabsTrigger>
          <TabsTrigger value="posts" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">
            Gönderiler ({data?.posts.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="m-0 border-none outline-none">
          {data?.users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <UserX className="h-12 w-12 opacity-20" />
              <p>Kullanıcı bulunamadı.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {data?.users.map((user) => (
                <Link
                  key={user.id}
                  to={`/u/${user.username}`}
                  className="flex items-center gap-3 p-4 border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-bold truncate text-[15px]">{user.displayName || user.username}</span>
                    <span className="text-sm text-muted-foreground truncate">@{user.username}</span>
                    {user.bio && <span className="text-sm text-muted-foreground truncate mt-0.5">{user.bio}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="posts" className="m-0 border-none outline-none">
          {data?.posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <FileQuestion className="h-12 w-12 opacity-20" />
              <p>Gönderi bulunamadı.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {data?.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b bg-background/95 p-4 backdrop-blur-md">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Kişileri veya gönderileri ara..."
            className="w-full h-12 pl-12 bg-zinc-100 dark:bg-zinc-900 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-1 rounded-full text-[15px] transition-colors"
          />
        </form>
      </div>

      <SuggestedUsers layout="horizontal" className="block lg:hidden" />

      {renderContent()}
    </div>
  );
}
