import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Edit3,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { apiRequest } from '../../lib/api.ts';
import { SafeImage } from '../../components/SafeImage.tsx';
import { DonationStatusLabel } from '../../components/StatusLabel.tsx';
import type { Donation, DonationRequest, User } from '../../types.ts';

interface DonorWorkspaceProps {
  user: User;
  donations: Donation[];
  requests: DonationRequest[];
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
  onCreateNew,
  onEdit,
  onMatchNgos,
  onRefresh,
  onNotify,
}: DonorWorkspaceProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const myDonations = donations.filter((d) => d.donorId === user.id || user.role === 'admin');
  const incomingRequests = requests.filter(
    (r) => (r.donorId === user.id || user.role === 'admin') && r.status === 'Pending'
  );

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      await apiRequest(`/api/donations/${id}`, { method: 'DELETE' });
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
      await apiRequest(`/api/requests/${reqId}/respond`, {
        method: 'PATCH',
        body: JSON.stringify({
          decision,
          scheduledWindow: 'Same-day pickup window',
        }),
      });
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
      <section className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#0F1F17]">
              Incoming NGO Requests
            </h2>
            <p className="text-xs text-[#47554E]">
              Approve a verified NGO request to schedule volunteer pickup.
            </p>
          </div>
          <span className="font-mono text-xs tabular-nums text-[#47554E]">
            {incomingRequests.length} pending
          </span>
        </div>

        {incomingRequests.length === 0 ? (
          <p className="text-sm text-[#47554E] py-4 border-t border-emerald-950/10">
            No pending requests awaiting approval right now.
          </p>
        ) : (
          <div className="divide-y divide-emerald-950/10 border-t border-emerald-950/10">
            {incomingRequests.map((req) => (
              <div
                key={req.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#0F1F17]">{req.donationTitle}</p>
                  <p className="text-xs text-[#47554E]">
                    Requested by <strong className="text-[#0F1F17]">{req.orgName}</strong> ·
                    Quantity: {req.requestedQuantity}
                  </p>
                  {req.notes && <p className="text-xs text-[#47554E]">Note: {req.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busyId === req.id}
                    onClick={() => handleRespondRequest(req.id, 'approve')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyId === req.id}
                    onClick={() => handleRespondRequest(req.id, 'reject')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#0F1F17] border border-emerald-950/15 hover:bg-red-50 hover:text-red-700 rounded-lg disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Decline</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* My Donation Listings */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#0F1F17]">
              My Donation Listings
            </h2>
            <p className="text-xs text-[#47554E]">
              Create, edit, or match surplus items with verified NGOs.
            </p>
          </div>
          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>New Donation</span>
          </button>
        </div>

        {myDonations.length === 0 ? (
          <div className="bg-white border border-emerald-950/10 rounded-xl p-10 text-center space-y-3">
            <p className="text-sm font-medium text-[#0F1F17]">
              You have not published any donations yet.
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
            >
              Publish First Donation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {myDonations.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-emerald-950/10 rounded-xl overflow-hidden flex flex-col sm:flex-row"
              >
                <div className="sm:w-40 h-40 sm:h-auto shrink-0 bg-[#F8FAF9]">
                  <SafeImage
                    src={item.imageUrl}
                    alt={item.title}
                    fallbackTitle={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-[#47554E]">
                        {item.category} · {item.city}
                      </span>
                      <DonationStatusLabel status={item.status} />
                    </div>
                    <h3 className="font-display text-base font-semibold text-[#0F1F17]">
                      {item.title}
                    </h3>
                    <p className="font-mono text-xs tabular-nums text-[#47554E]">
                      {item.quantityValue} {item.quantityUnit}
                    </p>
                    {item.safetyEligibility?.requiresHumanReview && (
                      <p className="text-xs text-amber-800 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Human food-safety check required at handoff</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-emerald-950/10 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onMatchNgos(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>AI NGO Match</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-emerald-950/15 hover:bg-emerald-50"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {confirmDeleteId === item.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => handleDelete(item.id)}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1.5 text-xs rounded-lg border border-emerald-950/15"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-emerald-950/15 text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
