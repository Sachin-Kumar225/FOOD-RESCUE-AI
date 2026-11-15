import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  confirmDonationReceipt,
  createNgoNeedItem,
  deleteNgoNeedItem,
  requestDonationItem,
  saveMyOrganisation,
} from '../../lib/dataService.ts';
import { DonationStatusLabel, VerificationLabel } from '../../components/StatusLabel.tsx';
import type { PageRoute } from '../../components/Navbar.tsx';
import {
  DONATION_CATEGORIES,
  type Donation,
  type DonationCategory,
  type DonationRequest,
  type NgoNeed,
  type Organisation,
  type User,
} from '../../types.ts';

interface NgoWorkspaceProps {
  user: User;
  organisation: Organisation | null;
  donations: Donation[];
  requests: DonationRequest[];
  needs: NgoNeed[];
  onRefresh: () => Promise<void>;
  onRefreshAuth: () => Promise<void>;
  onNavigate: (page: PageRoute) => void;
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export function NgoWorkspace({
  user,
  organisation,
  donations,
  requests,
  needs,
  onRefresh,
  onRefreshAuth,
  onNavigate,
  onNotify,
}: NgoWorkspaceProps) {
  // Organisation profile form
  const [orgName, setOrgName] = useState(organisation?.name || user.name || '');
  const [orgType, setOrgType] = useState<Organisation['type']>(organisation?.type || 'NGO');
  const [regNumber, setRegNumber] = useState(organisation?.registrationNumber || '');
  const [orgCity, setOrgCity] = useState(organisation?.city || user.city || 'Bengaluru');
  const [orgAddress, setOrgAddress] = useState(organisation?.address || user.address || '');
  const [contactPhone, setContactPhone] = useState(organisation?.contactPhone || user.phone || '');
  const [capacityNote, setCapacityNote] = useState(organisation?.capacityNote || '');
  const [documentsSummary, setDocumentsSummary] = useState(organisation?.documentsSummary || '');
  const [savingOrg, setSavingOrg] = useState(false);

  useEffect(() => {
    setOrgName(organisation?.name || user.name || '');
    setOrgType(organisation?.type || 'NGO');
    setRegNumber(organisation?.registrationNumber || '');
    setOrgCity(organisation?.city || user.city || 'Bengaluru');
    setOrgAddress(organisation?.address || user.address || '');
    setContactPhone(organisation?.contactPhone || user.phone || '');
    setCapacityNote(organisation?.capacityNote || '');
    setDocumentsSummary(organisation?.documentsSummary || '');
  }, [organisation, user]);

  // Publish NGO Need form
  const [needCategory, setNeedCategory] = useState<DonationCategory>('Food');
  const [needTitle, setNeedTitle] = useState('');
  const [needQty, setNeedQty] = useState('40');
  const [needUnit, setNeedUnit] = useState('meals');
  const [needUrgency, setNeedUrgency] = useState<'Normal' | 'High' | 'Urgent'>('High');
  const [needNotes, setNeedNotes] = useState('');
  const [savingNeed, setSavingNeed] = useState(false);

  // Browse available donations filters
  const [browseQuery, setBrowseQuery] = useState('');
  const [browseCategory, setBrowseCategory] = useState<'All' | DonationCategory>('All');

  // Confirm Delivery modal state
  const [confirmingDonationId, setConfirmingDonationId] = useState<string | null>(null);
  const [conditionRating, setConditionRating] = useState<'Excellent' | 'Good' | 'Acceptable'>(
    'Good'
  );
  const [quantityConfirmed, setQuantityConfirmed] = useState('');
  const [receiverNotes, setReceiverNotes] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const isVerified = organisation?.verificationStatus === 'verified';

  const availableDonations = useMemo(() => {
    return donations.filter((d) => {
      if (d.status !== 'Available') return false;
      if (browseCategory !== 'All' && d.category !== browseCategory) return false;
      if (browseQuery.trim()) {
        const term = browseQuery.trim().toLowerCase();
        const hay = `${d.title} ${d.description} ${d.city} ${d.donorName} ${d.subCategory}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [donations, browseCategory, browseQuery]);

  const myNeeds = needs.filter((n) => organisation && n.orgId === organisation.id);

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !regNumber.trim() || !orgCity.trim() || !orgAddress.trim() || !contactPhone.trim()) {
      onNotify('error', 'Please fill in all required organisation fields.');
      return;
    }
    setSavingOrg(true);
    try {
      await saveMyOrganisation(organisation, user, {
        name: orgName,
        type: orgType,
        registrationNumber: regNumber,
        city: orgCity,
        address: orgAddress,
        contactPhone,
        capacityNote,
        documentsSummary,
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
    if (!organisation) {
      onNotify('error', 'Save your organisation profile before publishing needs.');
      return;
    }
    const qty = Number(needQty);
    if (!needTitle.trim() || !needUnit.trim() || !Number.isFinite(qty) || qty <= 0) {
      onNotify('error', 'Please enter a valid item title, positive quantity, and unit.');
      return;
    }
    setSavingNeed(true);
    try {
      await createNgoNeedItem(organisation, user, {
        category: needCategory,
        title: needTitle.trim(),
        quantityNeeded: qty,
        unit: needUnit.trim(),
        urgency: needUrgency,
        notes: needNotes.trim(),
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
    if (busyId === id) return;
    setBusyId(id);
    try {
      await deleteNgoNeedItem(id);
      onNotify('success', 'Requirement removed.');
      await onRefresh();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Failed to remove requirement.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRequestDonation = async (donation: Donation) => {
    if (!isVerified) {
      onNotify(
        'error',
        'Your organisation must be verified by an administrator before claiming donations.'
      );
      return;
    }
    setBusyId(donation.id);
    try {
      await requestDonationItem(donation, `Requested by ${organisation?.name || user.name}`);
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
    if (!confirmingDonationId || busyId !== null) return;
    if (!quantityConfirmed.trim()) {
      onNotify('error', 'Please enter the quantity confirmed upon arrival.');
      return;
    }
    setBusyId(confirmingDonationId);
    try {
      await confirmDonationReceipt(confirmingDonationId, {
        conditionRating,
        quantityConfirmed: quantityConfirmed.trim(),
        receiverNotes: receiverNotes.trim(),
      });
      setConfirmingDonationId(null);
      setConditionRating('Good');
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
      <section
        id="ngo-verification"
        className="scroll-mt-24 bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0D9488]" />
            <h2 className="font-display text-lg font-semibold text-[#0F172A]">
              Organisation Verification Profile
            </h2>
          </div>
          {organisation && <VerificationLabel status={organisation.verificationStatus} />}
        </div>

        {!organisation ? (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              Complete and submit your organisation registration details below to begin administrator
              verification.
            </span>
          </div>
        ) : organisation.verificationStatus === 'pending' ? (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              Your organisation profile is <strong>Pending Verification</strong>. You can publish
              resource needs now; claiming donations unlocks as soon as an administrator approves your
              credentials.
            </span>
          </div>
        ) : organisation.verificationStatus === 'rejected' ? (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
            <span>
              Verification was declined. Please update your registration ID, address, and document
              summary below so an administrator can re-verify your organisation.
            </span>
          </div>
        ) : null}

        <form onSubmit={handleSaveOrg} className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Organisation Name *
            </label>
            <input
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
            <select
              value={orgType}
              onChange={(e) => setOrgType(e.target.value as Organisation['type'])}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
            >
              <option value="NGO">NGO</option>
              <option value="Orphanage">Orphanage</option>
              <option value="Shelter">Shelter</option>
              <option value="Community Kitchen">Community Kitchen</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Registration ID *
            </label>
            <input
              type="text"
              required
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">City *</label>
            <input
              type="text"
              required
              value={orgCity}
              onChange={(e) => setOrgCity(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Contact Phone *
            </label>
            <input
              type="text"
              required
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Receiving Address *
            </label>
            <input
              type="text"
              required
              value={orgAddress}
              onChange={(e) => setOrgAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Daily Serving Capacity &amp; Notes
            </label>
            <input
              type="text"
              value={capacityNote}
              onChange={(e) => setCapacityNote(e.target.value)}
              placeholder="e.g. Serves 120 residents daily"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Verification Credentials / Certificate Notes
            </label>
            <input
              type="text"
              value={documentsSummary}
              onChange={(e) => setDocumentsSummary(e.target.value)}
              placeholder="e.g. 80G / 12A / Trust Deed reference"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={savingOrg}
              className="w-full px-4 py-2 text-sm font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg disabled:opacity-50"
            >
              {savingOrg
                ? 'Saving...'
                : organisation
                  ? 'Update Profile'
                  : 'Submit for Verification'}
            </button>
          </div>
        </form>
      </section>

      {/* Active Requests & Receipt Confirmation */}
      <section
        id="ngo-requests"
        className="scroll-mt-24 bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 space-y-4"
      >
        <div>
          <h2 className="font-display text-lg font-semibold text-[#0F172A]">
            My Requests &amp; Delivery Confirmation
          </h2>
          <p className="text-xs text-slate-500">
            Confirm physical receipt once items arrive at your center to complete the rescue record.
          </p>
        </div>

        {requests.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 border-t border-slate-200/80">
            No donation requests submitted yet. Browse available donations below to request items.
          </p>
        ) : (
          <div className="divide-y divide-slate-200/80 border-t border-slate-200/80">
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
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#0F172A]">{req.donationTitle}</p>
                      {linkedDonation && <DonationStatusLabel status={linkedDonation.status} />}
                    </div>
                    <p className="text-xs text-slate-500">
                      From {req.donorName} · Request Status:{' '}
                      <strong className="text-[#0F172A]">{req.status}</strong> · Quantity:{' '}
                      {req.requestedQuantity}
                    </p>
                  </div>

                  {canConfirm ? (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingDonationId(req.donationId);
                        setConditionRating('Good');
                        setQuantityConfirmed(req.requestedQuantity);
                        setReceiverNotes('');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Receipt</span>
                    </button>
                  ) : req.status === 'Fulfilled' ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Receipt Confirmed</span>
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Publish NGO Resource Needs */}
      <section id="ngo-needs" className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-[#0F172A]">
            Publish Resource Requirement
          </h2>
          <form onSubmit={handleAddNeed} className="space-y-3">
            <select
              value={needCategory}
              onChange={(e) => setNeedCategory(e.target.value as DonationCategory)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
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
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                min={1}
                required
                value={needQty}
                onChange={(e) => setNeedQty(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 tabular-nums"
              />
              <input
                type="text"
                required
                value={needUnit}
                onChange={(e) => setNeedUnit(e.target.value)}
                placeholder="unit"
                className="px-3 py-2 text-sm rounded-lg border border-slate-200"
              />
              <select
                value={needUrgency}
                onChange={(e) => setNeedUrgency(e.target.value as 'Normal' | 'High' | 'Urgent')}
                className="px-2 py-2 text-sm rounded-lg border border-slate-200 bg-white"
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
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200"
            />
            <button
              type="submit"
              disabled={savingNeed}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg disabled:opacity-50"
            >
              {savingNeed ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Publish Need</span>
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[#0F172A]">
              Active Organisation Needs
            </h2>
            <span className="font-mono text-xs tabular-nums text-slate-500">
              {myNeeds.length} active
            </span>
          </div>
          {myNeeds.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">
              No active resource requirements published yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-200/80">
              {myNeeds.map((n) => (
                <div key={n.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-[#0F172A]">{n.title}</p>
                    <p className="text-xs text-slate-500">
                      {n.category} ·{' '}
                      <span className="font-mono tabular-nums">
                        {n.quantityNeeded} {n.unit}
                      </span>{' '}
                      · Priority: {n.urgency}
                    </p>
                    {n.notes && <p className="text-xs text-slate-500">{n.notes}</p>}
                  </div>
                  <button
                    type="button"
                    disabled={busyId === n.id}
                    onClick={() => handleDeleteNeed(n.id)}
                    aria-label="Remove need"
                    className="p-2 text-slate-500 hover:text-red-700 rounded-lg disabled:opacity-50"
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
      <section
        id="ngo-available"
        className="scroll-mt-24 bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#0F172A]">
              Available Donations Ready to Claim
            </h2>
            <p className="text-xs text-slate-500">
              Filter live listings by item or category, or open the public catalog.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-xs tabular-nums text-slate-500">
              {availableDonations.length} available
            </span>
            <button
              type="button"
              onClick={() => onNavigate('browse')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-[#0F172A]"
            >
              <span>Full Catalog</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#0D9488]" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={browseQuery}
              onChange={(e) => setBrowseQuery(e.target.value)}
              placeholder="Search available food, blankets, school supplies, or city..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200"
            />
          </div>
          <div className="sm:col-span-4">
            <select
              value={browseCategory}
              onChange={(e) => setBrowseCategory(e.target.value as 'All' | DonationCategory)}
              aria-label="Filter available donations by category"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
            >
              <option value="All">All Categories</option>
              {DONATION_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {availableDonations.length === 0 ? (
          <p className="text-sm text-slate-500 py-2">
            No matching available donations at this moment.
          </p>
        ) : (
          <div className="divide-y divide-slate-200/80">
            {availableDonations.map((d) => (
              <div
                key={d.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-[#0F172A]">{d.title}</p>
                  <p className="text-xs text-slate-500">
                    {d.category} · {d.quantityValue} {d.quantityUnit} · {d.location}, {d.city}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === d.id || !isVerified}
                  onClick={() => handleRequestDonation(d)}
                  title={!isVerified ? 'Requires administrator verification first' : undefined}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg disabled:opacity-50 shrink-0"
                >
                  {busyId === d.id
                    ? 'Requesting...'
                    : isVerified
                      ? 'Request Donation'
                      : 'Requires Verification'}
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
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="font-display text-lg font-semibold text-[#0F172A]">
              Confirm Physical Delivery Receipt
            </h3>
            <p className="text-xs text-slate-500">
              Verify item quality and quantity upon arrival at your organisation.
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Inspected Condition
              </label>
              <select
                value={conditionRating}
                onChange={(e) =>
                  setConditionRating(e.target.value as 'Excellent' | 'Good' | 'Acceptable')
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Acceptable">Acceptable</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Quantity Confirmed *
              </label>
              <input
                type="text"
                required
                value={quantityConfirmed}
                onChange={(e) => setQuantityConfirmed(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Receiver Notes
              </label>
              <textarea
                rows={2}
                value={receiverNotes}
                onChange={(e) => setReceiverNotes(e.target.value)}
                placeholder="Temperature check, seal condition, or intake notes"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmingDonationId(null)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyId !== null}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg"
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
