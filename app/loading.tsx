export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="h-24 animate-pulse rounded-md bg-white/[0.04]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="h-32 animate-pulse rounded-md bg-white/[0.04]" />
        <div className="h-32 animate-pulse rounded-md bg-white/[0.04]" />
        <div className="h-32 animate-pulse rounded-md bg-white/[0.04]" />
        <div className="h-32 animate-pulse rounded-md bg-white/[0.04]" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="h-[520px] animate-pulse rounded-md bg-white/[0.04]" />
        <div className="h-[520px] animate-pulse rounded-md bg-white/[0.04]" />
      </div>
    </div>
  );
}
