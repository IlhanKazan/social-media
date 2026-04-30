import { createBrowserRouter } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import { AppLayout } from '@/app/layouts/AppLayout';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import {FeedPage} from "@/features/feed/FeedPage.tsx";
import {ProfilePage} from "@/features/profile/ProfilePage.tsx";
import { NotificationsPage } from '@/features/notifications/NotificationsPage';

// TODO: Replace remaining dummies with real pages from features/
const NotFound = () => <div className="p-8 text-center"><h1 className="text-2xl font-bold">404 Not Found</h1></div>;

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <FeedPage /> },
          { path: '/explore', element: <div>Explore</div> },
          { path: 'u/:username', element: <ProfilePage /> },
          { path: '/notifications', element: <NotificationsPage/> },
          { path: '/messages', element: <div>Messages</div> },
          { path: '/messages/:conversationId', element: <div>Conversation Detail</div> },
          { path: '/search', element: <div>Search</div> },
          { path: '/settings', element: <div>Settings</div> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> }
]);
