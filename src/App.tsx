import { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar, type PageRoute } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { BrowseDonationsPage } from './pages/BrowseDonationsPage.tsx';
import { AboutPage } from './pages/AboutPage.tsx';
import { ContactPage } from './pages/ContactPage.tsx';
import { SignInPage } from './pages/SignInPage.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import {
  fetchAllDonations,
  fetchGlobalStats,
  fetchSiteSettings,
} from './lib/dataService.ts';
import type { Donation, PlatformStats, SiteSettings, UserRole } from './types.ts';

export interface NavigateOptions {
  role?: UserRole;
}

interface NavHistoryEntry {
  page: PageRoute;
  dashboardTab: 'workspace' | 'analytics';
  preferredRole?: UserRole | null;
  requestedDashboardRole?: UserRole | null;
}

const VALID_ROLES: UserRole[] = ['donor', 'ngo', 'volunteer', 'admin'];

function parseRole(raw: string | null | undefined): UserRole | null {
  if (!raw) return null;
  return VALID_ROLES.includes(raw as UserRole) ? (raw as UserRole) : null;
}

function parseLocation(pathname: string, search: string): {
  page: PageRoute;
  preferredRole: UserRole | null;
  requestedDashboardRole: UserRole | null;
} {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(search);
  const queryRole = parseRole(params.get('role'));

  if (clean.startsWith('/dashboard/')) {
    const segment = clean.slice('/dashboard/'.length).split('/')[0];
    const dashRole = parseRole(segment);
    return {
      page: 'dashboard',
      preferredRole: null,
      requestedDashboardRole: dashRole,
    };
  }

  switch (clean) {
    case '/donations':
    case '/browse':
      return { page: 'browse', preferredRole: null, requestedDashboardRole: null };
    case '/about':
      return { page: 'about', preferredRole: null, requestedDashboardRole: null };
    case '/contact':
      return { page: 'contact', preferredRole: null, requestedDashboardRole: null };
    case '/signin':
    case '/login':
    case '/auth':
      return { page: 'signin', preferredRole: queryRole, requestedDashboardRole: null };
    case '/register':
    case '/signup':
      return {
        page: 'register',
        preferredRole: queryRole && queryRole !== 'admin' ? queryRole : null,
        requestedDashboardRole: null,
      };
    case '/dashboard':
      return { page: 'dashboard', preferredRole: null, requestedDashboardRole: null };
    default:
      return { page: 'home', preferredRole: null, requestedDashboardRole: null };
  }
}

function buildTargetPath(
  route: PageRoute,
  preferredRole?: UserRole | null,
  requestedDashboardRole?: UserRole | null
): string {
  switch (route) {
    case 'browse':
      return '/donations';
    case 'about':
      return '/about';
    case 'contact':
      return '/contact';
    case 'signin':
      return preferredRole ? `/signin?role=${preferredRole}` : '/signin';
    case 'register':
      return preferredRole && preferredRole !== 'admin'
        ? `/register?role=${preferredRole}`
        : '/register';
    case 'dashboard':
      return requestedDashboardRole ? `/dashboard/${requestedDashboardRole}` : '/dashboard';
    default:
      return '/';
  }
}

