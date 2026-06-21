import type { ReactNode } from 'react';

export function LegalTitle({ title, updated }: { title: string; updated?: string }) {
  return (
    <header className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      {updated && <p className="mt-2 text-sm text-muted-foreground">Son güncelleme: {updated}</p>}
    </header>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function DemoDisclaimer() {
  return (
    <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
      <strong>SocialHan bir portfolyo / demo projesidir.</strong> Ticari bir hizmet değildir; tanıtım
      ve teknik gösterim amacıyla yayınlanmıştır. Aşağıdaki metinler iyi niyetle hazırlanmıştır ancak
      hukuki tavsiye niteliği taşımaz. · A portfolio/demo project, not a commercial service. These
      texts are provided in good faith and are not legal advice.
    </div>
  );
}
