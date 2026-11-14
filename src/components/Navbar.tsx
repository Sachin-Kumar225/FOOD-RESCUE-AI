import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export type PageRoute = 'home' | 'browse' | 'about' | 'contact' | 'auth' | 'dashboard';

interface NavbarProps {
  currentPage: PageRoute;
  onNavigate: (page: PageRoute) => void;
}

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: { id: PageRoute; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'browse', label: 'Donations' },
    { id: 'about', label: 'About' },
    { id: 'contact', label: 'Contact' },
  ];

  if (user) {
    navItems.push({ id: 'dashboard', label: 'Dashboard' });
  }

  const handleNav = (page: PageRoute) => {
    setMobileOpen(false);
    onNavigate(page);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-emerald-950/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand wordmark */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="font-display text-lg font-bold tracking-tight text-[#0F1F17] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded"
        >
          FOOD RESCUE AI
        </button>

        {/* Zone 2: Concise single-line text nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#47554E]">
          {navItems.map((item) => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                  active
                    ? 'text-[#0F1F17] border-emerald-700 font-semibold'
                    : 'border-transparent hover:text-[#0F1F17] hover:border-emerald-700/30'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleNav(user ? 'dashboard' : 'auth')}
            className="hidden md:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
          >
            {user ? 'Open Workspace' : 'Sign In'}
          </button>

          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-emerald-950/15 text-[#0F1F17]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-emerald-950/10 bg-white px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                currentPage === item.id
                  ? 'bg-emerald-50 text-emerald-900 font-semibold'
                  : 'text-[#47554E] hover:bg-emerald-50/50'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleNav(user ? 'dashboard' : 'auth')}
            className="w-full mt-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
          >
            {user ? 'Open Workspace' : 'Sign In'}
          </button>
        </div>
      )}
    </header>
  );
}
