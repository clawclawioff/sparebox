export default function BlogLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="h-10 w-64 bg-muted rounded-lg animate-pulse mb-8" />
      <div className="grid gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-6">
            <div className="h-6 w-3/4 bg-muted rounded animate-pulse mb-3" />
            <div className="h-4 w-full bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
