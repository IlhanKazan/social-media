import { Loader2 } from 'lucide-react';
import { useMentionSuggestions } from '@/features/mentions/hooks/use-mention-suggestions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Props {
  query: string;
  onSelect: (username: string) => void;
  className?: string;
}

export function MentionSuggestions({ query, onSelect, className }: Props) {
  const { data, isLoading } = useMentionSuggestions(query);
  const results = data ?? [];

  if (!query || (!isLoading && results.length === 0)) return null;

  return (
    <div
      className={cn(
        'absolute z-50 w-64 max-h-60 overflow-y-auto rounded-xl border bg-popover shadow-lg',
        className
      )}
    >
      {isLoading ? (
        <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Aranıyor...
        </div>
      ) : (
        results.map((user) => (
          <button
            key={user.id}
            type="button"
            // onMouseDown (not onClick) fires before the textarea blurs, so
            // selection/cursor state survives long enough to insert the mention.
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(user.username);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent transition-colors"
          >
            <Avatar size="sm" className="shrink-0">
              <AvatarImage src={user.profileImageUrl || undefined} />
              <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user.displayName || user.username}</div>
              <div className="truncate text-xs text-muted-foreground">@{user.username}</div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
