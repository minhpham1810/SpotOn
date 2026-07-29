export default function SongDetailsSkeleton() {
  return (
    <section className="song-shell py-10 sm:py-14" data-testid="song-details-skeleton" aria-busy="true" aria-label="Loading song details">
      <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[minmax(240px,320px)_1fr] md:gap-12">
        <div className="song-skeleton mx-auto aspect-square w-full max-w-72 rounded-2xl md:max-w-none" />
        <div className="space-y-4">
          <div className="song-skeleton h-3 w-36" />
          <div className="song-skeleton h-14 w-4/5" />
          <div className="song-skeleton h-4 w-48" />
          <div className="flex gap-3 pt-4">
            <div className="song-skeleton h-12 w-44 rounded-full" />
            <div className="song-skeleton h-12 w-36 rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
