function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`rounded-2xl bg-ink-800/70 motion-safe:animate-pulse ${className}`} />;
}

/** Lade-Platzhalter in den Abmessungen der echten Sektionen (kein Layout-Shift). */
export default function PageSkeleton() {
  return (
    <div className="flex flex-col gap-12" aria-hidden="true">
      <div>
        <SkeletonBlock className="mb-5 h-9 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SkeletonBlock className="h-52" />
          <SkeletonBlock className="hidden h-52 sm:block" />
          <SkeletonBlock className="hidden h-52 xl:block" />
        </div>
      </div>
      <div>
        <SkeletonBlock className="mb-5 h-9 w-56" />
        <SkeletonBlock className="h-72" />
      </div>
      <div>
        <SkeletonBlock className="mb-5 h-9 w-72" />
        <SkeletonBlock className="h-96" />
      </div>
    </div>
  );
}
