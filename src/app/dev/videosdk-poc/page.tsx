import { redirect } from 'next/navigation'

/** Legacy VideoSDK POC path — product Coach lives at /coach. */
export default function VideoSdkPocRedirectPage() {
  redirect('/coach')
}
