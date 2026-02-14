export default function BrowseLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-36 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-56 bg-muted rounded-lg animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-6 h-48 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
