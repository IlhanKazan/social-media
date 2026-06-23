import { Link } from 'react-router-dom';
import { Zap, MessagesSquare, Mail, ImageIcon, ArrowRight, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from './Footer';

const features = [
  { icon: Zap, title: 'Gerçek zamanlı akış', desc: 'Beğeniler, yanıtlar ve bildirimler WebSocket ile anında.' },
  { icon: MessagesSquare, title: 'Konu zincirleri', desc: 'Twitter tarzı iç içe yanıtlarla sohbeti takip et.' },
  { icon: Mail, title: 'Direkt mesajlar', desc: 'Birebir özel sohbetler, fotoğraf ve gönderi paylaşımı.' },
  { icon: ImageIcon, title: 'Görsel paylaşımı', desc: 'Gönderilerine ve mesajlarına görsel ekle.' },
];

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3 text-xl font-bold tracking-tight text-foreground">
          <img src="/logo.svg" alt="SocialHan" className="h-9 w-9 rounded-xl shadow-lg shadow-primary/20" />
          SocialHan
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" render={<Link to="/login" />}>Giriş yap</Button>
          <Button render={<Link to="/register" />}>Kayıt ol</Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 pb-16 pt-12 sm:pt-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-4 py-1.5 text-sm font-medium text-muted-foreground dark:border-zinc-800 dark:bg-zinc-900">
              Gerçek zamanlı sosyal ağ
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tighter text-foreground sm:text-6xl">
              Düşüncelerini anında dünyayla paylaş.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg font-light leading-relaxed text-muted-foreground">
              Gönderiler, konu zincirleri ve direkt mesajlar; hepsi anlık.
              Sade, hızlı ve modern bir sosyal deneyim.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button className="h-12 w-full gap-2 px-8 text-base sm:w-auto" render={<Link to="/register" />}>
                Hemen başla <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="h-12 w-full gap-2 px-8 text-base sm:w-auto" render={<Link to="/explore" />}>
                <Compass className="h-4 w-4" /> Üye olmadan gez
              </Button>
            </div>
          </div>

          <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-zinc-200 bg-card p-6 dark:border-zinc-800/60"
              >
                <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
