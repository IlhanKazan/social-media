import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ShieldAlert, Loader2, AlertTriangle, ExternalLink, CheckCircle, Gavel } from 'lucide-react';
import { useAdminReports, useResolveReport, type ReportGroup } from './hooks/use-admin-reports';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export function AdminReportsPage() {
  const { data: reports, isLoading, isError } = useAdminReports();
  const resolveMutation = useResolveReport();

  const [selectedReport, setSelectedReport] = useState<ReportGroup | null>(null);
  const [resolution, setResolution] = useState('İncelendi, ihlal bulunmadı.');
  const [removePost, setRemovePost] = useState(false);
  const [banUser, setBanUser] = useState(false);

  const handleResolve = () => {
    if (!selectedReport) return;
    resolveMutation.mutate({
      postId: selectedReport.postId,
      resolution,
      removePost,
      banUser,
    }, {
      onSuccess: () => {
        setSelectedReport(null);
        setResolution('İncelendi, ihlal bulunmadı.');
        setRemovePost(false);
        setBanUser(false);
      }
    });
  };

  const closeDialog = () => {
    setSelectedReport(null);
    setResolution('İncelendi, ihlal bulunmadı.');
    setRemovePost(false);
    setBanUser(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-destructive border border-destructive/20 rounded-xl bg-destructive/5">
        Raporlar yüklenirken bir bağlantı hatası oluştu. Lütfen sayfayı yenileyin.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Kullanıcı Raporları</h1>
        <p className="text-muted-foreground text-[15px]">
          Topluluk tarafından şikayet edilen gönderileri inceleyin ve aksiyon alın.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 items-start">
        {!reports || reports.length === 0 ? (
          <div className="col-span-full p-16 text-center text-muted-foreground border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center gap-4 bg-zinc-50/50 dark:bg-zinc-900/20">
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-lg">Sistem Tertemiz!</h3>
              <p>Bekleyen hiçbir şikayet bulunmuyor.</p>
            </div>
          </div>
        ) : (
          reports.map((report) => (
            <Card key={report.postId} className="p-5 flex flex-col justify-between border-zinc-200 dark:border-zinc-800 bg-card shadow-sm text-left gap-6 transition-all hover:shadow-md">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-500 border border-red-500/20">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-[15px] text-foreground flex items-center gap-2">
                    Gönderi #{report.postId}
                  </h3>
                  <div className="flex flex-col gap-1 text-[13px]">
                    <span className="font-semibold text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Toplam {report.reportCount} Kullanıcı Şikayeti
                    </span>
                    <span className="text-muted-foreground">
                      Son bildirim: {formatDistanceToNow(new Date(report.latestReportedAt), { addSuffix: true, locale: tr })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                <Link
                  to={`/post/${report.postId}`}
                  target="_blank"
                  className="flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 transition-colors"
                >
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  Görüntüle
                </Link>

                <Button size="sm" className="flex-1 gap-2 whitespace-nowrap" onClick={() => setSelectedReport(report)}>
                  <Gavel className="h-4 w-4 shrink-0" /> Karar Ver
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Şikayeti Çözümle</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <div className="space-y-3">
              <Label className="text-muted-foreground uppercase text-xs font-bold tracking-wider">Admin Çözüm Notu</Label>
              <Input
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Örn: Topluluk kurallarına aykırı değil."
                className="h-11"
              />
            </div>

            <div className="space-y-4 p-5 bg-destructive/5 border border-destructive/20 rounded-xl">
              <h4 className="text-sm font-bold text-destructive flex items-center gap-2 border-b border-destructive/10 pb-2">
                <AlertTriangle className="h-4 w-4" /> Yaptırım Uygula
              </h4>

              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="mt-0.5">
                    <input
                      type="checkbox"
                      checked={removePost}
                      onChange={(e) => setRemovePost(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-destructive focus:ring-destructive cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-foreground block group-hover:text-destructive transition-colors">Gönderiyi kalıcı olarak sil</span>
                    <span className="text-xs text-muted-foreground block mt-0.5">Gönderi tamamen kaldırılır ve sahibine bildirim gider.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="mt-0.5">
                    <input
                      type="checkbox"
                      checked={banUser}
                      onChange={(e) => setBanUser(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-destructive focus:ring-destructive cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-foreground block group-hover:text-destructive transition-colors">Kullanıcıyı sistemden uzaklaştır</span>
                    <span className="text-xs text-muted-foreground block mt-0.5">Gönderi sahibinin hesabı kalıcı olarak banlanır.</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button variant="ghost" onClick={closeDialog}>İptal</Button>
            <Button
              variant={removePost || banUser ? "destructive" : "default"}
              onClick={handleResolve}
              disabled={resolveMutation.isPending || !resolution.trim()}
            >
              {resolveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kararı Uygula'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
