import { ReactNode } from "react";

interface CalloutProps {
  type?: "info" | "warning" | "tip" | "important";
  children: ReactNode;
}

const styles = {
  info: {
    bg: "bg-blue-50 border-blue-200",
    icon: "ℹ️",
    title: "Info",
  },
  warning: {
    bg: "bg-amber-50 border-amber-200",
    icon: "⚠️",
    title: "Warning",
  },
  tip: {
    bg: "bg-emerald-50 border-emerald-200",
    icon: "💡",
    title: "Tip",
  },
  important: {
    bg: "bg-orange-50 border-orange-200",
    icon: "🔥",
    title: "Important",
  },
};

export function Callout({ type = "info", children }: CalloutProps) {
  const style = styles[type];

  return (
    <div
      className={`${style.bg} border rounded-xl p-4 my-6 not-prose`}
    >
      <div className="flex gap-3">
        <span className="text-lg flex-shrink-0" role="img" aria-label={style.title}>
          {style.icon}
        </span>
        <div className="text-stone-700 text-sm leading-relaxed [&>p]:m-0">
          {children}
        </div>
      </div>
    </div>
  );
}
