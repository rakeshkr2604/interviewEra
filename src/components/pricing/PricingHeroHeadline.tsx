/**
 * Pricing hero H1 — static text (LCP element on /pricing; no client JS needed).
 */
export function PricingHeroHeadline() {
  return (
    <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.25rem]">
      <span className="block">Your complete interview preparation</span>
      <span className="ie-hero-gradient">starts here.</span>
    </h1>
  );
}
