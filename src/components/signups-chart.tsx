import type { SignupDay } from "@/lib/data/admin-dashboard";

/** Stacked daily sign-ups (students under professionals), plain CSS bars, with a text table for screen readers. */
export function SignupsChart({ days }: { days: SignupDay[] }) {
  const max = Math.max(1, ...days.map((d) => d.students + d.professionals));
  const total = days.reduce((a, d) => a + d.students + d.professionals, 0);
  return (
    <figure className="space-y-3">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium">New accounts, last {days.length} days: {total}</span>
        <span className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-primary" aria-hidden /> Students</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-sky-500" aria-hidden /> Professionals</span>
        </span>
      </figcaption>
      <div className="flex h-36 items-end gap-1" aria-hidden>
        {days.map((d) => {
          const sum = d.students + d.professionals;
          return (
            <div key={d.day} className="flex h-full flex-1 flex-col justify-end" title={`${d.day}: ${d.students} students, ${d.professionals} professionals`}>
              <div className="w-full rounded-t-sm bg-sky-500" style={{ height: `${(d.professionals / max) * 100}%` }} />
              <div className={`w-full bg-primary ${d.professionals === 0 && sum > 0 ? "rounded-t-sm" : ""}`} style={{ height: `${(d.students / max) * 100}%` }} />
              {sum === 0 && <div className="h-px w-full bg-border" />}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground" aria-hidden>
        <span>{days[0]?.day.slice(5)}</span>
        <span>{days[days.length - 1]?.day.slice(5)}</span>
      </div>
      <table className="sr-only">
        <caption>New accounts per day</caption>
        <thead><tr><th>Day</th><th>Students</th><th>Professionals</th></tr></thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}><td>{d.day}</td><td>{d.students}</td><td>{d.professionals}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
