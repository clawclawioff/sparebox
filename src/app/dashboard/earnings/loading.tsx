export default function EarningsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-28 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-48 bg-muted rounded-lg animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-6 h-24 animate-pulse" />
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl p-6 h-48 animate-pulse" />
    </div>
  );
}
