import { Outlet, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'motion/react';
import { LiveFeedShowcase } from '@/features/marketing/LiveFeedShowcase';

export function AuthLayout() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const enter = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

  return (
    // Pinned to the viewport on wide screens so the showcase column cannot grow
    // past the fold; the form column scrolls inside itself when a tall form
    // (register, with its consent block) needs more room than the screen has.
    <div className="grid min-h-screen grid-cols-1 lg:h-screen lg:min-h-0 lg:grid-cols-2">
      <div className="flex flex-col justify-center bg-background px-8 py-12 sm:px-12 lg:px-20 xl:px-32">
        <motion.div
          className="mx-auto w-full max-w-sm"
          {...enter}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            to="/"
            className="mb-12 inline-flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground transition-opacity hover:opacity-80"
          >
            <img src="/logo.svg" alt="SocialHan" className="h-10 w-10 rounded-xl shadow-lg shadow-primary/20" />
            SocialHan
          </Link>
          <Outlet />
        </motion.div>
      </div>

      <div className="sticky top-0 hidden h-screen overflow-hidden border-l border-zinc-800 bg-zinc-950 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(39,39,42,0.75),transparent)]" />

        <div className="relative flex h-full flex-col">
          <motion.div
            className="shrink-0 px-16 pt-16 xl:pt-20"
            {...enter}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="max-w-md text-3xl font-bold leading-tight tracking-tight text-white">
              {t('auth.layout.heading')}
            </p>
            <p className="mt-4 max-w-md text-lg font-light leading-relaxed text-zinc-400">
              {t('auth.layout.subtext')}
            </p>
          </motion.div>

          <div className="relative mt-8 min-h-0 flex-1">
            <LiveFeedShowcase />
          </div>
        </div>
      </div>
    </div>
  );
}
