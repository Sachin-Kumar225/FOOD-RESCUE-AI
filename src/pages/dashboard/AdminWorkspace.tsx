import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  ImagePlus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import {
  deleteDonationListing,
  fetchAdminOverviewData,
  moderateDonationAdmin,
  resetDemoDataAdmin,
  resolveReportAdmin,
  toggleUserStatusAdmin,
  updateDonationPhoto,
  updateSiteSettings,
  verifyOrganisationAdmin,
  type AdminOverviewData,
} from '../../lib/dataService.ts';
import { isSupabaseConfigured } from '../../lib/supabase.ts';
import { DonationStatusLabel, VerificationLabel } from '../../components/StatusLabel.tsx';
import { SafeImage } from '../../components/SafeImage.tsx';
import { PhotoEditorModal } from '../../components/PhotoEditorModal.tsx';
import type { ActivityLog, Donation, SiteSettings, User } from '../../types.ts';

interface AdminWorkspaceProps {
  user: User;
  donations: Donation[];
  siteSettings: SiteSettings | null;
  recentActivities: ActivityLog[];
  onRefreshAll: () => Promise<void>;
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export function AdminWorkspace({
  user,
  donations,
  siteSettings,
  recentActivities,
  onRefreshAll,
  onNotify,
}: AdminWorkspaceProps) {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reportNotes, setReportNotes] = useState<Record<string, string>>({});
  const [photoTarget, setPhotoTarget] = useState<{
    kind: 'hero' | 'about' | 'donation';
    donationId?: string;
    title: string;
    url: string;
  } | null>(null);

  const loadAdminOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminOverviewData();
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

