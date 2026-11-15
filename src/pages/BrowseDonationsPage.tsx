import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Flag,
  ImagePlus,
  Loader2,
  MapPin,
  Search,
  Users,
} from 'lucide-react';
import {
  requestDonationItem,
  submitModerationReport,
  updateDonationPhoto,
} from '../lib/dataService.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { SafeImage } from '../components/SafeImage.tsx';
import { DonationStatusLabel } from '../components/StatusLabel.tsx';
import { NgoMatchModal } from '../components/NgoMatchModal.tsx';
import { PhotoEditorModal } from '../components/PhotoEditorModal.tsx';
import { getDefaultDonationImage } from '../lib/imageUtils.ts';
import {
  DONATION_CATEGORIES,
  DONATION_STATUS_ORDER,
  type Donation,
  type DonationCategory,
  type DonationStatus,
} from '../types.ts';
import type { PageRoute } from '../components/Navbar.tsx';

interface BrowseDonationsPageProps {
  donations: Donation[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onNavigate: (page: PageRoute) => void;
}

export function BrowseDonationsPage({
  donations,
  loading,
  onRefresh,
  onNavigate,
}: BrowseDonationsPageProps) {
  const { user, organisation } = useAuth();

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | DonationCategory>('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | DonationStatus>('All');
  const [selectedCity, setSelectedCity] = useState('All');

  const [matchDonation, setMatchDonation] = useState<Donation | null>(null);
  const [editingPhotoDonation, setEditingPhotoDonation] = useState<Donation | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<Donation | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportError, setReportError] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const cities = useMemo(() => {
    const unique = Array.from(new Set(donations.map((d) => d.city).filter(Boolean)));
    return ['All', ...unique];
  }, [donations]);

  const filtered = useMemo(() => {
    return donations.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (selectedStatus !== 'All' && item.status !== selectedStatus) return false;
      if (selectedCity !== 'All' && item.city !== selectedCity) return false;
      if (query.trim()) {
        const term = query.trim().toLowerCase();
        const hay = `${item.title} ${item.description} ${item.subCategory} ${item.city} ${item.donorName}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [donations, selectedCategory, selectedStatus, selectedCity, query]);

  const handleRequestDonation = async (donation: Donation) => {
    setFeedback(null);
    if (!user) {
      onNavigate('signin');
      return;
    }
    if (user.role !== 'ngo') {
      setFeedback({
        type: 'error',
        text: 'Only verified NGO / Receiver accounts can request donations.',
      });
      return;
    }
    setRequestingId(donation.id);
    try {
      await requestDonationItem(
        donation,
        `Requested via Browse Catalog by ${organisation?.name || user.name}`
      );
      setFeedback({
        type: 'success',
        text: `Request submitted for "${donation.title}". Check your NGO Dashboard for donor approval.`,
      });
      await onRefresh();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to submit request.',
      });
    } finally {
      setRequestingId(null);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportTarget || !user || submittingReport) return;
    if (!reportReason.trim()) {
      setReportError('Please enter a brief reason before submitting your report.');
      return;
    }
    setReportError('');
    setSubmittingReport(true);
    try {
      await submitModerationReport(
        {
          targetType: 'donation',
          targetId: reportTarget.id,
          targetTitle: reportTarget.title,
          reason: reportReason.trim(),
        },
        user
      );
      setReportTarget(null);
      setReportReason('');
      setFeedback({
        type: 'success',
        text: 'Report submitted to platform administrators for review.',
      });
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Could not submit report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div className="bg-[#F8FAF9] min-h-[calc(100vh-4rem)] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#0F1F17]">
              Browse Surplus Donations
            </h1>
            <p className="text-sm text-[#47554E] mt-1">
              Search live food and essential listings across verified donors and community hubs.
            </p>
          </div>
          <p className="font-mono text-xs tabular-nums text-[#47554E]">
            Showing {filtered.length} of {donations.length} listings
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white border border-emerald-950/10 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6 relative">
              <Search className="w-4 h-4 text-[#47554E] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search meals, produce, blankets, books, donor, or city..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div className="md:col-span-3">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as 'All' | DonationStatus)}
                aria-label="Filter by status"
                className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white"
              >
                <option value="All">All Statuses</option>
                {DONATION_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                aria-label="Filter by city"
                className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white"
              >
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c === 'All' ? 'All Cities' : c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Interactive Segmented Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {(['All', ...DONATION_CATEGORIES] as const).map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-emerald-700 text-white'
                      : 'bg-[#F1F5F2] text-[#47554E] hover:text-[#0F1F17]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {feedback && (
          <div
            className={`p-4 rounded-xl border text-sm ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-700/20 text-emerald-950'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white border border-emerald-950/10 rounded-xl h-80 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-emerald-950/10 rounded-xl p-12 text-center space-y-3">
            <p className="font-display text-lg font-semibold text-[#0F1F17]">
              No matching donations found
            </p>
            <p className="text-sm text-[#47554E]">
              Try clearing your search filter or switching categories.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedCategory('All');
                setSelectedStatus('All');
                setSelectedCity('All');
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-emerald-950/15 hover:bg-emerald-50"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => {
              const canEditPhoto =
                user && (user.role === 'admin' || user.id === item.donorId);
              return (
                <article
                  key={item.id}
                  className="bg-white border border-emerald-950/10 rounded-xl overflow-hidden flex flex-col"
                >
                  <div className="relative h-44 bg-[#F8FAF9] border-b border-emerald-950/10">
                    <SafeImage
                      src={item.imageUrl}
                      fallbackSrc={getDefaultDonationImage(item.category)}
                      alt={item.title}
                      fallbackTitle={item.title}
                      className="w-full h-full object-cover"
                    />
                    {canEditPhoto && (
                      <button
                        type="button"
                        onClick={() => setEditingPhotoDonation(item)}
                        className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/95 text-[#0F1F17] border border-emerald-950/15 shadow-xs hover:bg-white"
                      >
                        <ImagePlus className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Edit Photo</span>
                      </button>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-[#47554E]">
                          {item.category} · {item.subCategory}
                        </span>
                        <DonationStatusLabel status={item.status} />
                      </div>

                      <h2 className="font-display text-lg font-semibold text-[#0F1F17] leading-snug">
                        {item.title}
                      </h2>

                      <p className="text-sm text-[#47554E] line-clamp-3">{item.description}</p>

                      <div className="text-xs text-[#47554E] space-y-1 pt-1">
                        <p className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>Donor: {item.donorName}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>
                            {item.location}, {item.city}
                          </span>
                        </p>
                      </div>

                      {item.safetyEligibility?.requiresHumanReview && (
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                          <span>
                            Human food-safety inspection required at pickup.
                            {item.foodDetails?.storageCondition
                              ? ` Stored: ${item.foodDetails.storageCondition}.`
                              : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-emerald-950/10 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#47554E]">Quantity</span>
                        <span className="font-mono font-semibold tabular-nums text-[#0F1F17]">
                          {item.quantityValue} {item.quantityUnit}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {item.status === 'Available' && (!user || user.role === 'ngo') && (
                          <button
                            type="button"
                            onClick={() => {
                              if (user && organisation?.verificationStatus !== 'verified') {
                                setFeedback({
                                  type: 'error',
                                  text: 'Your NGO organisation must be verified by an administrator before claiming donations. Complete your verification profile in Dashboard.',
                                });
                                return;
                              }
                              handleRequestDonation(item);
                            }}
                            disabled={requestingId === item.id}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50 whitespace-nowrap"
                          >
                            {requestingId === item.id && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            )}
                            <span>
                              {!user
                                ? 'Sign In to Request'
                                : organisation?.verificationStatus !== 'verified'
                                  ? 'Verification Pending'
                                  : 'Request Item'}
                            </span>
                          </button>
                        )}

                        {user && (
                          <button
                            type="button"
                            onClick={() => setMatchDonation(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-emerald-950/15 text-[#0F1F17] hover:bg-emerald-50 whitespace-nowrap"
                          >
                            <Users className="w-3.5 h-3.5 text-emerald-700" />
                            <span>NGO Matches</span>
                          </button>
                        )}

                        {user && (
                          <button
                            type="button"
                            onClick={() => {
                              setReportTarget(item);
                              setReportReason('');
                              setReportError('');
                            }}
                            title="Report listing to admin"
                            aria-label="Report listing"
                            className="p-2 rounded-lg border border-emerald-950/15 text-[#47554E] hover:text-red-700 hover:border-red-200"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <NgoMatchModal donation={matchDonation} onClose={() => setMatchDonation(null)} />

      <PhotoEditorModal
        isOpen={editingPhotoDonation !== null}
        title={editingPhotoDonation?.title || 'Donation Photo'}
        initialUrl={editingPhotoDonation?.imageUrl || ''}
        onClose={() => setEditingPhotoDonation(null)}
        onSave={async ({ url }) => {
          if (!editingPhotoDonation) return;
          await updateDonationPhoto(editingPhotoDonation.id, url, user);
          setFeedback({ type: 'success', text: 'Donation photo updated and saved.' });
          await onRefresh();
        }}
      />

      {/* Report Modal */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white border border-emerald-950/15 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold text-[#0F1F17]">
              Report Listing for Admin Review
            </h3>
            <p className="text-xs text-[#47554E]">Listing: {reportTarget.title}</p>
            {reportError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {reportError}
              </div>
            )}
            <textarea
              rows={3}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Describe the concern (e.g. incorrect expiry, unsealed food, duplicate listing)..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={submittingReport}
                onClick={() => setReportTarget(null)}
                className="px-4 py-2 text-sm rounded-lg border border-emerald-950/15 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingReport}
                onClick={handleSubmitReport}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submittingReport && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Submit Report</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
