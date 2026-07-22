/**
 * Shared eager poster for the hero simulator — 3:4 crop, max display ~280px (2× ≈ 600w).
 * Kept as a tiny server-safe component so the first paint shell and the live simulator share one markup.
 */
export function LandingHeroSimulatorPoster() {
  return (
    <picture className="sim-poster">
      <source
        type="image/avif"
        srcSet="/assets/female-avatar-300.avif 300w, /assets/female-avatar-600.avif 600w"
        sizes="(max-width: 560px) 280px, 150px"
      />
      <source
        type="image/webp"
        srcSet="/assets/female-avatar-300.webp 300w, /assets/female-avatar-600.webp 600w"
        sizes="(max-width: 560px) 280px, 150px"
      />
      <img
        src="/assets/female-avatar-600.webp"
        alt="InterviewEra AI interviewer avatar"
        width={150}
        height={200}
        decoding="async"
        loading="eager"
      />
    </picture>
  );
}