  const handleVerifyOrg = async (orgId: string, status: 'verified' | 'rejected' | 'pending') => {
    setBusyId(orgId);
    try {
      await verifyOrganisationAdmin(orgId, status, user.id);
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
      await toggleUserStatusAdmin(userId, next, user.id);
      onNotify('success', `User status changed to ${next}.`);
      await Promise.all([loadAdminOverview(), onRefreshAll()]);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Could not update user.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteDonation = async (id: string) => {
    setBusyId(id);
    try {
      await deleteDonationListing(id);
      onNotify('success', 'Listing removed by administrator.');
      await Promise.all([loadAdminOverview(), onRefreshAll()]);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Could not remove listing.');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleFlagDonation = async (donation: Donation) => {
    setBusyId(donation.id);
    try {
      await moderateDonationAdmin(
        donation.id,
        { flaggedForModeration: !donation.flaggedForModeration },
        user.id
      );
      onNotify('success', 'Moderation flag updated.');
      await Promise.all([loadAdminOverview(), onRefreshAll()]);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Failed to update moderation flag.');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleHumanReview = async (donation: Donation) => {
    setBusyId(donation.id);
    try {
      await moderateDonationAdmin(
        donation.id,
        { requiresHumanReview: !donation.safetyEligibility.requiresHumanReview },
        user.id
      );
      onNotify('success', 'Human safety review status updated.');
      await Promise.all([loadAdminOverview(), onRefreshAll()]);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Failed to update safety status.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReportStatus = async (reportId: string, status: 'Reviewed' | 'Resolved') => {
    setBusyId(reportId);
    try {
      await resolveReportAdmin(reportId, {
        status,
        adminNotes: reportNotes[reportId],
        adminId: user.id,
      });
      onNotify('success', `Report marked as ${status}.`);
      await Promise.all([loadAdminOverview(), onRefreshAll()]);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Failed to update report.');
    } finally {
      setBusyId(null);
    }
  };

  const handleResetDemo = async () => {
    setBusyId('reset');
    try {
      await resetDemoDataAdmin();
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
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-10 text-center text-sm text-slate-500">
        Loading administrator controls...
      </div>
    );
  }

  const heroUrl =
    siteSettings?.heroImageUrl || '/src/assets/images/hero_food_rescue_1794669342092.jpg';
  const aboutUrl =
    siteSettings?.aboutImageUrl || '/src/assets/images/about_community_hub_1794669343508.jpg';

  return (
    <div className="space-y-8">
      {/* Editorial & Site Photos Manager */}
      <section id="admin-photos" className="scroll-mt-24 bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#0F172A]">
            Platform Editorial Photos
          </h2>
          <p className="text-xs text-slate-500">
            Crop, rotate, adjust, or replace the main Hero and About mission images.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden bg-[#F8FAFC]">
            <div className="h-36">
              <SafeImage src={heroUrl} alt="Hero Banner" className="w-full h-full object-cover" />
            </div>
            <div className="p-3.5 bg-white flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-[#0F172A]">Landing Hero Banner</p>
                <p className="text-[11px] text-slate-500">Displayed on Home page</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setPhotoTarget({ kind: 'hero', title: 'Landing Hero Banner', url: heroUrl })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-emerald-50"
              >
                <ImagePlus className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>Edit Photo</span>
              </button>
            </div>
          </div>

          <div className="border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden bg-[#F8FAFC]">
            <div className="h-36">
              <SafeImage
                src={aboutUrl}
                alt="About Mission Banner"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-3.5 bg-white flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-[#0F172A]">About Page Photo</p>
                <p className="text-[11px] text-slate-500">Displayed on About page</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setPhotoTarget({ kind: 'about', title: 'About Page Photo', url: aboutUrl })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-emerald-50"
              >
                <ImagePlus className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>Edit Photo</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* NGO Verification Queue */}
      <section id="admin-verify" className="scroll-mt-24 bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#0F172A]">
              NGO &amp; Shelter Verification Queue
            </h2>
            <p className="text-xs text-slate-500">
              Only verified organisations are permitted to request donations.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadAdminOverview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            {!isSupabaseConfigured && (
              <button
                type="button"
                disabled={busyId === 'reset'}
                onClick={handleResetDemo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-emerald-50 w-fit"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Demo Seed Data</span>
              </button>
            )}
          </div>
        </div>

        {data.organisations.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 border-t border-slate-200/80">
            No NGO or shelter organisations have submitted verification profiles yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-200/80 border-t border-slate-200/80">
            {data.organisations.map((org) => (
              <div
                key={org.id}
                className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-semibold text-[#0F172A]">{org.name}</p>
                    <VerificationLabel status={org.verificationStatus} />
                  </div>
                  <p className="text-xs text-slate-500">
                    {org.type} · Reg: <span className="font-mono">{org.registrationNumber}</span> ·{' '}
                    {org.city}
                  </p>
                  <p className="text-xs text-slate-500">{org.documentsSummary}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {org.verificationStatus !== 'verified' && (
                    <button
                      type="button"
                      disabled={busyId === org.id}
                      onClick={() => handleVerifyOrg(org.id, 'verified')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg"
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
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-slate-200 text-red-700 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Donation Moderation */}
      <section id="admin-moderation" className="scroll-mt-24 bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#0F172A]">
            Donation Moderation &amp; Photo Management
          </h2>
          <p className="text-xs text-slate-500">
            Monitor safety-flagged listings, edit listing photos, and remove non-compliant posts.
          </p>
        </div>

        {donations.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 border-t border-slate-200/80">
            No donation listings recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-500">
                  <th className="py-2.5 pr-4 font-semibold">Photo</th>
                  <th className="py-2.5 pr-4 font-semibold">Listing</th>
                  <th className="py-2.5 pr-4 font-semibold">Category</th>
                  <th className="py-2.5 pr-4 font-semibold">Status</th>
                  <th className="py-2.5 pr-4 font-semibold">Safety &amp; Moderation</th>
                  <th className="py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {donations.map((d) => (
                  <tr key={d.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 pr-4">
                      <div className="w-12 h-10 rounded overflow-hidden border border-slate-200/80">
                        <SafeImage
                          src={d.imageUrl}
                          alt={d.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-[#0F172A]">{d.title}</p>
                      <p className="text-slate-500">
                        {d.donorName} · {d.city}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">{d.category}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <DonationStatusLabel status={d.status} />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {d.flaggedForModeration && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-700 font-medium">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Flagged</span>
                          </span>
                        )}
                        {d.safetyEligibility.requiresHumanReview ? (
                          <button
                            type="button"
                            disabled={busyId === d.id}
                            onClick={() => handleToggleHumanReview(d)}
                            title="Click to toggle Human Safety Review requirement"
                            className="inline-flex items-center gap-1 text-amber-700 font-medium hover:underline"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Human Review</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyId === d.id}
                            onClick={() => handleToggleHumanReview(d)}
                            title="Click to mark for Human Safety Review"
                            className="text-slate-500 hover:text-[#0F172A]"
                          >
                            Standard
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPhotoTarget({
                            kind: 'donation',
                            donationId: d.id,
                            title: d.title,
                            url: d.imageUrl,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 hover:bg-emerald-50"
                      >
                        <ImagePlus className="w-3.5 h-3.5 text-[#0D9488]" />
                        <span>Edit Photo</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyId === d.id}
                        onClick={() => handleToggleFlagDonation(d)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 hover:bg-amber-50"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                        <span>{d.flaggedForModeration ? 'Unflag' : 'Flag'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyId === d.id}
                        onClick={() => handleDeleteDonation(d.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 text-red-700 hover:bg-red-50"
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
        )}
      </section>

      {/* Users & Moderation Reports */}
      <div id="admin-users" className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-[#0F172A]">
            Registered Users ({data.users.length})
          </h2>
          <div className="divide-y divide-slate-200/80">
            {data.users.map((u) => (
              <div key={u.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-semibold text-[#0F172A]">
                    {u.name} · <span className="uppercase font-mono text-emerald-800">{u.role}</span>
                  </p>
                  <p className="text-slate-500">
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
                        : 'border-emerald-200 text-[#0D9488] hover:bg-emerald-50'
                    }`}
                  >
                    {u.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-[#0F172A]">
            Moderation Reports &amp; Inquiries
          </h2>
          <div className="divide-y divide-slate-200/80">
            {data.reports.length === 0 ? (
              <p className="text-xs text-slate-500">No moderation reports filed.</p>
            ) : (
              data.reports.map((rep) => (
                <div key={rep.id} className="py-3 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-[#0F172A]">
                        {rep.targetTitle} · Status: {rep.status}
                      </p>
                      <p className="text-slate-500">{rep.reason}</p>
                      <p className="text-slate-500">Reported by {rep.reporterName}</p>
                      {rep.adminNotes && (
                        <p className="text-[#0D9488]">Admin Note: {rep.adminNotes}</p>
                      )}
                    </div>
                  </div>

                  {rep.status !== 'Resolved' && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={reportNotes[rep.id] ?? ''}
                        onChange={(e) =>
                          setReportNotes((prev) => ({ ...prev, [rep.id]: e.target.value }))
                        }
                        placeholder="Admin resolution note (optional)"
                        className="flex-1 min-w-[160px] px-2.5 py-1 text-xs rounded border border-slate-200"
                      />
                      {rep.status === 'Open' && (
                        <button
                          type="button"
                          disabled={busyId === rep.id}
                          onClick={() => handleReportStatus(rep.id, 'Reviewed')}
                          className="px-2.5 py-1 rounded border border-slate-200 text-[#0F172A] hover:bg-slate-50 font-medium shrink-0"
                        >
                          Mark Reviewed
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busyId === rep.id}
                        onClick={() => handleReportStatus(rep.id, 'Resolved')}
                        className="px-2.5 py-1 rounded bg-[#0D9488] hover:bg-[#0F766E] text-white font-medium shrink-0"
                      >
                        Resolve
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {data.contactMessages.length > 0 && (
            <div className="pt-4 border-t border-slate-200/80 space-y-2">
              <p className="text-xs font-semibold text-[#0F172A]">
                Recent Contact Messages ({data.contactMessages.length})
              </p>
              {data.contactMessages.slice(0, 6).map((msg) => (
                <div key={msg.id} className="p-2.5 rounded-lg bg-[#F8FAFC] text-xs space-y-1">
                  <p className="font-semibold text-[#0F172A]">
                    {msg.subject} — {msg.name} ({msg.email})
                  </p>
                  {msg.roleInterest && (
                    <p className="text-[11px] font-medium text-[#0D9488]">
                      Participant Type: {msg.roleInterest}
                    </p>
                  )}
                  <p className="text-slate-600 whitespace-pre-wrap">{msg.message}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Verified Delivery Records & Platform Activity Audit */}
      <div id="admin-audit" className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0D9488]" />
            <h2 className="font-display text-lg font-semibold text-[#0F172A]">
              Verified Delivery Audit ({data.deliveryRecords.length})
            </h2>
          </div>
          {data.deliveryRecords.length === 0 ? (
            <p className="text-xs text-slate-500">
              No receiver-confirmed deliveries recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-200/80">
              {data.deliveryRecords.slice(0, 8).map((rec) => (
                <div key={rec.id} className="py-3 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#0F172A]">{rec.donationTitle}</span>
                    <span className="font-mono text-[#0D9488]">{rec.conditionRating}</span>
                  </div>
                  <p className="text-slate-500">
                    NGO: {rec.orgName} · Qty: {rec.quantityConfirmed}
                    {rec.volunteerName ? ` · Volunteer: ${rec.volunteerName}` : ''}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {new Date(rec.confirmedByNgoAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#0D9488]" />
            <h2 className="font-display text-lg font-semibold text-[#0F172A]">
              Recent Platform Activity ({recentActivities.length})
            </h2>
          </div>
          {recentActivities.length === 0 ? (
            <p className="text-xs text-slate-500">No platform activity logs recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-200/80">
              {recentActivities.slice(0, 8).map((act) => (
                <div key={act.id} className="py-2.5 text-xs space-y-0.5">
                  <p className="text-[#0F172A]">
                    <span className="font-semibold">{act.actorName}</span>{' '}
                    <span className="text-slate-500">({act.actorRole})</span> — {act.action}:{' '}
                    <span className="font-semibold text-[#0D9488]">{act.targetTitle}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {new Date(act.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <PhotoEditorModal
        isOpen={photoTarget !== null}
        title={photoTarget?.title || 'Edit Photo'}
        initialUrl={photoTarget?.url || heroUrl}
        onClose={() => setPhotoTarget(null)}
        onSave={async ({ url }) => {
          if (!photoTarget) return;
          if (photoTarget.kind === 'hero') {
            await updateSiteSettings({ heroImageUrl: url });
          } else if (photoTarget.kind === 'about') {
            await updateSiteSettings({ aboutImageUrl: url });
          } else if (photoTarget.donationId) {
            await updateDonationPhoto(photoTarget.donationId, url, user);
          }
          onNotify('success', 'Photo updated and saved.');
          await onRefreshAll();
        }}
      />
    </div>
  );
}
