export default function AuthLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full">
        <div className="h-8 w-32 bg-muted rounded-lg animate-pulse mx-auto mb-6" />
        <div className="space-y-4">
          <div className="h-10 bg-muted rounded-lg animate-pulse" />
          <div className="h-10 bg-muted rounded-lg animate-pulse" />
          <div className="h-10 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}
