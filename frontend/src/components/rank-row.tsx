import { cn } from "@/lib/utils";

interface Props {
  rank: number;
  name: string;
  avatarUrl?: string | null;
  /** Main figure, on the right. */
  value: string;
  /** Smaller line under the name. */
  detail?: string;
  /** Extra line under the value, e.g. a prize. */
  badge?: string;
  isYou?: boolean;
}

/** One line of a ranking. Used by the contest and the all-time board so they read the same. */
export function RankRow({ rank, name, avatarUrl, value, detail, badge, isYou }: Props) {
  return (
    <li
      aria-current={isYou ? "true" : undefined}
      className={cn("flex items-center gap-3 px-4 py-3", isYou && "bg-brand/5")}
    >
      <span
        className={cn(
          "w-6 shrink-0 text-center font-display text-sm font-bold tabular-nums",
          rank <= 3 ? "text-brand" : "text-muted-foreground"
        )}
      >
        {rank}
      </span>
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
      ) : (
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand"
        >
          {name.replace(/^@/, "").charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {name}
          {isYou && <span className="ml-1.5 text-xs font-medium text-brand">You</span>}
        </p>
        {detail && <p className="truncate text-xs text-muted-foreground">{detail}</p>}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold tabular-nums">{value}</p>
        {badge && <p className="text-xs font-semibold tabular-nums text-brand">{badge}</p>}
      </div>
    </li>
  );
}
