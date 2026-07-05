import { afterEach, describe, expect, it, vi } from 'vitest'
import { micPermissionMonitor } from '@/lib/voice/mic-permission-monitor'

describe('micPermissionMonitor', () => {
  afterEach(() => {
    micPermissionMonitor.__resetForTests()
    vi.restoreAllMocks()
  })

  it('notifies subscriber on permission revoke via onchange', async () => {
    const listener = vi.fn()
    const status = {
      state: 'granted',
      onchange: null as (() => void) | null,
    }

    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: {
        query: vi.fn().mockResolvedValue(status),
      },
    })

    micPermissionMonitor.subscribe(listener)
    await micPermissionMonitor.refresh('test')
    expect(micPermissionMonitor.getState()).toBe('granted')

    status.state = 'denied'
    status.onchange?.()
    expect(micPermissionMonitor.getState()).toBe('denied')
    expect(listener).toHaveBeenCalledWith('denied', expect.any(String))
  })
})
