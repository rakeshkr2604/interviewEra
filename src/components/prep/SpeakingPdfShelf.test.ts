/** @vitest-environment jsdom */

import { createElement } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PDF_RESOURCES } from '@/lib/prep/pdf-resources'
import {
  SPEAKING_PDF_CAROUSEL_SPEED_PX_PER_SEC,
  SpeakingPdfShelf,
} from '@/components/prep/SpeakingPdfShelf'

function mockMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: reduced && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}

describe('SpeakingPdfShelf', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    mockMatchMedia(false)
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.unstubAllGlobals()
  })

  it('exposes a comfortable default autoplay speed', () => {
    expect(SPEAKING_PDF_CAROUSEL_SPEED_PX_PER_SEC).toBeGreaterThanOrEqual(20)
    expect(SPEAKING_PDF_CAROUSEL_SPEED_PX_PER_SEC).toBeLessThanOrEqual(48)
  })

  it('renders every preparation resource with View and Download actions', () => {
    act(() => {
      root.render(createElement(SpeakingPdfShelf))
    })

    const heading = container.querySelector('h2')
    expect(heading?.textContent).toMatch(/Speaking practice/)
    expect(container.textContent).toMatch(/See all/)
    expect(container.textContent).not.toMatch(/Prepare Smarter for Your Interview/)
    expect(container.textContent).not.toMatch(/Do not memorise a sample paragraph/)

    for (const file of PDF_RESOURCES) {
      expect(container.textContent).toContain(file.title)
      const view = container.querySelector(
        `button[aria-label="View ${file.title}"]`,
      ) as HTMLButtonElement | null
      const download = container.querySelector(
        `a[aria-label="Download ${file.title}"]`,
      ) as HTMLAnchorElement | null
      expect(view).toBeTruthy()
      expect(download).toBeTruthy()
      expect(download?.getAttribute('href')).toBe(file.href)
      expect(download?.getAttribute('download')).toBe(file.filename)
    }
  })

  it('opens the existing in-page preview when View is clicked', () => {
    act(() => {
      root.render(createElement(SpeakingPdfShelf))
    })

    const first = PDF_RESOURCES[0]!
    const view = container.querySelector(
      `button[aria-label="View ${first.title}"]`,
    ) as HTMLButtonElement

    act(() => {
      view.click()
    })

    expect(container.textContent).toContain(`Viewing: ${first.title}`)
    const iframe = container.querySelector('iframe')
    expect(iframe?.getAttribute('src')).toBe(first.href)
    expect(iframe?.getAttribute('title')).toBe(first.title)
  })

  it('shows carousel controls when motion is allowed', () => {
    act(() => {
      root.render(createElement(SpeakingPdfShelf))
    })

    expect(container.querySelector('[aria-label="Previous resource"]')).toBeTruthy()
    expect(container.querySelector('[aria-label="Next resource"]')).toBeTruthy()
    expect(container.querySelector('[aria-label="Pause carousel"]')).toBeTruthy()
  })

  it('disables autoplay controls under prefers-reduced-motion', () => {
    mockMatchMedia(true)

    act(() => {
      root.render(createElement(SpeakingPdfShelf))
    })

    expect(container.querySelector('.speaking-pdf-carousel--static')).toBeTruthy()
    expect(container.querySelector('[aria-label="Previous resource"]')).toBeNull()
    expect(container.querySelector('[aria-label="Pause carousel"]')).toBeNull()

    for (const file of PDF_RESOURCES) {
      expect(container.textContent).toContain(file.title)
      expect(
        container.querySelector(`button[aria-label="View ${file.title}"]`),
      ).toBeTruthy()
      expect(
        container.querySelector(`a[aria-label="Download ${file.title}"]`),
      ).toBeTruthy()
    }
  })

  it('toggles See all into a full grid of resources', () => {
    act(() => {
      root.render(createElement(SpeakingPdfShelf))
    })

    const seeAll = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('See all'),
    )
    expect(seeAll).toBeTruthy()

    act(() => {
      seeAll!.click()
    })

    expect(container.textContent).toMatch(/Show less/)
    expect(container.querySelector('.speaking-pdf-carousel')).toBeNull()
    expect(container.querySelector('[aria-label="Previous resource"]')).toBeNull()
    expect(
      container.querySelector('[aria-label="All speaking practice resources"]'),
    ).toBeTruthy()

    for (const file of PDF_RESOURCES) {
      expect(
        container.querySelectorAll(`button[aria-label="View ${file.title}"]`),
      ).toHaveLength(1)
    }
  })
})
