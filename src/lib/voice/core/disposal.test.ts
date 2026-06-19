import { describe, expect, it, vi } from 'vitest'
import { DisposalRegistry } from '@/lib/voice/core/disposal'

describe('DisposalRegistry', () => {
  it('disposes in LIFO order', async () => {
    const order: string[] = []
    const reg = new DisposalRegistry()
    reg.register('first', () => void order.push('first'))
    reg.register('second', () => void order.push('second'))
    reg.register('third', () => void order.push('third'))
    await reg.disposeAll()
    expect(order).toEqual(['third', 'second', 'first'])
  })

  it('is idempotent — disposers run at most once', async () => {
    const fn = vi.fn()
    const reg = new DisposalRegistry()
    reg.register('r', fn)
    await reg.disposeAll()
    await reg.disposeAll()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('supports async disposers', async () => {
    const order: string[] = []
    const reg = new DisposalRegistry()
    reg.register('async', async () => {
      await Promise.resolve()
      order.push('async')
    })
    reg.register('sync', () => void order.push('sync'))
    await reg.disposeAll()
    expect(order).toEqual(['sync', 'async'])
  })

  it('isolates a throwing disposer and still runs the rest', async () => {
    const after = vi.fn()
    const reg = new DisposalRegistry()
    reg.register('ok-early', after)
    reg.register('boom', () => {
      throw new Error('explode')
    })
    await expect(reg.disposeAll()).resolves.toBeUndefined()
    expect(after).toHaveBeenCalledTimes(1)
  })

  it('early-disposes a single entry without affecting others', async () => {
    const a = vi.fn()
    const b = vi.fn()
    const reg = new DisposalRegistry()
    const disposeA = reg.register('a', a)
    reg.register('b', b)
    await disposeA()
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).not.toHaveBeenCalled()
    expect(reg.activeCount()).toBe(1)
    await reg.disposeAll()
    expect(a).toHaveBeenCalledTimes(1) // not double-run
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('disposes immediately when registering after teardown', async () => {
    const reg = new DisposalRegistry()
    await reg.disposeAll()
    const late = vi.fn()
    reg.register('late', late)
    // microtask flush
    await Promise.resolve()
    expect(late).toHaveBeenCalledTimes(1)
    expect(reg.activeCount()).toBe(0)
  })

  it('tracks active count', () => {
    const reg = new DisposalRegistry()
    reg.register('a', vi.fn())
    reg.register('b', vi.fn())
    expect(reg.activeCount()).toBe(2)
  })
})
