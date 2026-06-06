export function formatDeadline(deadline: string): string {
  const d = new Date(deadline);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  if (diffMs <= 0) return "Resolved";
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffM = Math.floor((diffMs % 3_600_000) / 60_000);
  if (diffH >= 24) {
    const days = Math.floor(diffH / 24);
    return `Resolves in ${days}d ${diffH % 24}h`;
  }
  return `Resolves in ${diffH}h ${diffM}m`;
}
