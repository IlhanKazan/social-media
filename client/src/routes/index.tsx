import { createBrowserRouter } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import { AppLayout } from '@/app/layouts/AppLayout';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import {FeedPage} from "@/features/feed/FeedPage.tsx";
import {ProfilePage} from "@/features/profile/ProfilePage.tsx";
import { NotificationsPage } from '@/features/notifications/NotificationsPage';
import {MessagingPage} from "@/features/messaging/MessagingPage.tsx";
import {PostDetailPage} from "@/features/post/PostDetailPage.tsx";
import {SearchPage} from "@/features/search/SearchPage.tsx";
import {SettingsPage} from "@/features/settings/SettingsPage.tsx";
import {ForgotPasswordPage} from "@/features/auth/ForgotPasswordPage.tsx";
import {ResetPasswordPage} from "@/features/auth/ResetPasswordPage.tsx";
import {VerifyEmailPage} from "@/features/auth/VerifyEmailPage.tsx";

const NotFound = () => <div className="p-8 text-center"><h1 className="text-2xl font-bold">404 Not Found</h1></div>;

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <FeedPage /> },
          { path: '/explore', element: <FeedPage defaultTab="explore" /> },
          { path: '/post/:id', element: <PostDetailPage /> },
          { path: '/search', element: <SearchPage /> },
          { path: 'u/:username', element: <ProfilePage /> },
          { path: '/notifications', element: <NotificationsPage/> },
          { path: '/messages', element: <MessagingPage /> },
          { path: '/messages/:conversationId', element: <MessagingPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> }
]);
