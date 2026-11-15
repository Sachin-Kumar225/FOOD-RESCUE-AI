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
    { classes: string; icon: typeof CheckCircle2; text: string }
  > = {
    Available: {
      classes: 'bg-[#F0FDFA] text-[#0D9488] border-[#99F6E4]',
      icon: CheckCircle2,
      text: 'Available',
    },
    Requested: {
      classes: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Clock,
      text: 'Requested',
    },
    Scheduled: {
      classes: 'bg-sky-50 text-sky-700 border-sky-200',
      icon: Clock,
      text: 'Scheduled',
    },
    'Picked Up': {
      classes: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: Truck,
      text: 'Picked Up',
    },
    Delivered: {
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: ShieldCheck,
      text: 'Delivered',
    },
  };

  const current = config[status] || config.Available;
  const Icon = current.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold whitespace-nowrap ${current.classes}`}
    >
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
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border bg-[#F0FDFA] border-[#99F6E4] text-xs font-semibold text-[#0D9488]">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        <span>Verified Organisation</span>
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border bg-red-50 border-red-200 text-xs font-semibold text-red-700">
        <XCircle className="w-3.5 h-3.5 shrink-0" />
        <span>Verification Declined</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-xs font-semibold text-amber-700">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <span>Pending Admin Review</span>
    </span>
  );
}
