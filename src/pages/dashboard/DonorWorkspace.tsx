import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Edit3,
  ImagePlus,
  Inbox,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  deleteDonationListing,
  respondToDonationRequest,
  updateDonationPhoto,
} from '../../lib/dataService.ts';
import { SafeImage } from '../../components/SafeImage.tsx';
import { DonationStatusLabel } from '../../components/StatusLabel.tsx';
import { PhotoEditorModal } from '../../components/PhotoEditorModal.tsx';
import type { Donation, DonationRequest, User, VolunteerTask } from '../../types.ts';

interface DonorWorkspaceProps {
  user: User;
  donations: Donation[];
  requests: DonationRequest[];
  tasks: VolunteerTask[];
  onCreateNew: () => void;
  onEdit: (donation: Donation) => void;
  onMatchNgos: (donation: Donation) => void;
  onRefresh: () => Promise<void>;
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export function DonorWorkspace({
  user,
  donations,
  requests,
  tasks,
  onCreateNew,
  onEdit,
  onMatchNgos,
  onRefresh,
  onNotify,
}: DonorWorkspaceProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingPhotoDonation, setEditingPhotoDonation] = useState<Donation | null>(null);
  const [pickupWindows, setPickupWindows] = useState<Record<string, string>>({});

  const myDonations = donations.filter((d) => d.donorId === user.id || user.role === 'admin');
  const incomingRequests = requests.filter(
    (r) => (r.donorId === user.id || user.role === 'admin') && r.status === 'Pending'
  );
  const processedRequests = requests.filter(
    (r) => (r.donorId === user.id || user.role === 'admin') && r.status !== 'Pending'
  );

