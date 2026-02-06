/**
 * SPAREBOX DESIGN TOKENS
 * 
 * Single source of truth for the color system.
 * To change the theme, update the values here and everything adapts.
 * 
 * Using OKLCH for perceptually uniform colors.
 * Format: oklch(lightness chroma hue)
 * - Lightness: 0-1 (0 = black, 1 = white)
 * - Chroma: 0-0.4 (0 = gray, higher = more saturated)
 * - Hue: 0-360 (color wheel angle)
 */

export const theme = {
  // ===================
  // BRAND COLORS
  // ===================
  brand: {
    // Primary: Terracotta/Orange - warm, grounded, action-oriented
    primary: {
      DEFAULT: "oklch(0.55 0.17 35)",      // Main brand color
      light: "oklch(0.65 0.15 35)",         // Hover states
      dark: "oklch(0.45 0.18 35)",          // Active/pressed
      muted: "oklch(0.55 0.17 35 / 0.1)",   // Subtle backgrounds
      foreground: "oklch(0.99 0.01 90)",    // Text on primary
    },
    // Secondary: Sage green - growth, success, eco-friendly
    secondary: {
      DEFAULT: "oklch(0.60 0.15 145)",
      light: "oklch(0.70 0.13 145)",
      dark: "oklch(0.50 0.16 145)",
      muted: "oklch(0.60 0.15 145 / 0.1)",
      foreground: "oklch(0.99 0.01 90)",
    },
  },

  // ===================
  // NEUTRAL COLORS
  // ===================
  neutral: {
    // Backgrounds
    background: "oklch(0.99 0.015 85)",     // Warm cream
    surface: "oklch(1 0 0)",                 // Pure white cards
    surfaceHover: "oklch(0.98 0.01 85)",    // Hover on cards
    
    // Text
    text: {
      primary: "oklch(0.18 0.01 60)",       // Almost black (stone-900)
      secondary: "oklch(0.45 0.01 60)",     // Medium gray (stone-600)
      muted: "oklch(0.55 0.01 60)",         // Light gray (stone-500)
      inverted: "oklch(0.98 0.005 60)",     // White text
    },
    
    // Borders
    border: {
      DEFAULT: "oklch(0.88 0.005 60)",      // Light border
      strong: "oklch(0.80 0.01 60)",        // More visible border
      muted: "oklch(0.92 0.005 60)",        // Subtle border
    },
  },

  // ===================
  // SEMANTIC COLORS
  // ===================
  semantic: {
    success: {
      DEFAULT: "oklch(0.60 0.15 145)",      // Green
      muted: "oklch(0.60 0.15 145 / 0.1)",
      foreground: "oklch(0.40 0.12 145)",
    },
    warning: {
      DEFAULT: "oklch(0.75 0.15 75)",       // Amber
      muted: "oklch(0.75 0.15 75 / 0.1)",
      foreground: "oklch(0.50 0.12 75)",
    },
    error: {
      DEFAULT: "oklch(0.55 0.22 25)",       // Red
      muted: "oklch(0.55 0.22 25 / 0.1)",
      foreground: "oklch(0.45 0.18 25)",
    },
    info: {
      DEFAULT: "oklch(0.60 0.15 250)",      // Blue
      muted: "oklch(0.60 0.15 250 / 0.1)",
      foreground: "oklch(0.45 0.12 250)",
    },
  },

  // ===================
  // ROLE COLORS
  // ===================
  roles: {
    user: {
      bg: "oklch(0.60 0.15 250 / 0.1)",     // Blue tint
      text: "oklch(0.50 0.12 250)",
    },
    host: {
      bg: "oklch(0.55 0.17 35 / 0.1)",      // Terracotta tint
      text: "oklch(0.50 0.15 35)",
    },
    admin: {
      bg: "oklch(0.60 0.18 300 / 0.1)",     // Purple tint
      text: "oklch(0.50 0.15 300)",
    },
  },

  // ===================
  // CHARTS
  // ===================
  charts: {
    1: "oklch(0.55 0.17 35)",   // Terracotta
    2: "oklch(0.60 0.15 145)",  // Sage
    3: "oklch(0.70 0.15 75)",   // Amber
    4: "oklch(0.50 0.15 145)",  // Forest
    5: "oklch(0.55 0.12 70)",   // Clay
  },

  // ===================
  // GRADIENTS
  // ===================
  gradients: {
    brand: "linear-gradient(135deg, oklch(0.55 0.17 35), oklch(0.50 0.18 40))",
    brandLight: "linear-gradient(135deg, oklch(0.65 0.15 35), oklch(0.60 0.16 40))",
    surface: "linear-gradient(180deg, oklch(0.99 0.015 85), oklch(0.97 0.02 85))",
  },

  // ===================
  // SHADOWS
  // ===================
  shadows: {
    sm: "0 1px 2px 0 oklch(0.18 0.01 60 / 0.05)",
    DEFAULT: "0 1px 3px 0 oklch(0.18 0.01 60 / 0.1), 0 1px 2px -1px oklch(0.18 0.01 60 / 0.1)",
    md: "0 4px 6px -1px oklch(0.18 0.01 60 / 0.1), 0 2px 4px -2px oklch(0.18 0.01 60 / 0.1)",
    lg: "0 10px 15px -3px oklch(0.18 0.01 60 / 0.1), 0 4px 6px -4px oklch(0.18 0.01 60 / 0.1)",
    brand: "0 4px 14px 0 oklch(0.55 0.17 35 / 0.25)",
  },

  // ===================
  // RADII
  // ===================
  radius: {
    sm: "0.375rem",
    DEFAULT: "0.5rem",
    md: "0.625rem",
    lg: "0.75rem",
    xl: "1rem",
    "2xl": "1.25rem",
    full: "9999px",
  },
} as const;

/**
 * Tailwind-compatible class mappings
 * Use these for consistent styling across components
 */
export const tw = {
  // Backgrounds
  bg: {
    page: "bg-background",
    card: "bg-card",
    cardHover: "hover:bg-accent",
    primary: "bg-primary",
    primaryHover: "hover:bg-primary/90",
    muted: "bg-muted",
    success: "bg-green-500/10",
    error: "bg-red-500/10",
  },
  
  // Text
  text: {
    primary: "text-foreground",
    secondary: "text-muted-foreground",
    muted: "text-muted-foreground/70",
    brand: "text-primary",
    inverted: "text-primary-foreground",
  },
  
  // Borders
  border: {
    default: "border-border",
    strong: "border-border/80",
    primary: "border-primary",
  },
  
  // Interactive states
  focus: "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  focusVisible: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
} as const;

export type Theme = typeof theme;
