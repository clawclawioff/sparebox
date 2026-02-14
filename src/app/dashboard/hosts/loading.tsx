export default function HostsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-36 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-52 bg-muted rounded-lg animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-6 h-44 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
