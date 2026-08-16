import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Heart, MessageCircle, Repeat2 } from 'lucide-react';

interface ShowcasePost {
  readonly id: number;
  readonly name: string;
  readonly handle: string;
  readonly verified?: boolean;
  readonly time: string;
  readonly likes: number;
  readonly replies: number;
  readonly reposts: number;
}

// Deliberately mirrors PostCard's structure — same avatar size, same 15px bold
// name, same muted meta row, same action spacing — so the panel reads as the
// product rather than as marketing art. Only the content is invented.
function ShowcaseCard({ post, body, live }: { post: ShowcasePost; body: string; live: boolean }) {
  return (
    <div className="border-b border-zinc-800/60 px-5 py-4">
      <div className="flex flex-row items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[13px] font-bold text-zinc-300">
          {post.name.slice(0, 1)}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-x-1.5 text-[15px]">
            <span className="truncate font-bold text-zinc-100">{post.name}</span>
            {post.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-blue-500" />}
            <span className="truncate text-[14px] text-zinc-500">@{post.handle}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-[14px] text-zinc-500">{post.time}</span>
          </div>

          <p className="mt-0.5 text-[15px] leading-relaxed text-zinc-300">{body}</p>

          <div className="mt-2.5 flex items-center gap-6 text-zinc-500">
            <span className="flex items-center gap-1.5 text-[13px]">
              <MessageCircle className="h-4 w-4" />
              {post.replies}
            </span>
            <span className="flex items-center gap-1.5 text-[13px]">
              <Repeat2 className="h-4 w-4" />
              {post.reposts}
            </span>
            <span
              className={`flex items-center gap-1.5 text-[13px] transition-colors duration-500 ${
                live ? 'text-rose-500' : ''
              }`}
            >
              <Heart className={`h-4 w-4 transition-transform duration-500 ${live ? 'scale-125 fill-rose-500' : ''}`} />
              {post.likes + (live ? 1 : 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const POSTS: readonly ShowcasePost[] = [
  { id: 1, name: 'Zeynep Kaya', handle: 'zeynepkaya', verified: true, time: '2dk', likes: 41, replies: 6, reposts: 3 },
  { id: 2, name: 'Mehmet Demir', handle: 'mdemir', time: '8dk', likes: 12, replies: 2, reposts: 0 },
  { id: 3, name: 'Selin Korkmaz', handle: 'selink', verified: true, time: '14dk', likes: 88, replies: 19, reposts: 11 },
  { id: 4, name: 'Can Aydın', handle: 'canaydin', time: '23dk', likes: 7, replies: 1, reposts: 1 },
];

export function LiveFeedShowcase() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [liveId, setLiveId] = useState<number | null>(null);

  // Ticks a like counter on one card at a time. The claim on this page is that
  // the feed updates without a refresh; showing it beats asserting it.
  useEffect(() => {
    if (reduceMotion) return;
    let index = 0;
    const timer = window.setInterval(() => {
      const post = POSTS[index % POSTS.length];
      index += 1;
      if (!post) return;
      setLiveId(post.id);
      window.setTimeout(() => setLiveId(null), 1400);
    }, 3800);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const bodies = t('auth.layout.showcase', { returnObjects: true }) as string[];
  const cards = POSTS.map((post, i) => ({ post, body: bodies[i] ?? '' }));

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      // Fades the column into the panel at both ends so the loop has no seam.
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 14%, black 78%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 14%, black 78%, transparent)',
      }}
      aria-hidden
    >
      <motion.div
        className="flex flex-col"
        animate={reduceMotion ? undefined : { y: ['0%', '-50%'] }}
        transition={{ duration: 34, ease: 'linear', repeat: Infinity }}
      >
        {/* Rendered twice so the translation can wrap seamlessly at -50%. */}
        {[0, 1].map((copy) => (
          <div key={copy} className="flex flex-col">
            {cards.map(({ post, body }) => (
              <ShowcaseCard key={`${copy}-${post.id}`} post={post} body={body} live={liveId === post.id} />
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
