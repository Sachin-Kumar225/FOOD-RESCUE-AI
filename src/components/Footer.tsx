import type { PageRoute } from './Navbar.tsx';
import type { UserRole } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface FooterProps {
  onNavigate: (page: PageRoute, options?: { role?: UserRole }) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const { user } = useAuth();

  const handleRoleLink = (targetRole: UserRole) => {
    if (user) {
      if (user.role === targetRole) {
        onNavigate('dashboard');
      } else {
        onNavigate('dashboard', { role: targetRole });
      }
      return;
    }
    if (targetRole === 'admin') {
      onNavigate('signin', { role: 'admin' });
    } else {
      onNavigate('register', { role: targetRole });
    }
  };

  return (
    <footer className="border-t border-emerald-950/10 bg-[#F8FAF9] text-[#47554E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-3">
            <p className="font-display text-lg font-bold tracking-tight text-[#0F1F17]">
              FOOD RESCUE AI
            </p>
            <p className="text-sm text-[#47554E] max-w-md leading-relaxed">
              Don&apos;t waste it. Donate it. Make someone smile. Connecting surplus food and daily
              essentials with verified NGOs, shelters, orphanages, and community volunteers.
            </p>
          </div>

          <div className="space-y-2.5 text-sm">
            <p className="font-semibold text-[#0F1F17]">Platform</p>
            <div className="flex flex-col items-start gap-2">
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="hover:text-[#0F1F17] transition-colors"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => onNavigate('browse')}
                className="hover:text-[#0F1F17] transition-colors"
              >
                Browse Donations
              </button>
              <button
                type="button"
                onClick={() => onNavigate('about')}
                className="hover:text-[#0F1F17] transition-colors"
              >
                About &amp; Safety Rules
              </button>
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="hover:text-[#0F1F17] transition-colors"
              >
                Contact &amp; Setup Guide
              </button>
            </div>
          </div>

          <div className="space-y-2.5 text-sm">
            <p className="font-semibold text-[#0F1F17]">Participant Roles</p>
            <div className="flex flex-col items-start gap-2 text-[#47554E]">
              <button
                type="button"
                onClick={() => handleRoleLink('donor')}
                className="hover:text-[#0F1F17] transition-colors text-left"
              >
                Food &amp; Essentials Donors
              </button>
              <button
                type="button"
                onClick={() => handleRoleLink('ngo')}
                className="hover:text-[#0F1F17] transition-colors text-left"
              >
                Verified NGOs &amp; Shelters
              </button>
              <button
                type="button"
                onClick={() => handleRoleLink('volunteer')}
                className="hover:text-[#0F1F17] transition-colors text-left"
              >
                Pickup Volunteers
              </button>
              <button
                type="button"
                onClick={() => handleRoleLink('admin')}
                className="hover:text-[#0F1F17] transition-colors text-left"
              >
                Platform Administrators
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-emerald-950/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#47554E]">
          <p>FOOD RESCUE AI — Pre-Build 50% Foundation. Real database records only.</p>
          <p>AI suggestions are advisory; human verification governs all food safety handoffs.</p>
        </div>
      </div>
    </footer>
  );
}
