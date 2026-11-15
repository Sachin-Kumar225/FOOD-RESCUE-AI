import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Clock,
  ImagePlus,
  Inbox,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  Package,
  PackagePlus,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  ShieldCheck,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { fetchRoleWorkspaceData } from '../lib/dataService.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { ChartsSection } from '../components/ChartsSection.tsx';
import { DonationModal } from '../components/DonationModal.tsx';
import { NgoMatchModal } from '../components/NgoMatchModal.tsx';
import { DonorWorkspace } from './dashboard/DonorWorkspace.tsx';
import { NgoWorkspace } from './dashboard/NgoWorkspace.tsx';
import { VolunteerWorkspace } from './dashboard/VolunteerWorkspace.tsx';
import { AdminWorkspace } from './dashboard/AdminWorkspace.tsx';
import type {
  Donation,
  DonationRequest,
  NgoNeed,
  PlatformStats,
  SiteSettings,
  UserRole,
  VolunteerTask,
} from '../types.ts';
import type { PageRoute } from '../components/Navbar.tsx';

interface DashboardPageProps {
  stats: PlatformStats | null;
  donations: Donation[];
  siteSettings: SiteSettings | null;
  onRefreshGlobal: () => Promise<void>;
  onNavigate: (page: PageRoute, options?: { role?: UserRole }) => void;
  activeTab?: 'workspace' | 'analytics';
  onTabChange?: (tab: 'workspace' | 'analytics') => void;
  requestedDashboardRole?: UserRole | null;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  kind: 'dashboard' | 'workspace' | 'section' | 'analytics' | 'modal';
  targetId?: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  donor: 'Donor Workspace',
  ngo: 'NGO / Receiver Workspace',
  volunteer: 'Volunteer Dispatch',
  admin: 'Administrator Console',
};

function BrandLogoMark() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#0D9488] text-white flex items-center justify-center shrink-0 shadow-xs">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4.5 h-4.5"
        aria-hidden="true"
      >
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </svg>
    </div>
  );
}

