// The ambient layer behind every screen: three oversized, heavily blurred
// color blobs drifting on long offset cycles, plus a film-grain overlay to
// keep the large flat gradients from banding.
//
// Deliberately a server component — it is pure markup with CSS animation, so
// shipping it as a client component would add JS to every page for nothing.
//
// Performance notes, since this animates forever on every screen:
//   - Only `transform` is animated, so it stays on the compositor and never
//     triggers layout or paint.
//   - The blur is baked into a static `filter` that never changes; animating
//     a blur radius would re-rasterize every frame and is the usual reason
//     effects like this tank a page.
//   - `pointer-events-none` throughout, so it can never eat a click.
//   - The whole thing freezes (but stays visible) under prefers-reduced-motion
//     via the global rule in globals.css.
export function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden grain"
    >
      {/* Base wash — keeps the page from being flat white/black underneath. */}
      <div className="absolute inset-0 bg-background" />

      <div
        className="animate-aurora-a absolute -left-[18vw] -top-[22vh] h-[62vh] w-[62vw] rounded-full
                   bg-brand-coral/30 blur-[90px] will-change-transform dark:bg-brand-coral/25"
      />
      <div
        className="animate-aurora-b absolute -right-[16vw] top-[6vh] h-[58vh] w-[55vw] rounded-full
                   bg-brand-violet/25 blur-[100px] will-change-transform dark:bg-brand-violet/22"
      />
      <div
        className="animate-aurora-c absolute bottom-[-26vh] left-[22vw] h-[60vh] w-[60vw] rounded-full
                   bg-brand-cyan/20 blur-[110px] will-change-transform dark:bg-brand-cyan/16"
      />

      {/* A soft vertical scrim so text near the top stays high-contrast
          regardless of which blob happens to drift behind it. */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/35 to-background/70" />
    </div>
  );
}
