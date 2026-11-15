import { useState } from 'react';
import { ArrowLeft, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export type PageRoute =
  | 'home'
  | 'browse'
  | 'about'
  | 'contact'
  | 'signin'
  | 'register'
  | 'dashboard';

interface NavbarProps {
  currentPage: PageRoute;
  onNavigate: (page: PageRoute) => void;
  onBack: () => void;
}

export function Navbar({ currentPage, onNavigate, onBack }: NavbarProps) {
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
            onClick={() => handleNav(user ? 'dashboard' : 'signin')}
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
            onClick={() => handleNav(user ? 'dashboard' : 'signin')}
            className="w-full mt-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
          >
            {user ? 'Open Workspace' : 'Sign In'}
          </button>
        </div>
      )}

      {/* Back button directly below FOOD RESCUE AI heading/logo */}
      <div className="border-t border-emerald-950/10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onBack();
            }}
            aria-label="Go back to previous page or section"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-[#0F1F17] bg-white border border-emerald-950/15 hover:bg-[#F8FAF9] rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <ArrowLeft className="w-4 h-4 text-[#0F1F17] shrink-0" />
            <span>Back</span>
          </button>
        </div>
      </div>
    </header>
  );
}