export function DashboardPage({
  stats,
  donations,
  siteSettings,
  onRefreshGlobal,
  onNavigate,
  activeTab,
  onTabChange,
  requestedDashboardRole,
}: DashboardPageProps) {
  const { user, organisation, loading: authLoading, logout, demoLogin, refreshSession } =
    useAuth();
  const [internalTab, setInternalTab] = useState<'workspace' | 'analytics'>('workspace');
  const tab = activeTab ?? internalTab;
  const setTab = useCallback(
    (next: 'workspace' | 'analytics') => {
      setInternalTab(next);
      onTabChange?.(next);
    },
    [onTabChange]
  );

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [activeNavId, setActiveNavId] = useState<string>('dashboard');
  const [pendingScrollTarget, setPendingScrollTarget] = useState<string | null>(null);
  const profileDropdownRef = useRef<HTMLDivElement | null>(null);

  const [requests, setRequests] = useState<DonationRequest[]>([]);
  const [needs, setNeeds] = useState<NgoNeed[]>([]);
  const [tasks, setTasks] = useState<VolunteerTask[]>([]);
  const [loadingRoleData, setLoadingRoleData] = useState(true);

  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null);
  const [matchDonation, setMatchDonation] = useState<Donation | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setActiveNavId((prev) => {
      if (tab === 'analytics') return 'analytics';
      if (prev === 'analytics') return 'dashboard';
      return prev;
    });
  }, [tab]);

  useEffect(() => {
    setActiveNavId('dashboard');
  }, [user?.role]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!pendingScrollTarget || tab !== 'workspace' || loadingRoleData) return;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(pendingScrollTarget);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setPendingScrollTarget(null);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [pendingScrollTarget, tab, loadingRoleData]);

  const notify = useCallback((type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
  }, []);

  const fetchRoleData = useCallback(async () => {
    if (!user) return;
    setLoadingRoleData(true);
    try {
      const data = await fetchRoleWorkspaceData();
      setRequests(data.requests);
      setNeeds(data.needs);
      setTasks(data.tasks);
    } catch (err) {
      notify(
        'error',
        err instanceof Error ? err.message : 'Unable to load role workspace data from backend.'
      );
    } finally {
      setLoadingRoleData(false);
    }
  }, [user, notify]);

  useEffect(() => {
    fetchRoleData();
  }, [fetchRoleData]);

  const handleFullRefresh = useCallback(async () => {
    await Promise.all([onRefreshGlobal(), fetchRoleData()]);
  }, [onRefreshGlobal, fetchRoleData]);

  const sidebarItems = useMemo<SidebarItem[]>(() => {
    if (!user) return [];

    const workspaceLabel = ROLE_LABELS[user.role];
    const items: SidebarItem[] = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutGrid,
        kind: 'dashboard',
      },
      {
        id: 'workspace',
        label: workspaceLabel,
        icon: LayoutDashboard,
        kind: 'workspace',
      },
    ];

    if (user.role === 'donor') {
      items.push(
        {
          id: 'donor-requests',
          label: 'Incoming Requests',
          icon: Inbox,
          kind: 'section',
          targetId: 'donor-requests',
        },
        {
          id: 'donor-listings',
          label: 'My Listings',
          icon: Package,
          kind: 'section',
          targetId: 'donor-listings',
        }
      );
    } else if (user.role === 'ngo') {
      items.push(
        {
          id: 'ngo-verification',
          label: 'Verification Profile',
          icon: Building2,
          kind: 'section',
          targetId: 'ngo-verification',
        },
        {
          id: 'ngo-requests',
          label: 'Requests & Delivery',
          icon: ClipboardCheck,
          kind: 'section',
          targetId: 'ngo-requests',
        },
        {
          id: 'ngo-needs',
          label: 'Resource Needs',
          icon: ClipboardList,
          kind: 'section',
          targetId: 'ngo-needs',
        },
        {
          id: 'ngo-available',
          label: 'Claim Donations',
          icon: Package,
          kind: 'section',
          targetId: 'ngo-available',
        }
      );
    } else if (user.role === 'volunteer') {
      items.push(
        {
          id: 'volunteer-active',
          label: 'Active Pickups',
          icon: Truck,
          kind: 'section',
          targetId: 'volunteer-active',
        },
        {
          id: 'volunteer-open',
          label: 'Available Routes',
          icon: MapPin,
          kind: 'section',
          targetId: 'volunteer-open',
        }
      );
    } else if (user.role === 'admin') {
      items.push(
        {
          id: 'admin-verify',
          label: 'NGO Verification',
          icon: ShieldCheck,
          kind: 'section',
          targetId: 'admin-verify',
        },
        {
          id: 'admin-moderation',
          label: 'Moderation & Photos',
          icon: ImagePlus,
          kind: 'section',
          targetId: 'admin-moderation',
        },
        {
          id: 'admin-users',
          label: 'Users & Reports',
          icon: Users,
          kind: 'section',
          targetId: 'admin-users',
        },
        {
          id: 'admin-audit',
          label: 'Delivery & Activity Audit',
          icon: ClipboardCheck,
          kind: 'section',
          targetId: 'admin-audit',
        }
      );
    }

    items.push({
      id: 'analytics',
      label: 'Statistics & Activity',
      icon: BarChart3,
      kind: 'analytics',
    });

    if (user.role === 'donor' || user.role === 'admin') {
      items.push({
        id: 'create-donation',
        label: 'Create Donation',
        icon: PackagePlus,
        kind: 'modal',
      });
    }

    return items;
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs px-6 py-5 text-sm text-slate-600">
          Loading your dashboard workspace...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-[#0F172A]">
          Sign in required to access your workspace
        </h1>
        <p className="text-sm text-slate-500">
          Role-based dashboards are protected. Sign in or select a Demo Mode role to continue.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('signin')}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  if (requestedDashboardRole && requestedDashboardRole !== user.role) {
    return (
      <div className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl shadow-xs p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="font-display text-xl font-bold text-[#0F172A]">
            Access Restricted — {ROLE_LABELS[requestedDashboardRole]}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Your account is signed in with the{' '}
            <strong className="text-[#0F172A] capitalize">{user.role}</strong> role and does not
            have permission to access another role&apos;s restricted dashboard.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors"
            >
              Open My {ROLE_LABELS[user.role]}
            </button>
            <button
              type="button"
              onClick={async () => {
                await logout();
                onNavigate('home');
              }}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSidebarItemClick = (item: SidebarItem) => {
    setMobileDrawerOpen(false);
    if (item.kind === 'modal') {
      setEditingDonation(null);
      setDonationModalOpen(true);
      return;
    }
    if (item.kind === 'analytics') {
      setTab('analytics');
      setActiveNavId('analytics');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (item.kind === 'dashboard' || item.kind === 'workspace') {
      setTab('workspace');
      setActiveNavId(item.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (item.kind === 'section' && item.targetId) {
      setActiveNavId(item.id);
      if (tab !== 'workspace') {
        setTab('workspace');
      }
      setPendingScrollTarget(item.targetId);
    }
  };

  const handleHamburgerClick = () => {
    if (window.innerWidth < 768) {
      setMobileDrawerOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  const handleSignOut = async () => {
    setMobileDrawerOpen(false);
    setProfileMenuOpen(false);
    await logout();
    onNavigate('home');
  };

  const initials =
    user.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'FR';

  const statCards = [
    {
      label: 'Total Donations',
      value: stats ? stats.totalDonations : '—',
      icon: Package,
    },
    {
      label: 'Available Donations',
      value: stats ? stats.availableDonations : '—',
      icon: Layers,
    },
    {
      label: 'Completed (Confirmed)',
      value: stats ? stats.completedDonations : '—',
      icon: CheckCircle2,
    },
    {
      label: 'Registered NGOs',
      value: stats ? stats.registeredNgos : '—',
      icon: Building2,
    },
    {
      label: 'Pending Requests',
      value: stats ? stats.pendingRequests : '—',
      icon: Clock,
    },
  ];

  const renderSidebarContent = (collapsed: boolean, isMobile = false) => (
    <div className="flex flex-col h-full justify-between bg-white">
      <div className="flex-1 overflow-y-auto">
        {/* Branding & Single-Click Collapse Toggle */}
        <div
          className={`h-16 border-b border-slate-200/80 flex items-center ${
            collapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          <div className={`flex items-center gap-2.5 min-w-0 ${collapsed ? 'justify-center' : ''}`}>
            <BrandLogoMark />
            {!collapsed && (
              <span className="font-display text-sm font-bold tracking-tight text-[#0F172A] whitespace-nowrap truncate">
                FOOD RESCUE AI
              </span>
            )}
          </div>
          {isMobile ? (
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(false)}
              aria-label="Close sidebar navigation"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-[#0F172A] hover:bg-slate-50 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            !collapsed && (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-[#0F172A] hover:bg-slate-50 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )
          )}
        </div>

        {/* Expand Button when collapsed */}
        {collapsed && !isMobile && (
          <div className="px-2 pt-3 pb-1 flex justify-center">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="w-10 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-[#0F172A] hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <nav
          aria-label="Dashboard navigation"
          className={`py-4 space-y-1 ${collapsed ? 'px-2.5' : 'px-3'}`}
        >
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.kind !== 'modal' &&
              (tab === 'analytics'
                ? item.id === 'analytics'
                : activeNavId === item.id);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSidebarItemClick(item)}
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center rounded-xl text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] ${
                  collapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'
                } ${
                  isActive
                    ? 'bg-[#0D9488] text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-[#0F172A] font-medium'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-500'
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Controls: Demo Role Switcher & Sign Out */}
      <div
        className={`border-t border-slate-200/80 py-4 space-y-3 ${
          collapsed ? 'px-2.5' : 'px-3'
        }`}
      >
        {user.isDemo && !collapsed && (
          <div className="px-1 space-y-2">
            <p className="text-[11px] font-semibold text-slate-500">Switch Demo Role</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(['donor', 'ngo', 'volunteer', 'admin'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={async () => {
                    await demoLogin(r);
                    setTab('workspace');
                    setActiveNavId('dashboard');
                    setNotice(null);
                    setMobileDrawerOpen(false);
                  }}
                  className={`px-2 py-1.5 text-xs font-medium rounded-lg capitalize border transition-colors ${
                    user.role === r
                      ? 'border-[#0D9488] bg-[#F0FDFA] text-[#0D9488] font-semibold'
                      : 'border-slate-200 text-slate-600 hover:text-[#0F172A] hover:bg-slate-50'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleSignOut}
          title={collapsed ? 'Sign Out' : undefined}
          aria-label="Sign Out"
          className={`w-full flex items-center rounded-xl text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${
            collapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] text-[#0F172A]">
      {/* Fixed Left Collapsible Sidebar (Desktop / Tablet) */}
      <aside
        className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200/90 shadow-[1px_0_12px_rgba(15,23,42,0.04)] transition-[width] duration-200 ease-out ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {renderSidebarContent(sidebarCollapsed, false)}
      </aside>

      {/* Responsive Mobile Sidebar Drawer */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-white h-full border-r border-slate-200 shadow-xl">
            {renderSidebarContent(false, true)}
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div
        className={`min-h-screen flex flex-col transition-[padding] duration-200 ease-out ${
          sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        {/* Clean White Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleHamburgerClick}
              aria-label="Toggle navigation sidebar"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-600 hover:text-[#0F172A] hover:bg-slate-50 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
            >
              <Menu className="w-4.5 h-4.5" />
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-display text-base sm:text-lg font-bold tracking-tight text-[#0F172A] whitespace-nowrap">
                FOOD RESCUE AI
              </span>
              <span className="hidden sm:inline text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="hidden sm:inline text-sm font-medium text-slate-500 truncate">
                {tab === 'analytics' ? 'Statistics & Activity' : ROLE_LABELS[user.role]}
              </span>
            </div>
          </div>

          {/* User Profile Avatar, Name & Dropdown */}
          <div className="relative shrink-0" ref={profileDropdownRef}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              className="inline-flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
            >
              <span className="w-8 h-8 rounded-lg bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1] font-display text-xs font-bold flex items-center justify-center shrink-0">
                {initials}
              </span>
              <span className="hidden sm:block text-left min-w-0 max-w-[160px]">
                <span className="block text-xs font-semibold text-[#0F172A] truncate">
                  {user.name}
                </span>
                <span className="block text-[11px] text-slate-500 capitalize truncate">
                  {user.role}
                </span>
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${
                  profileMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {profileMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-xl shadow-[0_10px_28px_rgba(15,23,42,0.08)] py-1.5 z-50"
              >
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-[#0F172A] truncate">{user.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                  <p className="text-[11px] font-medium text-[#0D9488] capitalize mt-0.5">
                    {user.role} account
                  </p>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setTab('workspace');
                      setActiveNavId('workspace');
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-[#0F172A] hover:bg-slate-50 flex items-center gap-2.5"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-[#0D9488]" />
                    <span>{ROLE_LABELS[user.role]}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setTab('analytics');
                      setActiveNavId('analytics');
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-[#0F172A] hover:bg-slate-50 flex items-center gap-2.5"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-[#0D9488]" />
                    <span>Statistics &amp; Activity</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={async () => {
                      setProfileMenuOpen(false);
                      await handleFullRefresh();
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-[#0F172A] hover:bg-slate-50 flex items-center gap-2.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Refresh Data</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main Fluid Dashboard Canvas */}
        <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
          {/* Page Title Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-[26px] font-bold tracking-tight text-[#0F172A]">
                {tab === 'analytics' ? 'Platform Statistics & Activity' : ROLE_LABELS[user.role]}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Monitor active donations, verify requests, and coordinate zero-waste handoffs.
              </p>
            </div>

            {(user.role === 'donor' || user.role === 'admin') && tab === 'workspace' && (
              <button
                type="button"
                onClick={() => {
                  setEditingDonation(null);
                  setDonationModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-xl shadow-xs transition-colors whitespace-nowrap w-fit"
              >
                <PackagePlus className="w-4 h-4" />
                <span>Create Donation</span>
              </button>
            )}
          </div>

          {notice && (
            <div
              className={`p-4 rounded-xl border text-sm flex items-center justify-between gap-4 ${
                notice.type === 'success'
                  ? 'bg-[#F0FDFA] border-[#99F6E4] text-[#0F172A]'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <span>{notice.text}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-xs font-semibold text-[#0D9488] underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Five Core Statistics Cards */}
          <section aria-label="Platform statistics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-[#0D9488]/40 hover:shadow-[0_6px_16px_rgba(13,148,136,0.08)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold text-slate-500 leading-snug">
                      {card.label}
                    </p>
                    <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1] flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="font-mono text-3xl font-bold tabular-nums tracking-tight text-[#0F172A] mt-4">
                    {card.value}
                  </p>
                </div>
              );
            })}
          </section>

          {/* Main Role Workspace or Analytics */}
          {tab === 'analytics' && stats ? (
            <div className="space-y-6">
              <ChartsSection stats={stats} />

              <section className="bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-[#0F172A]">
                      Recent Platform Activity
                    </h2>
                    <p className="text-xs text-slate-500">
                      Chronological ledger of real database actions across all four roles.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleFullRefresh}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#0F172A] w-fit"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh Data</span>
                  </button>
                </div>

                {stats.recentActivities.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4">No recorded activity yet.</p>
                ) : (
                  <div className="divide-y divide-slate-200/80">
                    {stats.recentActivities.map((act) => (
                      <div
                        key={act.id}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <span className="font-semibold text-[#0F172A]">{act.actorName}</span>{' '}
                          <span className="text-slate-500">({act.actorRole})</span> —{' '}
                          <span className="text-[#0F172A]">{act.action}:</span>{' '}
                          <span className="font-semibold text-[#0D9488]">{act.targetTitle}</span>
                        </div>
                        <span className="font-mono tabular-nums text-slate-500 shrink-0">
                          {new Date(act.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : loadingRoleData ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-10 text-center text-sm text-slate-500">
              Loading role workspace...
            </div>
          ) : (
            <>
              {user.role === 'donor' && (
                <DonorWorkspace
                  user={user}
                  donations={donations}
                  requests={requests}
                  tasks={tasks}
                  onCreateNew={() => {
                    setEditingDonation(null);
                    setDonationModalOpen(true);
                  }}
                  onEdit={(don) => {
                    setEditingDonation(don);
                    setDonationModalOpen(true);
                  }}
                  onMatchNgos={(don) => setMatchDonation(don)}
                  onRefresh={handleFullRefresh}
                  onNotify={notify}
                />
              )}

              {user.role === 'ngo' && (
                <NgoWorkspace
                  user={user}
                  organisation={organisation}
                  donations={donations}
                  requests={requests}
                  needs={needs}
                  onRefresh={handleFullRefresh}
                  onRefreshAuth={refreshSession}
                  onNavigate={onNavigate}
                  onNotify={notify}
                />
              )}

              {user.role === 'volunteer' && (
                <VolunteerWorkspace
                  user={user}
                  tasks={tasks}
                  donations={donations}
                  onRefresh={handleFullRefresh}
                  onNotify={notify}
                />
              )}

              {user.role === 'admin' && (
                <AdminWorkspace
                  user={user}
                  donations={donations}
                  siteSettings={siteSettings}
                  recentActivities={stats?.recentActivities || []}
                  onRefreshAll={handleFullRefresh}
                  onNotify={notify}
                />
              )}
            </>
          )}
        </div>
      </div>

      <DonationModal
        isOpen={donationModalOpen}
        editingDonation={editingDonation}
        onClose={() => setDonationModalOpen(false)}
        onSaved={async () => {
          notify('success', editingDonation ? 'Donation updated.' : 'Donation published.');
          await handleFullRefresh();
        }}
      />

      <NgoMatchModal donation={matchDonation} onClose={() => setMatchDonation(null)} />
    </div>
  );
}
