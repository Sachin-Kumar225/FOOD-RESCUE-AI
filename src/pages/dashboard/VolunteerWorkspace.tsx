import { useState } from 'react';
import { CheckCircle2, MapPin, PackageCheck, RefreshCw, Truck } from 'lucide-react';
import {
  acceptVolunteerTaskItem,
  updateVolunteerTaskItemStatus,
} from '../../lib/dataService.ts';
import type { Donation, User, VolunteerTask } from '../../types.ts';

interface VolunteerWorkspaceProps {
  user: User;
  tasks: VolunteerTask[];
  donations: Donation[];
  onRefresh: () => Promise<void>;
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export function VolunteerWorkspace({
  user,
  tasks,
  donations,
  onRefresh,
  onNotify,
}: VolunteerWorkspaceProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const openTasks = tasks.filter((t) => t.status === 'Open');
  const myActiveTasks = tasks.filter(
    (t) => t.volunteerId === user.id && (t.status === 'Accepted' || t.status === 'Picked Up')
  );
  const myCompletedTasks = tasks.filter(
    (t) => t.volunteerId === user.id && t.status === 'Delivered'
  );

  const handleRefreshClick = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAcceptTask = async (taskId: string) => {
    setBusyId(taskId);
    try {
      await acceptVolunteerTaskItem(taskId);
      onNotify('success', 'Pickup task assigned to you.');
      await onRefresh();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Unable to accept task.');
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdateStatus = async (taskId: string, nextStatus: 'Picked Up' | 'Delivered') => {
    setBusyId(taskId);
    try {
      await updateVolunteerTaskItemStatus(taskId, nextStatus);
      onNotify(
        'success',
        nextStatus === 'Picked Up'
          ? 'Marked as Picked Up from donor.'
          : 'Marked as Delivered to NGO (awaiting NGO receiver confirmation).'
      );
      await onRefresh();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Status update failed.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* My Active Pickups */}
      <section
        id="volunteer-active"
        className="scroll-mt-24 bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#0F172A]">
              My Active Pickup Tasks
            </h2>
            <p className="text-xs text-slate-500">
              Update pickup and drop-off progress as you transport items.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-xs tabular-nums text-slate-500">
              {myActiveTasks.length} active
            </span>
            <button
              type="button"
              onClick={handleRefreshClick}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#0F172A] disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Tasks</span>
            </button>
          </div>
        </div>

        {myActiveTasks.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 border-t border-slate-200/80">
            No active pickups assigned. Accept an open route below to get started.
          </p>
        ) : (
          <div className="space-y-3 border-t border-slate-200/80 pt-4">
            {myActiveTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC] flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[#0D9488]">{task.status}</span>
                    <span aria-hidden="true" className="text-xs text-slate-400">
                      ·
                    </span>
                    <span className="text-xs text-slate-500">{task.scheduledWindow}</span>
                    {task.pickedUpAt ? (
                      <span className="text-[11px] text-slate-400">
                        · Picked up {new Date(task.pickedUpAt).toLocaleTimeString()}
                      </span>
                    ) : task.acceptedAt ? (
                      <span className="text-[11px] text-slate-400">
                        · Accepted {new Date(task.acceptedAt).toLocaleTimeString()}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm font-semibold text-[#0F172A]">
                    {task.donationTitle} ({task.quantitySummary})
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                    <span>
                      <strong>Pickup:</strong> {task.pickupAddress} → <strong>Drop-off:</strong>{' '}
                      {task.dropoffAddress}
                    </span>
                  </p>
                  {task.notes && <p className="text-xs text-slate-500">Notes: {task.notes}</p>}
                </div>

                <div className="shrink-0">
                  {task.status === 'Accepted' && (
                    <button
                      type="button"
                      disabled={busyId === task.id}
                      onClick={() => handleUpdateStatus(task.id, 'Picked Up')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg disabled:opacity-50"
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>Mark Picked Up</span>
                    </button>
                  )}
                  {task.status === 'Picked Up' && (
                    <button
                      type="button"
                      disabled={busyId === task.id}
                      onClick={() => handleUpdateStatus(task.id, 'Delivered')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Delivered to NGO</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Open Tasks Marketplace */}
      <section
        id="volunteer-open"
        className="scroll-mt-24 bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#0F172A]">
              Available Pickup Routes
            </h2>
            <p className="text-xs text-slate-500">
              Approved donor-to-NGO handoffs ready for a volunteer driver.
            </p>
          </div>
          <span className="font-mono text-xs tabular-nums text-slate-500">
            {openTasks.length} open
          </span>
        </div>

        {openTasks.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 border-t border-slate-200/80">
            All scheduled pickups currently have volunteers assigned.
          </p>
        ) : (
          <div className="divide-y divide-slate-200/80 border-t border-slate-200/80">
            {openTasks.map((task) => (
              <div
                key={task.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#0F172A]">
                    {task.donationTitle} · {task.quantitySummary}
                  </p>
                  <p className="text-xs text-slate-500">
                    <strong>From:</strong> {task.donorName} ({task.pickupAddress})
                  </p>
                  <p className="text-xs text-slate-500">
                    <strong>To:</strong> {task.orgName} ({task.dropoffAddress})
                  </p>
                  <p className="text-xs text-slate-500">
                    Window: {task.scheduledWindow} · {task.notes}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === task.id}
                  onClick={() => handleAcceptTask(task.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg shrink-0 disabled:opacity-50"
                >
                  <Truck className="w-4 h-4" />
                  <span>{busyId === task.id ? 'Claiming...' : 'Accept Pickup Task'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Past Volunteer Deliveries */}
      <section
        id="volunteer-completed"
        className="scroll-mt-24 bg-white border border-slate-200/90 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-[#0F172A]">
            Completed Volunteer Deliveries ({myCompletedTasks.length})
          </h2>
        </div>

        {myCompletedTasks.length === 0 ? (
          <p className="text-sm text-slate-500 py-2">
            Your completed pickup and drop-off history will appear here.
          </p>
        ) : (
          <div className="divide-y divide-slate-200/80">
            {myCompletedTasks.map((t) => {
              const linkedDonation = donations.find((d) => d.id === t.donationId);
              const receiverConfirmed = linkedDonation?.status === 'Delivered';
              return (
                <div
                  key={t.id}
                  className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <span className="font-medium text-[#0F172A]">
                    {t.donationTitle} → {t.orgName}
                  </span>
                  <span
                    className={`font-mono ${
                      receiverConfirmed ? 'text-emerald-700 font-semibold' : 'text-[#0D9488]'
                    }`}
                  >
                    {receiverConfirmed ? 'Confirmed by NGO' : 'Delivered (awaiting NGO confirmation)'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
