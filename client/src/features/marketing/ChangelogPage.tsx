import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Loader2, Tag } from 'lucide-react';
import { api } from '@/lib/api';
import { useDocumentMeta } from '@/hooks/use-document-meta';
import { LegalTitle } from './LegalProse';
import type { PageResponse } from '@/types/api';

interface ChangelogEntry {
  readonly id: number;
  readonly version: string;
  readonly title: string;
  readonly body: string;
  readonly publishedAt: string;
}

export function ChangelogPage() {
  const { t, i18n } = useTranslation();

  useDocumentMeta({
    title: t('legal.changelog.title'),
    description: t('legal.changelog.description'),
    path: '/changelog',
  });

  const { data, isPending, isError } = useQuery({
    // Keyed on language: the server resolves the copy, so a language switch has
    // to fetch again rather than reuse the other language's cached entries.
    queryKey: ['changelog', i18n.language],
    queryFn: async () => {
      const { data } = await api.get<PageResponse<ChangelogEntry>>('/changelog', {
        params: { lang: i18n.language, size: 30 },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const entries = data?.content ?? [];

  return (
    <article>
      <LegalTitle title={t('legal.changelog.title')} />

      {isPending && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">{t('legal.changelog.loadError')}</p>}

      {!isPending && !isError && entries.length === 0 && (
        <p className="text-muted-foreground">{t('legal.changelog.empty')}</p>
      )}

      <div className="flex flex-col gap-8">
        {entries.map((entry) => (
          <section key={entry.id} className="border-l-2 border-zinc-200 pl-5 dark:border-zinc-800">
            <div className="mb-1.5 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-primary">
                <Tag className="h-3 w-3" />
                {entry.version}
              </span>
              <time
                dateTime={entry.publishedAt}
                className="text-xs text-muted-foreground"
              >
                {new Date(entry.publishedAt).toLocaleDateString(i18n.language, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </div>

            <h2 className="text-lg font-bold text-foreground">{entry.title}</h2>
            {/* Written as plain text by an admin; rendering it as markup would
                make the editor an injection surface for no benefit. */}
            <p className="mt-1.5 whitespace-pre-line leading-relaxed text-muted-foreground">
              {entry.body}
            </p>
          </section>
        ))}
      </div>
    </article>
  );
}
