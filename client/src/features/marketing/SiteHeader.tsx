import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { to: '/architecture', key: 'architectureLink' },
  { to: '/download', key: 'downloadLink' },
  { to: '/changelog', key: 'changelogLink' },
  { to: '/about', key: 'aboutLink' },
] as const;

/**
 * The one header every public page uses.
 *
 * The landing page and the legal pages had grown separate headers — different
 * widths, different contents, one with sign-in buttons and one with a back
 * link — so moving between them looked like moving between two sites. The
 * sections are the same links the footer already carries, promoted so a reader
 * who lands on the privacy page can reach the rest without scrolling.
 *
 * `transparent` lets the landing hero start at the top of the viewport while
 * every other page keeps a rule under the header to separate it from prose.
 */
export function SiteHeader({ transparent = false }: { readonly transparent?: boolean }) {
  const { t } = useTranslation();

  return (
    <header
      className={cn(
        'relative z-10',
        !transparent && 'border-b border-zinc-200 dark:border-zinc-800/60'
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2.5 text-lg font-bold tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          <img src="/logo.svg" alt="SocialHan" className="h-8 w-8 rounded-lg shadow-sm shadow-primary/20" />
          SocialHan
        </Link>

        {/* Hidden on small screens rather than folded into a menu: these are
            secondary pages, and the footer carries the same links a tap away. */}
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {SECTIONS.map((section) => (
            <NavLink
              key={section.to}
              to={section.to}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-zinc-100 font-medium text-foreground dark:bg-zinc-800/60'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              {t(`marketing.footer.${section.key}`)}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Button variant="ghost" size="sm" render={<Link to="/login" />}>
            {t('nav.signIn')}
          </Button>
          <Button size="sm" render={<Link to="/register" />}>
            {t('nav.signUp')}
          </Button>
        </div>
      </div>
    </header>
  );
}
