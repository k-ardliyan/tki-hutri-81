/**
 * ScoreBadge — badge skor 5R (shared, satu-satunya tempat logika >=80/>=60).
 * >= 80 → success, >= 60 → warning, lainnya → destructive.
 */
import { Badge } from '~/components/ui/badge';

interface ScoreBadgeProps {
  value: number;
  /** Tampilkan '/100' kecil (default true). */
  showMax?: boolean;
  className?: string;
}

export default function ScoreBadge({ value, showMax = true, className = '' }: ScoreBadgeProps) {
  const tone =
    value >= 80
      ? 'bg-success/10 text-success'
      : value >= 60
        ? 'bg-warning/10 text-warning'
        : 'bg-destructive/10 text-destructive';
  return (
    <Badge className={`${tone} ${className}`}>
      {value}
      {showMax && <span className="text-[9px] opacity-70">/100</span>}
    </Badge>
  );
}

export { ScoreBadge };
