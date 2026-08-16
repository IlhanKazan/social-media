import { Outlet } from 'react-router-dom';
import { Footer } from './Footer';
import { SiteHeader } from './SiteHeader';

export function LegalLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      {/* Narrower than the header's container on purpose: prose is read, not
          scanned, and a full-width column of body text is hard to follow. */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
