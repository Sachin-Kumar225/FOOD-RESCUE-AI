import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  PackagePlus,
  RefreshCw,
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
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
  UserRole,
  VolunteerTask,
} from '../types.ts';
import type { PageRoute } from '../components/Navbar.tsx';

interface DashboardPageProps {
  stats: PlatformStats | null;
  donations: Donation[];
  onRefreshGlobal: () => Promise<void>;
  onNavigate: (page: PageRoute) => void;
}

export function DashboardPage({
  stats,
  donations,
  onRefreshGlobal,
  onNavigate,
}: DashboardPageProps) {
  const { user, organisation, logout, demoLogin, refreshSession } = useAuth();
  const [tab, setTab] = useState<'workspace' | 'analytics'>('workspace');

  const [requests, setRequests] = useState<DonationRequest[]>([]);
  const [needs, setNeeds] = useState<NgoNeed[]>([]);
  const [tasks, setTasks] = useState<VolunteerTask[]>([]);
  const [loadingRoleData, setLoadingRoleData] = useState(true);

  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null);
  const [matchDonation, setMatchDonation] = useState<Donation | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const notify = useCallback((type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
  }, []);

  const fetchRoleData = useCallback(async () => {
    if (!user) return;
    setLoadingRoleData(true);
    try {
      const [reqRes, needsRes, tasksRes] = await Promise.all([
        apiRequest<{ requests: DonationRequest[] }>('/api/requests'),
        apiRequest<{ needs: NgoNeed[] }>('/api/ngo-needs'),
        apiRequest<{ tasks: VolunteerTask[] }>('/api/volunteer/tasks'),
      ]);
      setRequests(reqRes.requests);
      setNeeds(needsRes.needs);
      setTasks(tasksRes.tasks);
    } catch {
      // Handled gracefully
    } finally {
      setLoadingRoleData(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRoleData();
  }, [fetchRoleData]);

  const handleFullRefresh = useCallback(async () => {
    await Promise.all([onRefreshGlobal(), fetchRoleData()]);
  }, [onRefreshGlobal, fetchRoleData]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-[#0F1F17]">
          Sign in required to access your workspace
        </h1>
        <p className="text-sm text-[#47554E]">
          Role-based dashboards are protected. Sign in or select a Demo Mode role to continue.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('auth')}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  const roleLabels: Record<UserRole, string> = {
    donor: 'Donor Workspace',
    ngo: 'NGO / Receiver Workspace',
    volunteer: 'Volunteer Dispatch',
    admin: 'Administrator Console',
  };

  return (
    <div className="bg-[#F8FAF9] min-h-[calc(100vh-4rem)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-64 shrink-0 space-y-4">
          <div className="bg-white border border-emerald-950/10 rounded-xl p-5 space-y-3">
            <div className="space-y-0.5">
              <p className="text-xs font-mono uppercase tracking-wide text-emerald-700">
                {user.role}
              </p>
              <p className="font-display text-base font-bold text-[#0F1F17] truncate">
                {user.name}
              </p>
              <p className="text-xs text-[#47554E] truncate">{user.email}</p>
            </div>

            <div className="pt-3 border-t border-emerald-950/10 space-y-1">
              <button
                type="button"
                onClick={() => setTab('workspace')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  tab === 'workspace'
                    ? 'bg-emerald-50 text-emerald-900 font-semibold'
                    : 'text-[#47554E] hover:bg-emerald-50/50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>{roleLabels[user.role]}</span>
              </button>

              <button
                type="button"
                onClick={() => setTab('analytics')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  tab === 'analytics'
                    ? 'bg-emerald-50 text-emerald-900 font-semibold'
                    : 'text-[#47554E] hover:bg-emerald-50/50'
                }`}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Statistics &amp; Activity</span>
              </button>

              {(user.role === 'donor' || user.role === 'admin') && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingDonation(null);
                    setDonationModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg text-[#47554E] hover:bg-emerald-50/50"
                >
                  <PackagePlus className="w-4 h-4 shrink-0" />
                  <span>Create Donation</span>
                </button>
              )}
            </div>

            <div className="pt-3 border-t border-emerald-950/10">
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  onNavigate('home');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#47554E] hover:text-red-700 rounded-lg hover:bg-red-50/60"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Demo Role Switcher for Hackathon Testing */}
          {user.isDemo && (
            <div className="bg-white border border-emerald-950/10 rounded-xl p-4 space-y-2.5">
              <p className="text-xs font-semibold text-[#0F1F17]">Switch Demo Role</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(['donor', 'ngo', 'volunteer', 'admin'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={async () => {
                      await demoLogin(r);
                      setTab('workspace');
                      setNotice(null);
                    }}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg capitalize border transition-colors ${
                      user.role === r
                        ? 'border-emerald-700 bg-emerald-700 text-white'
                        : 'border-emerald-950/15 text-[#47554E] hover:text-[#0F1F17]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main Viewport */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Top Breadcrumb & Refresh */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-[#47554E]">
                Dashboard / {tab === 'workspace' ? roleLabels[user.role] : 'Statistics & Activity'}
              </p>
              <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F1F17]">
                {tab === 'workspace' ? roleLabels[user.role] : 'Platform Statistics & Activity'}
              </h1>
            </div>

            <button
              type="button"
              onClick={handleFullRefresh}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-emerald-950/15 bg-white hover:bg-emerald-50 w-fit"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Data</span>
            </button>
          </div>

          {notice && (
            <div
              className={`p-3.5 rounded-xl border text-sm flex items-center justify-between gap-4 ${
                notice.type === 'success'
                  ? 'bg-emerald-50 border-emerald-700/20 text-emerald-950'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <span>{notice.text}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-xs font-semibold underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* 5 Core KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-emerald-950/10 rounded-xl p-4 space-y-1">
              <p className="text-xs text-[#47554E]">Total Donations</p>
              <p className="font-mono text-2xl font-semibold tabular-nums text-[#0F1F17]">
                {stats ? stats.totalDonations : '—'}
              </p>
            </div>
            <div className="bg-white border border-emerald-950/10 rounded-xl p-4 space-y-1">
              <p className="text-xs text-[#47554E]">Available Donations</p>
              <p className="font-mono text-2xl font-semibold tabular-nums text-emerald-700">
                {stats ? stats.availableDonations : '—'}
              </p>
            </div>
            <div className="bg-white border border-emerald-950/10 rounded-xl p-4 space-y-1">
              <p className="text-xs text-[#47554E]">Completed (Confirmed)</p>
              <p className="font-mono text-2xl font-semibold tabular-nums text-emerald-800">
                {stats ? stats.completedDonations : '—'}
              </p>
            </div>
            <div className="bg-white border border-emerald-950/10 rounded-xl p-4 space-y-1">
              <p className="text-xs text-[#47554E]">Registered NGOs</p>
              <p className="font-mono text-2xl font-semibold tabular-nums text-[#0F1F17]">
                {stats ? stats.registeredNgos : '—'}
              </p>
            </div>
            <div className="bg-white border border-emerald-950/10 rounded-xl p-4 space-y-1">
              <p className="text-xs text-[#47554E]">Pending Requests</p>
              <p className="font-mono text-2xl font-semibold tabular-nums text-amber-700">
                {stats ? stats.pendingRequests : '—'}
              </p>
            </div>
          </div>

          {tab === 'analytics' && stats ? (
            <div className="space-y-6">
              <ChartsSection stats={stats} />

              <section className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#0F1F17]">
                    Recent Platform Activity
                  </h2>
                  <p className="text-xs text-[#47554E]">
                    Chronological ledger of real database actions across all four roles.
                  </p>
                </div>

                {stats.recentActivities.length === 0 ? (
                  <p className="text-sm text-[#47554E]">No recorded activity yet.</p>
                ) : (
                  <div className="divide-y divide-emerald-950/10">
                    {stats.recentActivities.map((act) => (
                      <div
                        key={act.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <span className="font-semibold text-[#0F1F17]">{act.actorName}</span>{' '}
                          <span className="text-[#47554E]">({act.actorRole})</span> —{' '}
                          <span className="text-[#0F1F17]">{act.action}:</span>{' '}
                          <span className="font-medium text-emerald-800">{act.targetTitle}</span>
                        </div>
                        <span className="font-mono tabular-nums text-[#47554E] shrink-0">
                          {new Date(act.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : loadingRoleData ? (
            <div className="bg-white border border-emerald-950/10 rounded-xl p-10 text-center text-sm text-[#47554E]">
              Loading role workspace...
            </div>
          ) : (
            <>
              {user.role === 'donor' && (
                <DonorWorkspace
                  user={user}
                  donations={donations}
                  requests={requests}
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
                  organisation={organisation}
                  donations={donations}
                  requests={requests}
                  needs={needs}
                  onRefresh={handleFullRefresh}
                  onRefreshAuth={refreshSession}
                  onNotify={notify}
                />
              )}

              {user.role === 'volunteer' && (
                <VolunteerWorkspace
                  user={user}
                  tasks={tasks}
                  onRefresh={handleFullRefresh}
                  onNotify={notify}
                />
              )}

              {user.role === 'admin' && (
                <AdminWorkspace
                  donations={donations}
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
