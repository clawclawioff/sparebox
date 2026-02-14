export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-24 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-48 bg-muted rounded-lg animate-pulse mt-2" />
      </div>
      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
