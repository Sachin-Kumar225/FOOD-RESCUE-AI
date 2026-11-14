import { useState } from 'react';
import { CheckCircle2, MapPin, PackageCheck, Truck } from 'lucide-react';
import { apiRequest } from '../../lib/api.ts';
import type { User, VolunteerTask } from '../../types.ts';

interface VolunteerWorkspaceProps {
  user: User;
  tasks: VolunteerTask[];
  onRefresh: () => Promise<void>;
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export function VolunteerWorkspace({
  user,
  tasks,
  onRefresh,
  onNotify,
}: VolunteerWorkspaceProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const openTasks = tasks.filter((t) => t.status === 'Open');
  const myActiveTasks = tasks.filter(
    (t) => t.volunteerId === user.id && (t.status === 'Accepted' || t.status === 'Picked Up')
  );
  const myCompletedTasks = tasks.filter(
    (t) => t.volunteerId === user.id && t.status === 'Delivered'
  );

  const handleAcceptTask = async (taskId: string) => {
    setBusyId(taskId);
    try {
      await apiRequest(`/api/volunteer/tasks/${taskId}/accept`, { method: 'POST' });
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
      await apiRequest(`/api/volunteer/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ nextStatus }),
      });
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
      <section className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#0F1F17]">
              My Active Pickup Tasks
            </h2>
            <p className="text-xs text-[#47554E]">
              Update pickup and drop-off progress as you transport items.
            </p>
          </div>
          <span className="font-mono text-xs tabular-nums text-[#47554E]">
            {myActiveTasks.length} active
          </span>
        </div>

        {myActiveTasks.length === 0 ? (
          <p className="text-sm text-[#47554E] py-4 border-t border-emerald-950/10">
            No active pickups assigned. Accept an open route below to get started.
          </p>
        ) : (
          <div className="space-y-3 border-t border-emerald-950/10 pt-4">
            {myActiveTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-lg border border-emerald-950/12 bg-[#F8FAF9] flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-800">{task.status}</span>
                    <span aria-hidden="true" className="text-xs text-[#47554E]">
                      ·
                    </span>
                    <span className="text-xs text-[#47554E]">{task.scheduledWindow}</span>
                  </div>
                  <p className="text-sm font-semibold text-[#0F1F17]">
                    {task.donationTitle} ({task.quantitySummary})
                  </p>
                  <p className="text-xs text-[#47554E] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>
                      <strong>Pickup:</strong> {task.pickupAddress} → <strong>Drop-off:</strong>{' '}
                      {task.dropoffAddress}
                    </span>
                  </p>
                </div>

                <div className="shrink-0">
                  {task.status === 'Accepted' && (
                    <button
                      type="button"
                      disabled={busyId === task.id}
                      onClick={() => handleUpdateStatus(task.id, 'Picked Up')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50"
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
      <section className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#0F1F17]">
              Available Pickup Routes
            </h2>
            <p className="text-xs text-[#47554E]">
              Approved donor-to-NGO handoffs ready for a volunteer driver.
            </p>
          </div>
          <span className="font-mono text-xs tabular-nums text-[#47554E]">
            {openTasks.length} open
          </span>
        </div>

        {openTasks.length === 0 ? (
          <p className="text-sm text-[#47554E] py-4 border-t border-emerald-950/10">
            All scheduled pickups currently have volunteers assigned.
          </p>
        ) : (
          <div className="divide-y divide-emerald-950/10 border-t border-emerald-950/10">
            {openTasks.map((task) => (
              <div
                key={task.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#0F1F17]">
                    {task.donationTitle} · {task.quantitySummary}
                  </p>
                  <p className="text-xs text-[#47554E]">
                    <strong>From:</strong> {task.donorName} ({task.pickupAddress})
                  </p>
                  <p className="text-xs text-[#47554E]">
                    <strong>To:</strong> {task.orgName} ({task.dropoffAddress})
                  </p>
                  <p className="text-xs text-[#47554E]">
                    Window: {task.scheduledWindow} · {task.notes}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === task.id}
                  onClick={() => handleAcceptTask(task.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shrink-0 disabled:opacity-50"
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
      {myCompletedTasks.length > 0 && (
        <section className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-3">
          <h2 className="font-display text-base font-semibold text-[#0F1F17]">
            Completed Volunteer Deliveries ({myCompletedTasks.length})
          </h2>
          <div className="divide-y divide-emerald-950/10">
            {myCompletedTasks.map((t) => (
              <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                <span className="font-medium text-[#0F1F17]">
                  {t.donationTitle} → {t.orgName}
                </span>
                <span className="font-mono text-emerald-700">Delivered</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