  const handleRefreshClick = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      await deleteDonationListing(id);
      setConfirmDeleteId(null);
      onNotify('success', 'Donation listing deleted.');
      await onRefresh();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Failed to delete donation.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRespondRequest = async (reqId: string, decision: 'approve' | 'reject') => {
    setBusyId(reqId);
    try {
      const windowLabel = (pickupWindows[reqId] || '').trim() || 'Same-day pickup window';
      await respondToDonationRequest(reqId, decision, windowLabel);
      onNotify(
        'success',
        decision === 'approve'
          ? 'Request approved. Pickup task is now open for volunteers.'
          : 'Request declined; donation returned to Available status.'
      );
      await onRefresh();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Failed to respond to request.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Pending NGO Requests */}
      <section
        id="donor-requests"
        className="scroll-mt-24 bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0F172A]">
              Incoming NGO Requests
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Approve a verified NGO request to schedule volunteer pickup.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-xs font-semibold tabular-nums px-2.5 py-1 rounded-lg bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1]">
              {incomingRequests.length} pending
            </span>
            <button
              type="button"
              onClick={handleRefreshClick}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#0F172A] transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {incomingRequests.length === 0 ? (
          <div className="py-10 px-6 rounded-xl bg-[#F8FAFC] border border-dashed border-slate-200 text-center space-y-2.5">
            <div className="w-11 h-11 rounded-xl bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1] flex items-center justify-center mx-auto">
              <Inbox className="w-5 h-5" />
            </div>
            <p className="font-display text-sm font-semibold text-[#0F172A]">
              No pending requests awaiting approval right now.
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              When verified NGOs or shelters request your available donations, they will appear here
              for one-click approval and volunteer dispatch.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200/80 border-t border-slate-200/80">
            {incomingRequests.map((req) => (
              <div
                key={req.id}
                className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#0F172A]">{req.donationTitle}</p>
                  <p className="text-xs text-slate-500">
                    Requested by <strong className="text-[#0F172A]">{req.orgName}</strong> ·
                    Quantity: <span className="font-mono tabular-nums">{req.requestedQuantity}</span>
                  </p>
                  {req.notes && <p className="text-xs text-slate-500">Note: {req.notes}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <input
                    type="text"
                    value={pickupWindows[req.id] ?? ''}
                    onChange={(e) =>
                      setPickupWindows((prev) => ({ ...prev, [req.id]: e.target.value }))
                    }
                    placeholder="Pickup window (optional)"
                    aria-label="Pickup window"
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white w-48 focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  />
                  <button
                    type="button"
                    disabled={busyId === req.id}
                    onClick={() => handleRespondRequest(req.id, 'approve')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyId === req.id}
                    onClick={() => handleRespondRequest(req.id, 'reject')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#0F172A] border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Decline</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {processedRequests.length > 0 && (
          <div className="pt-4 border-t border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Scheduled &amp; Processed Handoffs ({processedRequests.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {processedRequests.slice(0, 6).map((req) => {
                const linkedTask = tasks.find((t) => t.requestId === req.id);
                return (
                  <div
                    key={req.id}
                    className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-[#0F172A]">{req.donationTitle}</span>{' '}
                      <span className="text-slate-500">
                        · {req.orgName} ({req.requestedQuantity})
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-md font-medium ${
                          req.status === 'Fulfilled'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : req.status === 'Approved'
                              ? 'bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1]'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Request: {req.status}
                      </span>
                      {linkedTask && (
                        <span className="text-slate-500">
                          Pickup: <strong className="text-[#0F172A]">{linkedTask.status}</strong>
                          {linkedTask.volunteerName ? ` (${linkedTask.volunteerName})` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* My Donation Listings */}
      <section id="donor-listings" className="scroll-mt-24 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0F172A]">
              My Donation Listings
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Create, edit details or photos, or match surplus items with verified NGOs.
            </p>
          </div>
          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-xl shadow-xs transition-colors whitespace-nowrap w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>New Donation</span>
          </button>
        </div>

        {myDonations.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-10 text-center space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1] flex items-center justify-center mx-auto">
              <Package className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-[#0F172A]">
              You have not published any donations yet.
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors"
            >
              Publish First Donation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {myDonations.map((item) => {
              const deleteLocked =
                user.role !== 'admin' &&
                (item.status === 'Picked Up' || item.status === 'Delivered');

              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-[#0D9488]/35 hover:shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition-all duration-200 overflow-hidden flex flex-col sm:flex-row"
                >
                  <div className="relative sm:w-44 h-44 sm:h-auto shrink-0 bg-slate-100">
                    <SafeImage
                      src={item.imageUrl}
                      alt={item.title}
                      fallbackTitle={item.title}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setEditingPhotoDonation(item)}
                      className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white/95 text-[#0F172A] border border-slate-200 shadow-xs hover:bg-white transition-colors"
                    >
                      <ImagePlus className="w-3.5 h-3.5 text-[#0D9488]" />
                      <span>Edit Photo</span>
                    </button>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                          <span>
                            {item.category} · {item.city}
                          </span>
                        </span>
                        <DonationStatusLabel status={item.status} />
                      </div>
                      <h3 className="font-display text-base font-bold text-[#0F172A] leading-snug">
                        {item.title}
                      </h3>
                      <p className="font-mono text-xs font-medium tabular-nums text-slate-600">
                        Quantity: {item.quantityValue} {item.quantityUnit}
                      </p>
                      {item.safetyEligibility?.requiresHumanReview && (
                        <p className="text-xs text-amber-700 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Human food-safety check required at handoff</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onMatchNgos(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1] hover:bg-[#CCFBF1]/60 transition-colors"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>AI NGO Match</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-[#0F172A] hover:bg-slate-50 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Edit</span>
                      </button>

                      {deleteLocked ? (
                        <span className="text-[11px] text-slate-400 px-2">
                          Locked after pickup
                        </span>
                      ) : confirmDeleteId === item.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => handleDelete(item.id)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <PhotoEditorModal
        isOpen={editingPhotoDonation !== null}
        title={editingPhotoDonation?.title || 'Donation Photo'}
        initialUrl={editingPhotoDonation?.imageUrl || ''}
        onClose={() => setEditingPhotoDonation(null)}
        onSave={async ({ url }) => {
          if (!editingPhotoDonation) return;
          await updateDonationPhoto(editingPhotoDonation.id, url, user);
          onNotify('success', 'Donation photo updated.');
          await onRefresh();
        }}
      />
    </div>
  );
}
