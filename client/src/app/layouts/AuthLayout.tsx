import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col justify-center bg-background px-8 py-12 sm:px-12 lg:px-20 xl:px-32">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-12 flex items-center gap-3 font-bold text-2xl tracking-tight text-foreground">
            <img src="/logo.svg" alt="SocialHan" className="h-10 w-10 rounded-xl shadow-lg shadow-primary/20" />
            SocialHan
          </div>
          <Outlet />
        </div>
      </div>

      <div className="hidden bg-zinc-950 lg:block relative overflow-hidden border-l border-zinc-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(39,39,42,0.8),transparent)]" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-40" />

        <div className="relative flex h-full flex-col justify-end p-16 text-white">
          <div className="max-w-md space-y-6">
            <div className="inline-flex rounded-full bg-zinc-800/50 px-4 py-1.5 text-sm font-medium text-zinc-300 backdrop-blur-sm border border-zinc-700/50">
              Gerçek zamanlı sosyal ağ
            </div>
            <h2 className="text-5xl font-bold leading-tight tracking-tighter">
              Düşüncelerini anında dünyayla paylaş.
            </h2>
            <p className="text-xl text-zinc-400 font-light leading-relaxed">
              Gönderiler, konu zincirleri ve direkt mesajlar; hepsi anlık.
              Sade, hızlı ve modern bir sosyal deneyim.
            </p>
          </div>
          <div className="mt-12 flex flex-wrap gap-2 border-t border-zinc-800 pt-8">
            {['Gerçek zamanlı akış', 'Direkt mesajlar', 'Konu zincirleri'].map((feature) => (
              <span
                key={feature}
                className="rounded-full border border-zinc-700/50 bg-zinc-800/40 px-3 py-1 text-sm text-zinc-400"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
