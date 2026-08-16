import { Link } from 'react-router-dom';
import {
  Zap, MessagesSquare, Mail, ImageIcon, ArrowRight, Compass, Activity, Radio, ShieldCheck,
  ScanEye, KeyRound, RefreshCcw, Gauge, Smartphone, ScrollText, Languages, Search,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { useDocumentMeta } from '@/hooks/use-document-meta';
import { Footer } from './Footer';
import { ScrollReveal } from './ScrollReveal';
import { ScrollHighlight } from './ScrollHighlight';
import { ShineText } from './ShineText';
import { HoverCardStack } from './HoverCardStack';
import { FeatureMarquee } from './FeatureMarquee';
import { SiteHeader } from './SiteHeader';
import { ScrambleText } from './ScrambleText';
import { MagneticCursor } from './MagneticCursor';
import { WordReveal } from './MotionPrimitives';

const FEATURE_ICONS = [
  ['realtime', Zap], ['threads', MessagesSquare], ['dm', Mail], ['media', ImageIcon],
  ['moderation', ScanEye], ['mfa', KeyRound], ['sessions', RefreshCcw], ['ratelimit', Gauge],
  ['mobile', Smartphone], ['audit', ScrollText], ['i18n', Languages], ['search', Search],
] as const;

export function LandingPage() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  useDocumentMeta({
    title: undefined,
    description: t('marketing.landing.metaDescription'),
    path: '/',
  });

  const proofCards = [
    { key: 'load', icon: <Activity /> },
    { key: 'realtime', icon: <Radio /> },
    { key: 'security', icon: <ShieldCheck /> },
    { key: 'moderation', icon: <ScanEye /> },
  ].map(({ key, icon }) => ({
    id: key,
    icon,
    title: t(`marketing.landing.proof.${key}.title`),
    description: t(`marketing.landing.proof.${key}.desc`),
    meta: t(`marketing.landing.proof.${key}.meta`),
  }));

  const rise = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <MagneticCursor />
      <SiteHeader transparent />

      <main className="relative z-10 flex-1">
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-12 sm:pt-20">
          <div className="mx-auto max-w-2xl text-center">
            <WordReveal
              className="text-balance text-4xl font-bold leading-[1.08] tracking-tighter text-foreground sm:text-6xl"
              text={t('marketing.landing.heroTitle')}
            />

            <motion.p
              className="mx-auto mt-6 max-w-xl text-balance text-lg font-light leading-relaxed text-muted-foreground"
              {...rise}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              {t('marketing.landing.heroSubtitle')}
            </motion.p>

            <motion.div
              className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
              {...rise}
              transition={{ duration: 0.55, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            >
              <Button className="group h-12 w-full gap-2 px-8 text-base sm:w-auto" render={<Link to="/register" />}>
                {t('marketing.landing.getStarted')}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
              <Button variant="outline" className="h-12 w-full gap-2 px-8 text-base sm:w-auto" render={<Link to="/explore" />}>
                <Compass className="h-4 w-4" />
                {t('marketing.landing.browseWithoutAccount')}
              </Button>
            </motion.div>

            <motion.div {...rise} transition={{ duration: 0.55, delay: 0.24 }}>
              <Link
                to="/download"
                className="mt-4 inline-block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t('marketing.footer.downloadLink')}
              </Link>
            </motion.div>
          </div>

          {/* Breaks the section gutter so the strip runs edge to edge. */}
          <div className="mt-24 -mx-6">
            <FeatureMarquee
              items={FEATURE_ICONS.map(([key, Icon]) => ({
                key,
                icon: <Icon />,
                title: t(`marketing.landing.features.${key}.title`),
                description: t(`marketing.landing.features.${key}.desc`),
              }))}
            />
          </div>
        </section>

        <section className="border-t border-zinc-200 py-24 dark:border-zinc-800/60 sm:py-32">
          <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 lg:grid-cols-[1.15fr_1fr]">
            <div>
              <ScrollReveal>
                <ShineText
                  as="h2"
                  className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground"
                >
                  {t('marketing.landing.storyTitle')}
                </ShineText>
              </ScrollReveal>

              <ScrollHighlight
                className="mt-6 text-balance text-2xl font-medium leading-snug sm:text-[1.75rem]"
                text={t('marketing.landing.story')}
              />

              <ScrollReveal delay={0.08}>
                <p className="mt-8 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
                  <span className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
                    {t('marketing.landing.securityLabel')}
                  </span>
                  <ScrambleText
                    key={t('marketing.landing.securityLine')}
                    text={t('marketing.landing.securityLine')}
                    className="text-sm"
                  />
                </p>
              </ScrollReveal>

              <ScrollReveal delay={0.16}>
                <Button variant="outline" className="group mt-8 gap-2" render={<Link to="/architecture" />}>
                  {t('marketing.landing.storyCta')}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </ScrollReveal>
            </div>

            <ScrollReveal delay={0.15} className="flex justify-center lg:justify-end">
              <HoverCardStack cards={proofCards} />
            </ScrollReveal>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
