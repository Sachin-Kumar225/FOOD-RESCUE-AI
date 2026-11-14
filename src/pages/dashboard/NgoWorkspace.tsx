import React, { useState } from 'react';
import { Building2, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import { apiRequest } from '../../lib/api.ts';
import { DonationStatusLabel, VerificationLabel } from '../../components/StatusLabel.tsx';
import {
  DONATION_CATEGORIES,
  type Donation,
  type DonationCategory,
  type DonationRequest,
  type NgoNeed,
  type Organisation,
} from '../../types.ts';

interface NgoWorkspaceProps {
  organisation: Organisation | null;
  donations: Donation[];
  requests: DonationRequest[];
  needs: NgoNeed[];
  onRefresh: () => Promise<void>;
  onRefreshAuth: () => Promise<void>;
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export function NgoWorkspace({
  organisation,
  donations,
  requests,
  needs,
  onRefresh,
  onRefreshAuth,
  onNotify,
}: NgoWorkspaceProps) {
  // Organisation profile form
  const [orgName, setOrgName] = useState(organisation?.name || '');
  const [orgType, setOrgType] = useState<Organisation['type']>(organisation?.type || 'NGO');
  const [regNumber, setRegNumber] = useState(organisation?.registrationNumber || '');
  const [orgCity, setOrgCity] = useState(organisation?.city || 'Bengaluru');
  const [orgAddress, setOrgAddress] = useState(organisation?.address || '');
  const [capacityNote, setCapacityNote] = useState(organisation?.capacityNote || '');
  const [savingOrg, setSavingOrg] = useState(false);

  // Publish NGO Need form
  const [needCategory, setNeedCategory] = useState<DonationCategory>('Food');
  const [needTitle, setNeedTitle] = useState('');
  const [needQty, setNeedQty] = useState('40');
  const [needUnit, setNeedUnit] = useState('meals');
  const [needUrgency, setNeedUrgency] = useState<'Normal' | 'High' | 'Urgent'>('High');
  const [needNotes, setNeedNotes] = useState('');
  const [savingNeed, setSavingNeed] = useState(false);

  // Confirm Delivery modal state
  const [confirmingDonationId, setConfirmingDonationId] = useState<string | null>(null);
  const [conditionRating, setConditionRating] = useState<'Excellent' | 'Good' | 'Acceptable'>(
    'Good'
  );
  const [quantityConfirmed, setQuantityConfirmed] = useState('');
  const [receiverNotes, setReceiverNotes] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const availableDonations = donations.filter((d) => d.status === 'Available');
  const myNeeds = needs.filter((n) => organisation && n.orgId === organisation.id);

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOrg(true);
    try {
      await apiRequest('/api/ngo/my-organisation', {
        method: 'PUT',
        body: JSON.stringify({
          name: orgName,
          type: orgType,
          registrationNumber: regNumber,
          city: orgCity,
          address: orgAddress,
          capacityNote,
        }),
      });
      await onRefreshAuth();
      await onRefresh();
      onNotify('success', 'Organisation verification profile saved.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Failed to save organisation.');
    } finally {
      setSavingOrg(false);
    }
  };

  const handleAddNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNeed(true);
    try {
      await apiRequest('/api/ngo-needs', {
        method: 'POST',
        body: JSON.stringify({
          category: needCategory,
          title: needTitle,
          quantityNeeded: Number(needQty),
          unit: needUnit,
          urgency: needUrgency,
          notes: needNotes,
        }),
      });
      setNeedTitle('');
      setNeedNotes('');
      onNotify('success', 'Resource requirement published for donor & AI matching.');
      await onRefresh();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Could not publish requirement.');
    } finally {
      setSavingNeed(false);
    }
  };

  const handleDeleteNeed = async (id: string) => {
    try {
      await apiRequest(`/api/ngo-needs/${id}`, { method: 'DELETE' });
      onNotify('success', 'Requirement removed.');
      await onRefresh();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Failed to remove requirement.');
    }
  };

  const handleRequestDonation = async (donation: Donation) => {
    setBusyId(donation.id);
    try {
      await apiRequest('/api/requests', {
        method: 'POST',
        body: JSON.stringify({
          donationId: donation.id,
          requestedQuantity: `${donation.quantityValue} ${donation.quantityUnit}`,
          notes: `Requested by ${organisation?.name || 'NGO'}`,
        }),
      });
      onNotify('success', `Requested "${donation.title}". Waiting for donor approval.`);
      await onRefresh();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Unable to request item.');
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingDonationId) return;
    setBusyId(confirmingDonationId);
    try {
      await apiRequest(`/api/donations/${confirmingDonationId}/confirm-receipt`, {
        method: 'POST',
        body: JSON.stringify({
          conditionRating,
          quantityConfirmed,
          receiverNotes,
        }),
      });
      setConfirmingDonationId(null);
      setQuantityConfirmed('');
      setReceiverNotes('');
      onNotify(
        'success',
        'Delivery confirmed! This donation now counts toward verified completed deliveries.'
      );
      await onRefresh();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Failed to confirm receipt.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Organisation Profile & Verification */}
      <section className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-700" />
            <h2 className="font-display text-lg font-semibold text-[#0F1F17]">
              Organisation Verification Profile
            </h2>
          </div>
          {organisation && <VerificationLabel status={organisation.verificationStatus} />}
        </div>

        <form onSubmit={handleSaveOrg} className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-[#47554E] mb-1">
              Organisation Name *
            </label>
            <input
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#47554E] mb-1">Type</label>
            <select
              value={orgType}
              onChange={(e) => setOrgType(e.target.value as Organisation['type'])}
              className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white"
            >
              <option value="NGO">NGO</option>
              <option value="Orphanage">Orphanage</option>
              <option value="Shelter">Shelter</option>
              <option value="Community Kitchen">Community Kitchen</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#47554E] mb-1">
              Registration ID *
            </label>
            <input
              type="text"
              required
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#47554E] mb-1">City *</label>
            <input
              type="text"
              required
              value={orgCity}
              onChange={(e) => setOrgCity(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#47554E] mb-1">
              Receiving Address *
            </label>
            <input
              type="text"
              required
              value={orgAddress}
              onChange={(e) => setOrgAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#47554E] mb-1">
              Daily Serving Capacity &amp; Notes
            </label>
            <input
              type="text"
              value={capacityNote}
              onChange={(e) => setCapacityNote(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={savingOrg}
              className="w-full px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50"
            >
              {savingOrg ? 'Saving...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </section>

      {/* Active Requests & Receipt Confirmation */}
      <section className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#0F1F17]">
            My Requests &amp; Delivery Confirmation
          </h2>
          <p className="text-xs text-[#47554E]">
            Confirm physical receipt once items arrive at your center to complete the rescue record.
          </p>
        </div>

        {requests.length === 0 ? (
          <p className="text-sm text-[#47554E] py-4 border-t border-emerald-950/10">
            No donation requests submitted yet. Browse available donations below to request items.
          </p>
        ) : (
          <div className="divide-y divide-emerald-950/10 border-t border-emerald-950/10">
            {requests.map((req) => {
              const linkedDonation = donations.find((d) => d.id === req.donationId);
              const canConfirm =
                req.status === 'Approved' &&
                linkedDonation &&
                (linkedDonation.status === 'Scheduled' || linkedDonation.status === 'Picked Up');

              return (
                <div
                  key={req.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#0F1F17]">{req.donationTitle}</p>
                      {linkedDonation && <DonationStatusLabel status={linkedDonation.status} />}
                    </div>
                    <p className="text-xs text-[#47554E]">
                      From {req.donorName} · Request Status:{' '}
                      <strong className="text-[#0F1F17]">{req.status}</strong> · Quantity:{' '}
                      {req.requestedQuantity}
                    </p>
                  </div>

                  {canConfirm && (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingDonationId(req.donationId);
                        setQuantityConfirmed(req.requestedQuantity);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Receipt</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Publish NGO Resource Needs */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-[#0F1F17]">
            Publish Resource Requirement
          </h2>
          <form onSubmit={handleAddNeed} className="space-y-3">
            <select
              value={needCategory}
              onChange={(e) => setNeedCategory(e.target.value as DonationCategory)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white"
            >
              {DONATION_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="text"
              required
              value={needTitle}
              onChange={(e) => setNeedTitle(e.target.value)}
              placeholder="Needed item (e.g. Winter wool blankets)"
              className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                min={1}
                required
                value={needQty}
                onChange={(e) => setNeedQty(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-emerald-950/15 tabular-nums"
              />
              <input
                type="text"
                required
                value={needUnit}
                onChange={(e) => setNeedUnit(e.target.value)}
                placeholder="unit"
                className="px-3 py-2 text-sm rounded-lg border border-emerald-950/15"
              />
              <select
                value={needUrgency}
                onChange={(e) => setNeedUrgency(e.target.value as 'Normal' | 'High' | 'Urgent')}
                className="px-2 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white"
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <input
              type="text"
              value={needNotes}
              onChange={(e) => setNeedNotes(e.target.value)}
              placeholder="Distribution timing or notes"
              className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15"
            />
            <button
              type="submit"
              disabled={savingNeed}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50"
            >
              {savingNeed ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Publish Need</span>
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[#0F1F17]">
              Active Organisation Needs
            </h2>
            <span className="font-mono text-xs tabular-nums text-[#47554E]">
              {myNeeds.length} active
            </span>
          </div>
          {myNeeds.length === 0 ? (
            <p className="text-sm text-[#47554E] py-4">
              No active resource requirements published yet.
            </p>
          ) : (
            <div className="divide-y divide-emerald-950/10">
              {myNeeds.map((n) => (
                <div key={n.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-[#0F1F17]">{n.title}</p>
                    <p className="text-xs text-[#47554E]">
                      {n.category} ·{' '}
                      <span className="font-mono tabular-nums">
                        {n.quantityNeeded} {n.unit}
                      </span>{' '}
                      · Priority: {n.urgency}
                    </p>
                    {n.notes && <p className="text-xs text-[#47554E]">{n.notes}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteNeed(n.id)}
                    aria-label="Remove need"
                    className="p-2 text-[#47554E] hover:text-red-700 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Available Donations Quick Request */}
      <section className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-[#0F1F17]">
            Available Donations Ready to Claim
          </h2>
          <span className="font-mono text-xs tabular-nums text-[#47554E]">
            {availableDonations.length} available
          </span>
        </div>

        {availableDonations.length === 0 ? (
          <p className="text-sm text-[#47554E]">No available donations at this moment.</p>
        ) : (
          <div className="divide-y divide-emerald-950/10">
            {availableDonations.map((d) => (
              <div
                key={d.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-[#0F1F17]">{d.title}</p>
                  <p className="text-xs text-[#47554E]">
                    {d.category} · {d.quantityValue} {d.quantityUnit} · {d.location}, {d.city}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === d.id}
                  onClick={() => handleRequestDonation(d)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50 shrink-0"
                >
                  {busyId === d.id ? 'Requesting...' : 'Request Donation'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Confirm Delivery Modal */}
      {confirmingDonationId && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmReceipt}
            className="bg-white border border-emerald-950/15 rounded-xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="font-display text-lg font-semibold text-[#0F1F17]">
              Confirm Physical Delivery Receipt
            </h3>
            <p className="text-xs text-[#47554E]">
              Verify item quality and quantity upon arrival at your organisation.
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#0F1F17] mb-1">
                Inspected Condition
              </label>
              <select
                value={conditionRating}
                onChange={(e) =>
                  setConditionRating(e.target.value as 'Excellent' | 'Good' | 'Acceptable')
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white"
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Acceptable">Acceptable</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F1F17] mb-1">
                Quantity Confirmed *
              </label>
              <input
                type="text"
                required
                value={quantityConfirmed}
                onChange={(e) => setQuantityConfirmed(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F1F17] mb-1">
                Receiver Notes
              </label>
              <textarea
                rows={2}
                value={receiverNotes}
                onChange={(e) => setReceiverNotes(e.target.value)}
                placeholder="Temperature check, seal condition, or intake notes"
                className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmingDonationId(null)}
                className="px-4 py-2 text-sm rounded-lg border border-emerald-950/15"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyId !== null}
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
              >
                Confirm Delivery
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
