import { Loader2, Users, FileText, Activity, Mail, ShieldAlert, RefreshCw, Flag } from 'lucide-react';
import { useAdminMetrics } from './hooks/use-admin-metrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function AdminDashboardPage() {
  const { data, isLoading, isError, isFetching } = useAdminMetrics();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8 text-center text-destructive border border-destructive/20 bg-destructive/10 rounded-xl">
        Metrikler yüklenirken bir hata oluştu. Sunucu bağlantısını kontrol edin.
      </div>
    );
  }

  const statCards = [
    {
      title: 'Toplam Kullanıcı',
      value: data.users.total,
      subValue: `${data.users.banned} banlı hesap`,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Aktif Oturumlar',
      value: data.activeSessions,
      subValue: 'Şu an sistemde aktif token sayısı',
      icon: Activity,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Açık Raporlar',
      value: data.openReports,
      subValue: 'İncelenmeyi bekleyen şikayetler',
      icon: ShieldAlert,
      color: data.openReports > 0 ? 'text-destructive' : 'text-zinc-500',
      bgColor: data.openReports > 0 ? 'bg-destructive/10' : 'bg-zinc-500/10',
    },
    {
      title: 'Kuyruktaki Gönderiler',
      value: data.posts.flagged,
      subValue: 'Moderatör onayı bekleyen',
      icon: Flag,
      color: data.posts.flagged > 0 ? 'text-amber-500' : 'text-zinc-500',
      bgColor: data.posts.flagged > 0 ? 'bg-amber-500/10' : 'bg-zinc-500/10',
    },
    {
      title: 'Toplam Gönderi',
      value: data.posts.total,
      subValue: `${data.posts.removed} gönderi silindi`,
      icon: FileText,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
    },
    {
      title: 'E-posta Durumu',
      value: data.emails.sentToday,
      subValue: `Bugün gönderildi (${data.emails.failed} hatalı, ${data.emails.pending} bekleyen)`,
      icon: Mail,
      color: data.emails.failed > 0 ? 'text-rose-500' : 'text-teal-500',
      bgColor: data.emails.failed > 0 ? 'bg-rose-500/10' : 'bg-teal-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Sistem Özeti</h1>
          <p className="text-muted-foreground text-[15px]">
            Platformun güncel durumu ve istatistikleri.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-zinc-100 dark:bg-zinc-800/50 px-3 py-1.5 rounded-full">
          <RefreshCw className={cn("h-3 w-3", isFetching ? "animate-spin text-primary" : "")} />
          <span>Canlı Veri (30s)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value.toLocaleString('tr-TR')}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.subValue}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
