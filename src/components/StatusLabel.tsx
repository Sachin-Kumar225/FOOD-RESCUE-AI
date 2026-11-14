import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Truck,
  XCircle,
} from 'lucide-react';
import type { DonationStatus } from '../types.ts';

export function DonationStatusLabel({ status }: { status: DonationStatus }) {
  const config: Record<
    DonationStatus,
    { color: string; icon: typeof CheckCircle2; text: string }
  > = {
    Available: { color: 'text-emerald-700', icon: CheckCircle2, text: 'Available' },
    Requested: { color: 'text-amber-700', icon: Clock, text: 'Requested' },
    Scheduled: { color: 'text-sky-700', icon: Clock, text: 'Scheduled' },
    'Picked Up': { color: 'text-indigo-700', icon: Truck, text: 'Picked Up' },
    Delivered: { color: 'text-emerald-800', icon: ShieldCheck, text: 'Delivered' },
  };

  const current = config[status] || config.Available;
  const Icon = current.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${current.color}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{current.text}</span>
    </span>
  );
}

export function VerificationLabel({
  status,
}: {
  status: 'pending' | 'verified' | 'rejected';
}) {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        <span>Verified Organisation</span>
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
        <XCircle className="w-3.5 h-3.5 shrink-0" />
        <span>Verification Declined</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <span>Pending Admin Review</span>
    </span>
  );
}
