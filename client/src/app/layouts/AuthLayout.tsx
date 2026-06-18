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
              Versiyon 2026 Rebirth
            </div>
            <h2 className="text-5xl font-bold leading-tight tracking-tighter">
              Düşüncelerini anında dünyayla paylaş.
            </h2>
            <p className="text-xl text-zinc-400 font-light leading-relaxed">
              Modern mimari, sıfır gecikme ve gerçek zamanlı etkileşim.
              Eski projeni unutan, geleceğin sosyal ağını bugün deneyimle.
            </p>
          </div>
          <div className="mt-12 flex items-center gap-4 text-zinc-500 border-t border-zinc-800 pt-8">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 w-10 rounded-full border-2 border-zinc-950 bg-zinc-800 flex items-center justify-center text-xs">
                  U{i}
                </div>
              ))}
            </div>
            <span className="text-sm italic">Binlerce geliştirici tarafından test edildi.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
