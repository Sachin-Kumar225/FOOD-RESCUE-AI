import { useCallback, useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { Navbar, type PageRoute } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { BrowseDonationsPage } from './pages/BrowseDonationsPage.tsx';
import { AboutPage } from './pages/AboutPage.tsx';
import { ContactPage } from './pages/ContactPage.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { apiRequest } from './lib/api.ts';
import type { Donation, PlatformStats } from './types.ts';

function AppShell() {
  const [page, setPage] = useState<PageRoute>('home');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const refreshGlobalData = useCallback(async () => {
    try {
      const [statsRes, donationsRes] = await Promise.all([
        apiRequest<PlatformStats>('/api/stats'),
        apiRequest<{ donations: Donation[] }>('/api/donations'),
      ]);
      setStats(statsRes);
      setDonations(donationsRes.donations);
    } catch {
      // Keep previous data if transient network error occurs
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    refreshGlobalData();
  }, [refreshGlobalData]);

  const handleNavigate = (nextPage: PageRoute) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#0F1F17]">
      <Navbar currentPage={page} onNavigate={handleNavigate} />

      <main className="flex-1">
        {page === 'home' && (
          <LandingPage
            stats={stats}
            donations={donations}
            onNavigate={handleNavigate}
          />
        )}
        {page === 'browse' && (
          <BrowseDonationsPage
            donations={donations}
            loading={loadingData}
            onRefresh={refreshGlobalData}
            onNavigate={handleNavigate}
          />
        )}
        {page === 'about' && <AboutPage onNavigate={handleNavigate} />}
        {page === 'contact' && <ContactPage stats={stats} />}
        {page === 'auth' && <AuthPage onNavigate={handleNavigate} />}
        {page === 'dashboard' && (
          <DashboardPage
            stats={stats}
            donations={donations}
            onRefreshGlobal={refreshGlobalData}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      <Footer onNavigate={handleNavigate} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
