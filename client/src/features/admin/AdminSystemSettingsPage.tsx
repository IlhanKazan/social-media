import { Loader2, ShieldAlert, UserPlus, FileText, Bot, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSystemSettings, useUpdateSystemSetting } from './hooks/use-system-settings';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function AdminSystemSettingsPage() {
  const { t } = useTranslation();
  const { data: settings, isLoading, isError } = useSystemSettings();
  const updateMutation = useUpdateSystemSetting();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !settings) {
    return (
      <div className="p-8 text-center text-destructive">
        {t('admin.systemSettings.loadError')}
      </div>
    );
  }

  const handleToggle = (key: string, currentValue: boolean) => {
    updateMutation.mutate({ key, value: !currentValue });
  };

  const settingItems = [
    {
      key: 'registration_enabled',
      title: t('admin.systemSettings.items.registrationEnabled.title'),
      description: t('admin.systemSettings.items.registrationEnabled.description'),
      icon: UserPlus,
    },
    {
      key: 'moderation_enabled',
      title: t('admin.systemSettings.items.moderationEnabled.title'),
      description: t('admin.systemSettings.items.moderationEnabled.description'),
      icon: ShieldAlert,
    },
    {
      key: 'verified_only_posting',
      title: t('admin.systemSettings.items.verifiedOnlyPosting.title'),
      description: t('admin.systemSettings.items.verifiedOnlyPosting.description'),
      icon: FileText,
    },
    {
      key: 'bot_enabled',
      title: t('admin.systemSettings.items.botEnabled.title'),
      description: t('admin.systemSettings.items.botEnabled.description'),
      icon: Bot,
    },
    {
      key: 'read_only_mode',
      title: t('admin.systemSettings.items.readOnlyMode.title'),
      description: t('admin.systemSettings.items.readOnlyMode.description'),
      icon: Lock,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t('admin.systemSettings.title')}</h1>
        <p className="text-muted-foreground text-[15px]">
          {t('admin.systemSettings.subtitle')}
        </p>
      </div>

      <div className="grid gap-4">
        {settingItems.map((item) => {
          const isEnabled = settings[item.key] ?? false;

          return (
            <Card key={item.key} className="border-zinc-200 dark:border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-[16px]">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isEnabled}
                  disabled={updateMutation.isPending}
                  onClick={() => handleToggle(item.key, isEnabled)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
                    isEnabled ? "bg-primary" : "bg-zinc-200 dark:bg-zinc-800"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out",
                      isEnabled ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
