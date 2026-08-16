import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  useChangelogEntries,
  useDeleteChangelogEntry,
  useSaveChangelogEntry,
  type ChangelogAdminEntry,
  type ChangelogInput,
} from './hooks/use-changelog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const EMPTY: ChangelogInput = {
  version: '',
  titleTr: '',
  titleEn: '',
  bodyTr: '',
  bodyEn: '',
  published: false,
};

export function AdminChangelogPage() {
  const { t } = useTranslation();
  const entries = useChangelogEntries();
  const save = useSaveChangelogEntry();
  const remove = useDeleteChangelogEntry();

  const [editing, setEditing] = useState<{ id?: number; input: ChangelogInput } | null>(null);

  const startEdit = (entry: ChangelogAdminEntry) =>
    setEditing({
      id: entry.id,
      input: {
        version: entry.version,
        titleTr: entry.titleTr,
        titleEn: entry.titleEn,
        bodyTr: entry.bodyTr,
        bodyEn: entry.bodyEn,
        published: entry.publishedAt !== null,
      },
    });

  const patch = (partial: Partial<ChangelogInput>) =>
    setEditing((current) => (current ? { ...current, input: { ...current.input, ...partial } } : current));

  const input = editing?.input;
  const versionValid = !!input && /^\d+\.\d+\.\d+$/.test(input.version);
  const canSave =
    !!input &&
    versionValid &&
    input.titleTr.trim() &&
    input.titleEn.trim() &&
    input.bodyTr.trim() &&
    input.bodyEn.trim() &&
    !save.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FileText className="h-6 w-6" />
            {t('admin.changelog.title')}
          </h1>
          <p className="mt-1 text-muted-foreground">{t('admin.changelog.subtitle')}</p>
        </div>
        {!editing && (
          <Button className="gap-2" onClick={() => setEditing({ input: EMPTY })}>
            <Plus className="h-4 w-4" />
            {t('admin.changelog.new')}
          </Button>
        )}
      </div>

      {editing && input && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                {editing.id ? t('admin.changelog.editTitle') : t('admin.changelog.newTitle')}
              </CardTitle>
              <CardDescription>{t('admin.changelog.formDescription')}</CardDescription>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => setEditing(null)} aria-label={t('common.cancel')}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate({ id: editing.id, input }, { onSuccess: () => setEditing(null) });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="version">{t('admin.changelog.fieldVersion')}</Label>
                <Input
                  id="version"
                  value={input.version}
                  placeholder="1.2.0"
                  className="max-w-[12rem] font-mono"
                  onChange={(e) => patch({ version: e.target.value })}
                />
                {input.version && !versionValid && (
                  <p className="text-xs text-destructive">{t('admin.changelog.versionInvalid')}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="titleTr">{t('admin.changelog.fieldTitleTr')}</Label>
                  <Input id="titleTr" value={input.titleTr} maxLength={200} onChange={(e) => patch({ titleTr: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="titleEn">{t('admin.changelog.fieldTitleEn')}</Label>
                  <Input id="titleEn" value={input.titleEn} maxLength={200} onChange={(e) => patch({ titleEn: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bodyTr">{t('admin.changelog.fieldBodyTr')}</Label>
                  <Textarea id="bodyTr" rows={7} value={input.bodyTr} maxLength={8000} onChange={(e) => patch({ bodyTr: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bodyEn">{t('admin.changelog.fieldBodyEn')}</Label>
                  <Textarea id="bodyEn" rows={7} value={input.bodyEn} maxLength={8000} onChange={(e) => patch({ bodyEn: e.target.value })} />
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                  checked={input.published}
                  onChange={(e) => patch({ published: e.target.checked })}
                />
                <span>{t('admin.changelog.publishLabel')}</span>
              </label>

              <div className="flex gap-2">
                <Button type="submit" disabled={!canSave} className="gap-2">
                  {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('common.save')}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('admin.changelog.listTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : entries.isError ? (
            <p className="text-sm text-destructive">{t('admin.changelog.loadError')}</p>
          ) : entries.data && entries.data.content.length > 0 ? (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {entries.data.content.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{entry.version}</span>
                      {entry.publishedAt ? (
                        <Badge variant="secondary">{t('admin.changelog.published')}</Badge>
                      ) : (
                        <Badge variant="outline">{t('admin.changelog.draft')}</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{entry.titleTr}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => startEdit(entry)} aria-label={t('common.edit')}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        if (window.confirm(t('admin.changelog.deleteConfirm', { version: entry.version }))) {
                          remove.mutate(entry.id);
                        }
                      }}
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t('admin.changelog.empty')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
