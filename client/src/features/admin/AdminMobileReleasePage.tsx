import { useState } from 'react';
import { Loader2, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMobileRelease, useUpdateMobileRelease, type MobileReleaseInput } from './hooks/use-mobile-release';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const FIELDS = [
  { key: 'latestVersionCode' as const, type: 'number', required: true },
  { key: 'latestVersionName' as const, type: 'text', required: true },
  { key: 'minSupportedVersionCode' as const, type: 'number', required: true },
  { key: 'apkUrl' as const, type: 'text', required: true },
  { key: 'apkSha256' as const, type: 'text', required: true },
  { key: 'changelogUrl' as const, type: 'text', required: false },
];

function ReleaseForm({ initial }: { initial: MobileReleaseInput }) {
  const { t } = useTranslation();
  const updateMutation = useUpdateMobileRelease();
  const [form, setForm] = useState<MobileReleaseInput>(initial);

  const checksumValid = /^[a-fA-F0-9]{64}$/.test(form.apkSha256);
  const canSubmit =
    form.latestVersionCode > 0 &&
    form.minSupportedVersionCode > 0 &&
    form.latestVersionName.trim() !== '' &&
    form.apkUrl.trim() !== '' &&
    checksumValid &&
    !updateMutation.isPending;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        updateMutation.mutate(form);
      }}
    >
      {FIELDS.map(({ key, type, required }) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={key}>
            {t(`admin.mobileRelease.fields.${key}.label`)}
            {!required && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {t('admin.mobileRelease.optional')}
              </span>
            )}
          </Label>
          <Input
            id={key}
            type={type}
            value={form[key]}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                [key]: type === 'number' ? Number(e.target.value) : e.target.value,
              }))
            }
            placeholder={t(`admin.mobileRelease.fields.${key}.placeholder`)}
            className={key === 'apkSha256' ? 'font-mono text-xs' : ''}
          />
          <p className="text-xs text-muted-foreground">{t(`admin.mobileRelease.fields.${key}.hint`)}</p>
        </div>
      ))}

      {form.apkSha256 !== '' && !checksumValid && (
        <p className="text-xs font-medium text-destructive">{t('admin.mobileRelease.checksumInvalid')}</p>
      )}

      <Button type="submit" disabled={!canSubmit}>
        {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('admin.mobileRelease.submit')}
      </Button>
    </form>
  );
}

export function AdminMobileReleasePage() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useMobileRelease();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return <div className="p-8 text-center text-destructive">{t('admin.mobileRelease.loadError')}</div>;
  }

  const initial: MobileReleaseInput = {
    latestVersionCode: data.latestVersionCode,
    latestVersionName: data.latestVersionName,
    minSupportedVersionCode: data.minSupportedVersionCode,
    apkUrl: data.apkUrl,
    apkSha256: data.apkSha256,
    changelogUrl: data.changelogUrl,
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t('admin.mobileRelease.title')}</h1>
        <p className="text-[15px] text-muted-foreground">{t('admin.mobileRelease.subtitle')}</p>
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="flex flex-row items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-[16px]">{t('admin.mobileRelease.formTitle')}</CardTitle>
            <CardDescription>{t('admin.mobileRelease.formDescription')}</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {/* Keyed on the loaded release so the form re-initializes from server
              state after a successful publish, without a setState-in-effect. */}
          <ReleaseForm key={`${data.latestVersionCode}-${data.apkSha256}`} initial={initial} />
        </CardContent>
      </Card>
    </div>
  );
}
