/** Front-camera constraints tuned for mobile/PWA selfie preview vs desktop sidebar. */
export function getCandidateCameraConstraints(): MediaTrackConstraints {
  if (typeof navigator === 'undefined') {
    return { width: { ideal: 640 }, height: { ideal: 480 } }
  }

  const mobileViewport =
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 1023px)').matches
  const ios =
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  if (mobileViewport || ios) {
    return {
      // `ideal` only — required facingMode fails on devices without a labeled front cam.
      facingMode: { ideal: 'user' },
      width: { ideal: 720, max: 1280 },
      height: { ideal: 960, max: 1920 },
      aspectRatio: { ideal: 3 / 4 },
    }
  }

  // Desktop/laptop webcams usually omit facingMode — never require it here.
  return {
    width: { ideal: 640, max: 1280 },
    height: { ideal: 480, max: 720 },
  }
}
