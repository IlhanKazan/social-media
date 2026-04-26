import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAuthStore } from './store/useAuthStore';

const MainLayout = () => {
  const account = useAuthStore(state => state.account);
  const logout = useAuthStore(state => state.logout);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="font-bold text-xl tracking-tight text-zinc-900">Social App</div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{account?.username}</span>
            <button onClick={logout} className="text-sm font-medium text-red-600 hover:text-red-500">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

const Dashboard = () => {
  return (
    <div className="rounded-xl border bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Welcome to your feed</h1>
      <p className="mt-2 text-zinc-600">This is the protected dashboard. Content will appear here in future phases.</p>
    </div>
  );
};

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: <Dashboard />,
          },
        ],
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
