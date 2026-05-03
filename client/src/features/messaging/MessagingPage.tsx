import { useParams } from 'react-router-dom';
import { ConversationList } from './components/ConversationList';
import { ConversationView } from './components/ConversationView';
import { cn } from '@/lib/utils';

export function MessagingPage() {
  const { conversationId } = useParams();

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] sm:h-screen w-full overflow-hidden">
      <div
        className={cn(
          "h-full w-full md:w-80 lg:w-96 shrink-0 md:block border-r border-zinc-100 dark:border-zinc-800/50",
          conversationId ? "hidden" : "block"
        )}
      >
        <div className="px-4 py-3 border-b bg-background/95 backdrop-blur z-10 sticky top-0">
          <h2 className="text-xl font-bold">Mesajlar</h2>
        </div>
        <ConversationList />
      </div>

      <div
        className={cn(
          "flex-1 h-full min-w-0 md:flex flex-col bg-background relative",
          !conversationId ? "hidden" : "flex"
        )}
      >
        <ConversationView />
      </div>
    </div>
  );
}
