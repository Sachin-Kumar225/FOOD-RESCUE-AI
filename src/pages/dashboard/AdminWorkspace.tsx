import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  RefreshCw,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import { apiRequest } from '../../lib/api.ts';
import { DonationStatusLabel, VerificationLabel } from '../../components/StatusLabel.tsx';
import type {
  ContactMessage,
  DeliveryRecord,
  Donation,
  ModerationReport,
  Organisation,
  User,
} from '../../types.ts';

interface AdminOverviewData {
  users: User[];
  organisations: Organisation[];
  reports: ModerationReport[];
  contactMessages: ContactMessage[];
  deliveryRecords: DeliveryRecord[];
}

interface AdminWorkspaceProps {
  donations: Donation[];
  onRefreshAll: () => Promise<void>;
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export function AdminWorkspace({
  donations,
  onRefreshAll,
  onNotify,
}: AdminWorkspaceProps) {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAdminOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<AdminOverviewData>('/api/admin/overview');
      setData(res);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Failed to load admin overview.');
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    loadAdminOverview();
  }, [loadAdminOverview]);

  const handleVerifyOrg = async (orgId: string, status: 'verified' | 'rejected') => {
    setBusyId(orgId);
    try {
      await apiRequest(`/api/admin/organisations/${orgId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ verificationStatus: status }),
      });
      onNotify('success', `Organisation marked as ${status}.`);
      await Promise.all([loadAdminOverview(), onRefreshAll()]);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Failed to update NGO verification.');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: 'active' | 'suspended') => {
    setBusyId(userId);
    try {
      const next = currentStatus === 'active' ? 'suspended' : 'active';
      await apiRequest(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      onNotify('success', `User status changed to ${next}.`);
      await loadAdminOverview();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Could not update user.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteDonation = async (id: string) => {
    setBusyId(id);
    try {
      await apiRequest(`/api/donations/${id}`, { method: 'DELETE' });
      onNotify('success', 'Listing removed by administrator.');
      await onRefreshAll();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Could not remove listing.');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleFlagDonation = async (donation: Donation) => {
    setBusyId(donation.id);
    try {
      await apiRequest(`/api/admin/donations/${donation.id}/moderate`, {
        method: 'PATCH',
        body: JSON.stringify({
          flaggedForModeration: !donation.flaggedForModeration,
        }),
      });
      onNotify('success', 'Moderation flag updated.');
      await onRefreshAll();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Failed to update moderation flag.');
    } finally {
      setBusyId(null);
    }
  };

  const handleResolveReport = async (reportId: string) => {
    setBusyId(reportId);
    try {
      await apiRequest(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Resolved', adminNotes: 'Reviewed by admin desk.' }),
      });
      onNotify('success', 'Report marked as Resolved.');
      await loadAdminOverview();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Failed to resolve report.');
    } finally {
      setBusyId(null);
    }
  };

  const handleResetDemo = async () => {
    setBusyId('reset');
    try {
      await apiRequest('/api/admin/reset-demo', { method: 'POST' });
      onNotify('success', 'Sample platform database reset to initial state.');
      await Promise.all([loadAdminOverview(), onRefreshAll()]);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading || !data) {
    return (
      <div className="bg-white border border-emerald-950/10 rounded-xl p-10 text-center text-sm text-[#47554E]">
        Loading administrator controls...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* NGO Verification Queue */}
      <section className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#0F1F17]">
              NGO &amp; Shelter Verification Queue
            </h2>
            <p className="text-xs text-[#47554E]">
              Only verified organisations are permitted to request donations.
            </p>
          </div>
          <button
            type="button"
            disabled={busyId === 'reset'}
            onClick={handleResetDemo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-950/15 hover:bg-emerald-50 w-fit"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo Seed Data</span>
          </button>
        </div>

        <div className="divide-y divide-emerald-950/10 border-t border-emerald-950/10">
          {data.organisations.map((org) => (
            <div
              key={org.id}
              className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-[#0F1F17]">{org.name}</p>
                  <VerificationLabel status={org.verificationStatus} />
                </div>
                <p className="text-xs text-[#47554E]">
                  {org.type} · Reg: <span className="font-mono">{org.registrationNumber}</span> ·{' '}
                  {org.city}
                </p>
                <p className="text-xs text-[#47554E]">{org.documentsSummary}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {org.verificationStatus !== 'verified' && (
                  <button
                    type="button"
                    disabled={busyId === org.id}
                    onClick={() => handleVerifyOrg(org.id, 'verified')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Verify</span>
                  </button>
                )}
                {org.verificationStatus !== 'rejected' && (
                  <button
                    type="button"
                    disabled={busyId === org.id}
                    onClick={() => handleVerifyOrg(org.id, 'rejected')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-emerald-950/15 text-red-700 hover:bg-red-50 rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Donation Moderation */}
      <section className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#0F1F17]">
            Donation Moderation &amp; Human Safety Review
          </h2>
          <p className="text-xs text-[#47554E]">
            Monitor safety-flagged listings and remove non-compliant posts.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-emerald-950/10 text-[#47554E]">
                <th className="py-2.5 pr-4 font-semibold">Listing</th>
                <th className="py-2.5 pr-4 font-semibold">Category</th>
                <th className="py-2.5 pr-4 font-semibold">Status</th>
                <th className="py-2.5 pr-4 font-semibold">Safety Check</th>
                <th className="py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/10">
              {donations.map((d) => (
                <tr key={d.id} className="hover:bg-[#F8FAF9]">
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-[#0F1F17]">{d.title}</p>
                    <p className="text-[#47554E]">
                      {d.donorName} · {d.city}
                    </p>
                  </td>
                  <td className="py-3 pr-4 text-[#47554E] whitespace-nowrap">{d.category}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <DonationStatusLabel status={d.status} />
                  </td>
                  <td className="py-3 pr-4">
                    {d.safetyEligibility.requiresHumanReview ? (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Human Review</span>
                      </span>
                    ) : (
                      <span className="text-[#47554E]">Standard</span>
                    )}
                  </td>
                  <td className="py-3 text-right whitespace-nowrap space-x-2">
                    <button
                      type="button"
                      disabled={busyId === d.id}
                      onClick={() => handleToggleFlagDonation(d)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-emerald-950/15 hover:bg-amber-50"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                      <span>{d.flaggedForModeration ? 'Unflag' : 'Flag'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={busyId === d.id}
                      onClick={() => handleDeleteDonation(d.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-emerald-950/15 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Users & Moderation Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-[#0F1F17]">
            Registered Users ({data.users.length})
          </h2>
          <div className="divide-y divide-emerald-950/10">
            {data.users.map((u) => (
              <div key={u.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-semibold text-[#0F1F17]">
                    {u.name} · <span className="uppercase font-mono text-emerald-800">{u.role}</span>
                  </p>
                  <p className="text-[#47554E]">
                    {u.email} · {u.city} · Status: {u.status}
                  </p>
                </div>
                {u.role !== 'admin' && (
                  <button
                    type="button"
                    disabled={busyId === u.id}
                    onClick={() => handleToggleUserStatus(u.id, u.status)}
                    className={`px-2.5 py-1 rounded border text-xs font-medium ${
                      u.status === 'active'
                        ? 'border-red-200 text-red-700 hover:bg-red-50'
                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {u.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-[#0F1F17]">
            Moderation Reports &amp; Inquiries
          </h2>
          <div className="divide-y divide-emerald-950/10">
            {data.reports.length === 0 ? (
              <p className="text-xs text-[#47554E]">No moderation reports filed.</p>
            ) : (
              data.reports.map((rep) => (
                <div key={rep.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-[#0F1F17]">
                      {rep.targetTitle} · Status: {rep.status}
                    </p>
                    <p className="text-[#47554E]">{rep.reason}</p>
                    <p className="text-[#47554E]">Reported by {rep.reporterName}</p>
                  </div>
                  {rep.status !== 'Resolved' && (
                    <button
                      type="button"
                      disabled={busyId === rep.id}
                      onClick={() => handleResolveReport(rep.id)}
                      className="px-2.5 py-1 rounded bg-emerald-700 text-white font-medium shrink-0"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {data.contactMessages.length > 0 && (
            <div className="pt-4 border-t border-emerald-950/10 space-y-2">
              <p className="text-xs font-semibold text-[#0F1F17]">
                Recent Contact Messages ({data.contactMessages.length})
              </p>
              {data.contactMessages.slice(0, 4).map((msg) => (
                <div key={msg.id} className="p-2.5 rounded-lg bg-[#F8FAF9] text-xs space-y-0.5">
                  <p className="font-semibold text-[#0F1F17]">
                    {msg.subject} — {msg.name} ({msg.email})
                  </p>
                  <p className="text-[#47554E]">{msg.message}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
