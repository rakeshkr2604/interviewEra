/** Front-camera constraints tuned for mobile/PWA selfie preview vs desktop sidebar. */
export function getCandidateCameraConstraints(): MediaTrackConstraints {
  if (typeof navigator === 'undefined') {
    return { facingMode: 'user' }
  }

  const mobileViewport =
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 1023px)').matches
  const ios =
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  if (mobileViewport || ios) {
    return {
      facingMode: 'user',
      width: { ideal: 720, max: 1280 },
      height: { ideal: 960, max: 1920 },
      aspectRatio: { ideal: 3 / 4 },
    }
  }

  return {
    facingMode: 'user',
    width: { ideal: 640 },
    height: { ideal: 480 },
    aspectRatio: { ideal: 4 / 3 },
  }
}
