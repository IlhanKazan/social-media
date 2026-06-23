import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import { RootIndex } from './RootIndex';
import { AppLayout } from '@/app/layouts/AppLayout';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { AdminRoute } from '@/routes/AdminRoute';

// Auth pages — small, load eagerly (needed before JS hydration completes)
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { MfaChallengePage } from '@/features/auth/MfaChallengePage';

// Lazy import that survives deploys: if a chunk 404s (filename changed by a new build),
// force one full reload to pull the fresh index.html + assets instead of crashing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyWithReload<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem('chunkReloaded');
      return mod;
    } catch (err) {
      if (!sessionStorage.getItem('chunkReloaded')) {
        sessionStorage.setItem('chunkReloaded', '1');
        window.location.reload();
        return await new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}

// Everything else — lazy loaded per route
const FeedPage = lazyWithReload(() => import('@/features/feed/FeedPage').then(m => ({ default: m.FeedPage })));
const ProfilePage = lazyWithReload(() => import('@/features/profile/ProfilePage').then(m => ({ default: m.ProfilePage })));
const NotificationsPage = lazyWithReload(() => import('@/features/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const MessagingPage = lazyWithReload(() => import('@/features/messaging/MessagingPage').then(m => ({ default: m.MessagingPage })));
const PostDetailPage = lazyWithReload(() => import('@/features/post/PostDetailPage').then(m => ({ default: m.PostDetailPage })));
const SearchPage = lazyWithReload(() => import('@/features/search/SearchPage').then(m => ({ default: m.SearchPage })));
const SettingsPage = lazyWithReload(() => import('@/features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ForgotPasswordPage = lazyWithReload(() => import('@/features/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazyWithReload(() => import('@/features/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage = lazyWithReload(() => import('@/features/auth/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })));

// Legal / marketing — separate chunk
const LegalLayout = lazyWithReload(() => import('@/features/marketing/LegalLayout').then(m => ({ default: m.LegalLayout })));
const AboutPage = lazyWithReload(() => import('@/features/marketing/AboutPage').then(m => ({ default: m.AboutPage })));
const PrivacyPage = lazyWithReload(() => import('@/features/marketing/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazyWithReload(() => import('@/features/marketing/TermsPage').then(m => ({ default: m.TermsPage })));

// Admin panel — separate chunk, never loaded for regular users
const AdminLayout = lazyWithReload(() => import('@/app/layouts/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminDashboardPage = lazyWithReload(() => import('@/features/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AdminModerationPage = lazyWithReload(() => import('@/features/admin/AdminModerationPage').then(m => ({ default: m.AdminModerationPage })));
const AdminReportsPage = lazyWithReload(() => import('@/features/admin/AdminReportsPage').then(m => ({ default: m.AdminReportsPage })));
const AdminUsersPage = lazyWithReload(() => import('@/features/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));
const AdminSystemSettingsPage = lazyWithReload(() => import('@/features/admin/AdminSystemSettingsPage').then(m => ({ default: m.AdminSystemSettingsPage })));
const AdminMaintenancePage = lazyWithReload(() => import('@/features/admin/AdminMaintenancePage').then(m => ({ default: m.AdminMaintenancePage })));
const AdminAuditLogPage = lazyWithReload(() => import('@/features/admin/AdminAuditLogPage').then(m => ({ default: m.AdminAuditLogPage })));

const PageLoader = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const NotFound = () => (
  <div className="p-8 text-center">
    <h1 className="text-2xl font-bold">404 Not Found</h1>
  </div>
);

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{element}</Suspense>
);

export const router = createBrowserRouter([
  { path: '/', element: <RootIndex /> },
  {
    element: withSuspense(<LegalLayout />),
    children: [
      { path: '/about', element: withSuspense(<AboutPage />) },
      { path: '/privacy', element: withSuspense(<PrivacyPage />) },
      { path: '/terms', element: withSuspense(<TermsPage />) },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/mfa', element: <MfaChallengePage /> },
      { path: 'forgot-password', element: withSuspense(<ForgotPasswordPage />) },
      { path: 'reset-password', element: withSuspense(<ResetPasswordPage />) },
      { path: 'verify-email', element: withSuspense(<VerifyEmailPage />) },
    ],
  },
  {
    // Public content — auth-aware AppLayout, viewable logged out.
    element: <AppLayout />,
    children: [
      { path: '/home', element: withSuspense(<FeedPage />) },
      { path: '/explore', element: withSuspense(<FeedPage defaultTab="explore" />) },
      { path: '/post/:id', element: withSuspense(<PostDetailPage />) },
      { path: '/search', element: withSuspense(<SearchPage />) },
      { path: 'u/:username', element: withSuspense(<ProfilePage />) },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/notifications', element: withSuspense(<NotificationsPage />) },
          { path: '/messages', element: withSuspense(<MessagingPage />) },
          { path: '/messages/:conversationId', element: withSuspense(<MessagingPage />) },
          { path: '/settings', element: withSuspense(<SettingsPage />) },
        ],
      },
      {
        path: '/admin',
        element: <AdminRoute />,
        children: [
          {
            element: withSuspense(<AdminLayout />),
            children: [
              { index: true, element: withSuspense(<AdminDashboardPage />) },
              { path: 'moderation', element: withSuspense(<AdminModerationPage />) },
              { path: 'reports', element: withSuspense(<AdminReportsPage />) },
              { path: 'users', element: withSuspense(<AdminUsersPage />) },
              { path: 'settings', element: withSuspense(<AdminSystemSettingsPage />) },
              { path: 'maintenance', element: withSuspense(<AdminMaintenancePage />) },
              { path: 'audit-log', element: withSuspense(<AdminAuditLogPage />) },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]);