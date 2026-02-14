export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-44 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-56 bg-muted rounded-lg animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 h-24 animate-pulse" />
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl p-6 h-64 animate-pulse" />
    </div>
  );
}
