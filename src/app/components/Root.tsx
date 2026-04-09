import { Outlet, Link, useLocation } from 'react-router';

export function Root() {
  const location = useLocation();

  return (
    <div className="size-full flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Signapse</h1>
        <nav className="flex gap-4">
          <Link
            to="/"
            className={`text-sm px-3 py-1 rounded ${
              location.pathname === '/'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Video Call
          </Link>
          <Link
            to="/chat-log"
            className={`text-sm px-3 py-1 rounded ${
              location.pathname === '/chat-log'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Chat Log
          </Link>
        </nav>
      </header>

      {/* Page content */}
      <div className="flex-1 min-h-0">
        <Outlet />
      </div>
    </div>
  );
}
