export function OrgListSkeleton() {
  return (
    <ul className="flex flex-col gap-3 py-2 animate-in fade-in duration-300">
      {[1, 2, 3, 4].map((i) => (
        <li key={i} className="flex items-center gap-4 py-3.5 border-b border-white/10">
          <div className="h-11 w-11 rounded-full shimmer-box shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-4 w-3/5 rounded-md shimmer-box" />
            <div className="h-3 w-2/5 rounded-md shimmer-box" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CardSkeleton() {
  return (
    <div className="w-full rounded-2xl border border-white/10 p-5 shimmer-box flex flex-col gap-3">
      <div className="h-5 w-1/3 rounded-md bg-white/10" />
      <div className="h-4 w-2/3 rounded-md bg-white/10" />
      <div className="h-4 w-1/2 rounded-md bg-white/10" />
    </div>
  );
}

export function ClaimListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-white/10 p-4 shimmer-box flex items-center justify-between">
          <div className="flex flex-col gap-2 w-3/4">
            <div className="h-4 w-1/2 rounded bg-white/10" />
            <div className="h-3 w-1/3 rounded bg-white/10" />
          </div>
          <div className="h-6 w-16 rounded-full bg-white/10" />
        </div>
      ))}
    </div>
  );
}
