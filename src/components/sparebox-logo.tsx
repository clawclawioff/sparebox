import Image from "next/image";
import Link from "next/link";

interface SpareboxLogoProps {
  variant?: "full" | "icon";
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
}

const sizes = {
  icon: {
    sm: { width: 24, height: 22 },
    md: { width: 32, height: 30 },
    lg: { width: 48, height: 45 },
  },
  full: {
    sm: { width: 120, height: 29 },
    md: { width: 160, height: 39 },
    lg: { width: 200, height: 49 },
  },
};

export function SpareboxLogo({ variant = "full", size = "md", href, className }: SpareboxLogoProps) {
  const dims = sizes[variant][size];
  const src = variant === "full" ? "/logo-full.svg" : "/logo-icon.svg";

  const img = (
    <Image
      src={src}
      alt="Sparebox"
      width={dims.width}
      height={dims.height}
      className={className}
      priority
    />
  );

  if (href) {
    return <Link href={href}>{img}</Link>;
  }

  return img;
}
