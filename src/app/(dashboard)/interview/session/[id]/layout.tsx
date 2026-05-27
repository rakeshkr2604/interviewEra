import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { generateMetadata as buildPageMetadata } from '@/lib/seo/metadata'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return buildPageMetadata({
    title: 'Live Interview',
    description: 'AI avatar mock interview session with real-time captions.',
    path: `/interview/session/${id}`,
    noIndex: true,
  })
}

export default function Layout({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-x-hidden">{children}</div>
}
