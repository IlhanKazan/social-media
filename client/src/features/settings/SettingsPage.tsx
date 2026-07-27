import {
  Monitor,
  Moon,
  Sun,
  Languages,
  AlertTriangle,
  ShieldAlert,
  LogOut,
  MailCheck,
  Loader2,
  BadgeCheck,
  KeyRound
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/components/theme-provider';
import { useLanguage } from '@/components/language-provider';
import { useLogoutAll, useDeleteAccount } from './hooks/use-security';
import { useChangePassword } from './hooks/use-settings';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MfaSection } from './components/MfaSection';
import { TotpSection } from './components/TotpSection';
import { NotificationPreferencesSection } from './components/NotificationPreferencesSection';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import type { MyAccountResponse } from '@/types/api';
import { useState } from "react";
import { Link } from 'react-router-dom';

export function SettingsPage() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const logoutAllMutation = useLogoutAll();
  const deleteAccountMutation = useDeleteAccount();
  const changePasswordMutation = useChangePassword();
  const logout = useAuthStore((state) => state.logout);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { data: account, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get<MyAccountResponse>('/accounts/me');
      return data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      await api.post('/accounts/me/email/send-verification');
    },
    onSuccess: () => {
      toast.success(t('settings.emailVerification.successToastTitle'), {
        description: t('settings.emailVerification.successToastDescription')
      });
    },
    onError: (error: any) => {
      if (error.response?.status === 429) {
        toast.error(t('settings.emailVerification.rateLimitedToastTitle'), {
          description: t('settings.emailVerification.rateLimitedToastDescription')
        });
      } else {
        toast.error(t('settings.emailVerification.errorToastTitle'), {
          description: t('settings.emailVerification.errorToastDescription')
        });
      }
    }
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error(t('settings.changePassword.minLengthError'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('settings.changePassword.mismatchError'));
      return;
    }

    if (oldPassword === newPassword) {
      toast.error(t('settings.changePassword.sameAsOldError'));
      return;
    }

    changePasswordMutation.mutate({ oldPassword, newPassword });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <h2 className="text-xl font-bold">{t('settings.title')}</h2>
      </div>

      <div className="p-4 space-y-8 max-w-2xl">

        <section className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-bold">{t('settings.appearance.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('settings.appearance.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              className="gap-2"
              onClick={() => setTheme('light')}
            >
              <Sun className="h-4 w-4" /> {t('settings.appearance.light')}
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              className="gap-2"
              onClick={() => setTheme('dark')}
            >
              <Moon className="h-4 w-4" /> {t('settings.appearance.dark')}
            </Button>
            <Button
              variant={theme === 'system' ? 'default' : 'outline'}
              className="gap-2"
              onClick={() => setTheme('system')}
            >
              <Monitor className="h-4 w-4" /> {t('settings.appearance.system')}
            </Button>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-bold">{t('settings.language.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('settings.language.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant={language === 'tr' ? 'default' : 'outline'}
              className="gap-2"
              onClick={() => setLanguage('tr')}
            >
              <Languages className="h-4 w-4" /> {t('settings.language.turkish')}
            </Button>
            <Button
              variant={language === 'en' ? 'default' : 'outline'}
              className="gap-2"
              onClick={() => setLanguage('en')}
            >
              <Languages className="h-4 w-4" /> {t('settings.language.english')}
            </Button>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-bold">{t('settings.notificationPreferences.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('settings.notificationPreferences.subtitle')}</p>
          </div>
          <NotificationPreferencesSection />
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-bold">{t('settings.emailVerification.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('settings.emailVerification.subtitle')}</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-card">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[15px]">{t('settings.emailVerification.statusLabel')}</span>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : account?.emailVerified ? (
                  <BadgeCheck className="h-5 w-5 text-blue-500" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                )}
              </div>
              {account?.email && (
                <p className="text-sm font-medium break-all">{account.email}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? t('settings.emailVerification.checking')
                  : account?.emailVerified
                    ? t('settings.emailVerification.verified')
                    : t('settings.emailVerification.notVerified')}
              </p>
            </div>

            {!isLoading && !account?.emailVerified && (
              <Button
                variant="outline"
                onClick={() => verifyMutation.mutate()}
                disabled={verifyMutation.isPending}
                className="shrink-0 gap-2"
              >
                {verifyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
                {t('settings.emailVerification.sendVerification')}
              </Button>
            )}
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2"><KeyRound className="h-5 w-5" /> {t('settings.changePassword.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('settings.changePassword.subtitle')}</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-card">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('settings.changePassword.currentPasswordLabel')}</label>
              <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('settings.changePassword.newPasswordLabel')}</label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('settings.changePassword.confirmPasswordLabel')}</label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
            </div>
            <div className="pt-2">
              <Button type="submit" disabled={changePasswordMutation.isPending || !oldPassword || !newPassword || !confirmPassword}>
                {changePasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t('settings.changePassword.submit')}
              </Button>
            </div>
          </form>
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-bold">{t('settings.security.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('settings.security.subtitle')}</p>
          </div>
          <MfaSection enabled={account?.mfaEmailEnabled ?? false} emailVerified={account?.emailVerified ?? false} />
          <TotpSection enabled={account?.mfaTotpEnabled ?? false} />
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-bold">{t('settings.session.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('settings.session.subtitle')}</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <div>
              <p className="font-bold text-[15px]">{t('settings.session.signOutTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('settings.session.signOutSubtitle')}</p>
            </div>
            <Button variant="outline" onClick={() => void logout()} className="gap-2 shrink-0">
              <LogOut className="h-4 w-4" /> {t('settings.session.signOut')}
            </Button>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-destructive flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> {t('settings.dangerZone.title')}
            </h3>
            <p className="text-sm text-muted-foreground">{t('settings.dangerZone.subtitle')}</p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <div>
                <p className="font-bold text-[15px]">{t('settings.dangerZone.signOutAllTitle')}</p>
                <p className="text-sm text-muted-foreground">{t('settings.dangerZone.signOutAllSubtitle')}</p>
              </div>

              <Dialog>
                <DialogTrigger render={<Button variant="outline" className="shrink-0" />}>
                  {t('settings.dangerZone.signOutAll')}
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('settings.dangerZone.confirmTitle')}</DialogTitle>
                    <DialogDescription>
                      {t('settings.dangerZone.signOutAllConfirmBody')}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose render={<Button variant="ghost" />}>{t('settings.dangerZone.cancel')}</DialogClose>
                    <Button
                      variant="destructive"
                      disabled={logoutAllMutation.isPending}
                      onClick={() => logoutAllMutation.mutate()}
                    >
                      {logoutAllMutation.isPending ? t('settings.dangerZone.signingOut') : t('settings.dangerZone.confirmSignOutAll')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-destructive/20 bg-destructive/5 rounded-xl">
              <div>
                <p className="font-bold text-[15px] text-destructive">{t('settings.dangerZone.deleteAccountTitle')}</p>
                <p className="text-sm text-muted-foreground">{t('settings.dangerZone.deleteAccountSubtitle')}</p>
              </div>

              <Dialog>
                <DialogTrigger render={<Button variant="destructive" className="shrink-0" />}>
                  {t('settings.dangerZone.deleteAccount')}
                </DialogTrigger>
                <DialogContent className="border-destructive/20">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" /> {t('settings.dangerZone.deleteConfirmTitle')}
                    </DialogTitle>
                    <DialogDescription>
                      {t('settings.dangerZone.deleteConfirmBody')}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose render={<Button variant="ghost" />}>{t('settings.dangerZone.giveUp')}</DialogClose>
                    <Button
                      variant="destructive"
                      disabled={deleteAccountMutation.isPending}
                      onClick={() => deleteAccountMutation.mutate()}
                    >
                      {deleteAccountMutation.isPending ? t('settings.dangerZone.deleting') : t('settings.dangerZone.confirmDelete')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-3">
          <div>
            <h3 className="text-lg font-bold">{t('settings.legal.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('settings.legal.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link to="/about" className="text-primary hover:underline">{t('settings.legal.about')}</Link>
            <Link to="/privacy" className="text-primary hover:underline">{t('settings.legal.privacy')}</Link>
            <Link to="/terms" className="text-primary hover:underline">{t('settings.legal.terms')}</Link>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('settings.legal.disclaimer')}
          </p>
        </section>

      </div>
    </div>
  );
}
