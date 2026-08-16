import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2, Megaphone, Users } from 'lucide-react';
import { useAnnouncementAudience, useSendAnnouncement } from './hooks/use-announcements';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function AdminAnnouncementsPage() {
  const { t } = useTranslation();
  const audience = useAnnouncementAudience();
  const send = useSendAnnouncement();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [linkUrl, setLinkUrl] = useState('https://socialhan.ilhankazan.com/home');
  // Typing the recipient count out is the last gate before a mass send. A
  // checkbox is too easy to tick past; a number has to be read first.
  const [typedCount, setTypedCount] = useState('');

  const data = audience.data;
  const fits = data ? data.recipients <= data.remaining : false;
  const countMatches = data ? Number(typedCount) === data.recipients : false;

  const canSend =
    !!data &&
    fits &&
    countMatches &&
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    linkUrl.trim().length > 0 &&
    !send.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Megaphone className="h-6 w-6" />
          {t('admin.announcements.title')}
        </h1>
        <p className="mt-1 text-muted-foreground">{t('admin.announcements.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            {t('admin.announcements.audienceTitle')}
          </CardTitle>
          <CardDescription>{t('admin.announcements.audienceDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {audience.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : audience.isError || !data ? (
            <p className="text-sm text-destructive">{t('admin.announcements.audienceError')}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label={t('admin.announcements.recipients')} value={data.recipients} />
              <Stat label={t('admin.announcements.sentThisMonth')} value={data.sentThisMonth} />
              <Stat label={t('admin.announcements.remaining')} value={data.remaining} />
            </div>
          )}

          {data && !fits && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t('admin.announcements.quotaWarning')}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('admin.announcements.composeTitle')}</CardTitle>
          <CardDescription>{t('admin.announcements.composeDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!data) return;
              send.mutate({ title, message, linkUrl, confirm: data.recipients });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="title">{t('admin.announcements.fieldTitle')}</Label>
              <Input id="title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">{t('admin.announcements.fieldMessage')}</Label>
              <Textarea
                id="message"
                rows={6}
                value={message}
                maxLength={4000}
                onChange={(e) => setMessage(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('admin.announcements.messageHint')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkUrl">{t('admin.announcements.fieldLink')}</Label>
              <Input id="linkUrl" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
            </div>

            <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <Label htmlFor="confirm" className="text-amber-700 dark:text-amber-400">
                {t('admin.announcements.confirmLabel', { count: data?.recipients ?? 0 })}
              </Label>
              <Input
                id="confirm"
                inputMode="numeric"
                placeholder={String(data?.recipients ?? '')}
                value={typedCount}
                onChange={(e) => setTypedCount(e.target.value)}
                className="max-w-[10rem] font-mono"
              />
              <p className="text-xs text-muted-foreground">{t('admin.announcements.confirmHint')}</p>
            </div>

            <Button type="submit" disabled={!canSend} className="gap-2">
              {send.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('admin.announcements.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="font-mono text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
