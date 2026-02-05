"use client";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sublabel?: string;
}

export function StatCard({ label, value, icon: Icon, sublabel }: StatCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-400">{label}</p>
          <p className="text-2xl font-semibold text-white mt-1">{value}</p>
          {sublabel && <p className="text-xs text-zinc-500 mt-1">{sublabel}</p>}
        </div>
        <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-emerald-400" />
        </div>
      </div>
    </div>
  );
}