function AppShell() {
  const { user, loading: authLoading, isPasswordRecovery } = useAuth();
  const [historyStack, setHistoryStack] = useState<NavHistoryEntry[]>(() => {
    const parsed = parseLocation(window.location.pathname, window.location.search);
    return [
      {
        page: parsed.page,
        dashboardTab: 'workspace',
        preferredRole: parsed.preferredRole,
        requestedDashboardRole: parsed.requestedDashboardRole,
      },
    ];
  });
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const currentEntry = historyStack[historyStack.length - 1];
  const page = currentEntry.page;
  const isFullScreenDashboard = page === 'dashboard' && (Boolean(user) || authLoading);

  const refreshGlobalData = useCallback(async () => {
    try {
      const [statsRes, donationsRes, settingsRes] = await Promise.all([
        fetchGlobalStats(),
        fetchAllDonations(),
        fetchSiteSettings(),
      ]);
      setStats(statsRes);
      setDonations(donationsRes);
      setSiteSettings(settingsRes);
    } catch {
      // Keep previous data if transient network error occurs
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    refreshGlobalData();
  }, [refreshGlobalData, user?.id, user?.role]);

  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseLocation(window.location.pathname, window.location.search);
      setHistoryStack((prev) => {
        const top = prev[prev.length - 1];
        if (
          top.page === parsed.page &&
          top.preferredRole === parsed.preferredRole &&
          top.requestedDashboardRole === parsed.requestedDashboardRole
        ) {
          return prev;
        }
        return [
          ...prev,
          {
            page: parsed.page,
            dashboardTab: parsed.page === 'dashboard' ? 'workspace' : top.dashboardTab,
            preferredRole: parsed.preferredRole,
            requestedDashboardRole: parsed.requestedDashboardRole,
          },
        ];
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (nextPage: PageRoute, options?: NavigateOptions) => {
    const nextPreferredRole =
      nextPage === 'register'
        ? options?.role && options.role !== 'admin'
          ? options.role
          : null
        : nextPage === 'signin'
          ? options?.role ?? null
          : null;
    const nextDashRole = nextPage === 'dashboard' ? options?.role ?? null : null;

    const targetPath = buildTargetPath(nextPage, nextPreferredRole, nextDashRole);
    const currentFull = `${window.location.pathname}${window.location.search}`;
    if (currentFull !== targetPath) {
      window.history.pushState({ page: nextPage }, '', targetPath);
    }
    setHistoryStack((prev) => {
      const top = prev[prev.length - 1];
      if (
        top.page === nextPage &&
        (top.preferredRole ?? null) === nextPreferredRole &&
        (top.requestedDashboardRole ?? null) === nextDashRole
      ) {
        return prev;
      }
      return [
        ...prev,
        {
          page: nextPage,
          dashboardTab: nextPage === 'dashboard' ? 'workspace' : top.dashboardTab,
          preferredRole: nextPreferredRole,
          requestedDashboardRole: nextDashRole,
        },
      ];
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (isPasswordRecovery && page !== 'signin') {
      handleNavigate('signin');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPasswordRecovery]);

  const handleDashboardTabChange = (nextTab: 'workspace' | 'analytics') => {
    setHistoryStack((prev) => {
      const top = prev[prev.length - 1];
      if (top.page === 'dashboard' && top.dashboardTab === nextTab) return prev;
      return [...prev, { ...top, page: 'dashboard', dashboardTab: nextTab }];
    });
  };

  const handleBack = () => {
    if (historyStack.length > 1) {
      const nextEntry = historyStack[historyStack.length - 2];
      const nextPath = buildTargetPath(
        nextEntry.page,
        nextEntry.preferredRole,
        nextEntry.requestedDashboardRole
      );
      const currentFull = `${window.location.pathname}${window.location.search}`;
      if (currentFull !== nextPath) {
        window.history.replaceState({ page: nextEntry.page }, '', nextPath);
      }
      setHistoryStack((prev) => prev.slice(0, -1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (page !== 'home') {
      if (window.location.pathname !== '/') {
        window.history.pushState({ page: 'home' }, '', '/');
      }
      setHistoryStack([{ page: 'home', dashboardTab: 'workspace' }]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#0F1F17]">
      {!isFullScreenDashboard && (
        <Navbar currentPage={page} onNavigate={handleNavigate} onBack={handleBack} />
      )}

      <main className="flex-1">
        {page === 'home' && (
          <LandingPage
            stats={stats}
            donations={donations}
            siteSettings={siteSettings}
            onRefresh={refreshGlobalData}
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
        {page === 'about' && (
          <AboutPage
            siteSettings={siteSettings}
            onRefresh={refreshGlobalData}
            onNavigate={handleNavigate}
          />
        )}
        {page === 'contact' && <ContactPage stats={stats} />}
        {page === 'signin' && (
          <SignInPage
            onNavigate={handleNavigate}
            requestedRole={currentEntry.preferredRole ?? null}
          />
        )}
        {page === 'register' && (
          <AuthPage
            onNavigate={handleNavigate}
            initialRole={
              currentEntry.preferredRole && currentEntry.preferredRole !== 'admin'
                ? currentEntry.preferredRole
                : undefined
            }
            mode="register"
            onModeChange={(nextMode) => {
              if (nextMode === 'login') {
                handleNavigate('signin');
              }
            }}
          />
        )}
        {page === 'dashboard' && (
          <DashboardPage
            stats={stats}
            donations={donations}
            siteSettings={siteSettings}
            onRefreshGlobal={refreshGlobalData}
            onNavigate={handleNavigate}
            activeTab={currentEntry.dashboardTab}
            onTabChange={handleDashboardTabChange}
            requestedDashboardRole={currentEntry.requestedDashboardRole ?? null}
          />
        )}
      </main>

      {!isFullScreenDashboard && <Footer onNavigate={handleNavigate} />}
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
