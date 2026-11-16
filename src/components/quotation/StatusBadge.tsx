import { STATUS_LABEL, isStatus, type Status } from "@/lib/status";

const COLOR: Record<Status, string> = {
  draft: "bg-slate-200 text-slate-700",
  sent: "bg-sky-100 text-sky-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-amber-100 text-amber-800",
  superseded: "bg-violet-100 text-violet-700",
};

export function StatusBadge({ status }: { status: string }) {
  const s: Status = isStatus(status) ? status : "draft";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${COLOR[s]}`}>
      {STATUS_LABEL[s]}
    </span>
  );
}
