export default function BillingLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-24 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-64 bg-muted rounded-lg animate-pulse mt-2" />
      </div>
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}
