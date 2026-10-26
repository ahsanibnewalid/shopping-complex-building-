import type { CSSProperties, ReactNode } from "react";
import { getTheme } from "@contracts/marketplace";

/**
 * Applies a tenant's theme as CSS variables. Everything inside renders on
 * the shop's own ground/type system while the platform chrome stays neutral.
 */
export function ShopTheme({
  themeId,
  children,
}: {
  themeId: string;
  children: ReactNode;
}) {
  const t = getTheme(themeId).tokens;
  const style = {
    "--t-bg": t.bg,
    "--t-surface": t.surface,
    "--t-ink": t.ink,
    "--t-muted": t.muted,
    "--t-accent": t.accent,
    "--t-accent-ink": t.accentInk,
    "--t-border": t.border,
    "--t-radius": t.radius,
    "--t-font-display": t.displayFont,
    "--t-font-body": t.bodyFont,
    "--t-font-label": t.labelFont,
  } as CSSProperties;

  return (
    <div className="shop-theme t-body" style={style}>
      {children}
    </div>
  );
}
