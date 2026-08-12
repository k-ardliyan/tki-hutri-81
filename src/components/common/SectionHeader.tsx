/**
 * SectionHeader — judul seksi dashboard (shared).
 */
export default function SectionHeader({ title, subtext }: { title: string; subtext?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-extrabold tracking-tight text-foreground">{title}</h2>
      {subtext && (
        <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">{subtext}</span>
      )}
    </div>
  );
}
