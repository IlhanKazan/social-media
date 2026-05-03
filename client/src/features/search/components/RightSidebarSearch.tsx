import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { useTypeaheadUsers } from '../hooks/use-typeahead-users';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function RightSidebarSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(inputValue, 300);

  const { data: users, isFetching } = useTypeaheadUsers(debouncedQuery);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (location.pathname === '/search') {
    return null;
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setIsFocused(false);
      navigate(`/search?q=${encodeURIComponent(inputValue.trim())}`);
      setInputValue('');
    }
  };

  const showDropdown = isFocused && inputValue.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full z-50">
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Ara..."
          className="w-full h-12 pl-10 bg-zinc-100 dark:bg-zinc-900 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-1 rounded-full text-base transition-colors"
        />
      </form>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden flex flex-col">
          {isFetching && !users ? (
            <div className="p-4 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : users && users.length > 0 ? (
            <>
              {users.map((user) => (
                <Link
                  key={user.id}
                  to={`/u/${user.username}`}
                  onClick={() => {
                    setIsFocused(false);
                    setInputValue('');
                  }}
                  className="flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-[15px] truncate">{user.displayName || user.username}</span>
                    <span className="text-sm text-muted-foreground truncate">@{user.username}</span>
                  </div>
                </Link>
              ))}
              <button
                onClick={handleSearchSubmit}
                className="p-3 text-[15px] text-primary hover:bg-zinc-50 dark:hover:bg-zinc-900 text-left border-t border-zinc-100 dark:border-zinc-800 font-medium transition-colors"
              >
                "{inputValue}" için tüm sonuçları gör
              </button>
            </>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Sonuç bulunamadı
            </div>
          )}
        </div>
      )}
    </div>
  );
}
