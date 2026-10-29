import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ensureGuest, request, resetHttpSession } from '../http'

describe('hTTP transport', () => {
	beforeEach(() => {
		resetHttpSession()
		vi.unstubAllGlobals()
	})
	it('bootstraps one HttpOnly guest session for concurrent callers with credentials', async () => {
		const fetcher = vi.fn().mockResolvedValue(Response.json({ participantId: 'guest', expiresAt: Date.now() + 60_000 }))
		vi.stubGlobal('fetch', fetcher)
		expect(await Promise.all([ensureGuest(), ensureGuest()])).toEqual(['guest', 'guest'])
		expect(fetcher).toHaveBeenCalledTimes(1)
		expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ credentials: 'include', method: 'POST' })
		expect(window.localStorage.length).toBe(0)
	})
	it('replays an uncertain mutation with the same key and body, not a second logical action', async () => {
		const fetcher = vi
			.fn()
			.mockRejectedValueOnce(new TypeError('offline'))
			.mockResolvedValueOnce(Response.json({ ok: true }))
		vi.stubGlobal('fetch', fetcher)
		await expect(request('/games/g/skip', { expectedFrameIndex: 2 })).resolves.toEqual({ ok: true })
		const first = fetcher.mock.calls[0]?.[1]
		const second = fetcher.mock.calls[1]?.[1]
		expect(first.headers['Idempotency-Key']).toBe(second.headers['Idempotency-Key'])
		expect(first.body).toBe(second.body)
		expect(first.credentials).toBe('include')
	})
	it('keeps a failed command key for a later explicit retry and clears it after success', async () => {
		const fetcher = vi.fn().mockRejectedValue(new TypeError('offline'))
		vi.stubGlobal('fetch', fetcher)
		await expect(request('/rooms/r/skip', { roundId: 'round', expectedFrameIndex: 1 })).rejects.toMatchObject({
			code: 'NETWORK_ERROR'
		})
		const key = fetcher.mock.calls[0]?.[1].headers['Idempotency-Key']
		fetcher.mockResolvedValue(Response.json({ ok: true }))
		await request('/rooms/r/skip', { roundId: 'round', expectedFrameIndex: 1 })
		expect(fetcher.mock.lastCall?.[1].headers['Idempotency-Key']).toBe(key)
		fetcher.mockResolvedValue(Response.json({ ok: true }))
		await request('/rooms/r/skip', { roundId: 'round', expectedFrameIndex: 1 })
		expect(fetcher.mock.lastCall?.[1].headers['Idempotency-Key']).not.toBe(key)
	})
	it('does not retry a definitive conflict or parse an HTML fallback as a successful API response', async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(Response.json({ code: 'FRAME_CONFLICT', message: 'stale' }, { status: 409 }))
			.mockResolvedValueOnce(new Response('<html>SPA</html>'))
		vi.stubGlobal('fetch', fetcher)
		await expect(request('/games/g/skip', { expectedFrameIndex: 1 })).rejects.toMatchObject({ code: 'FRAME_CONFLICT' })
		expect(fetcher).toHaveBeenCalledTimes(1)
		await expect(request('/games/g')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
	})
	it('invalidates a revoked guest on 401 without replaying the mutation as a new identity', async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(Response.json({ participantId: 'old', expiresAt: Date.now() + 60000 }))
			.mockResolvedValueOnce(Response.json({ code: 'SESSION_REQUIRED', message: 'expired' }, { status: 401 }))
			.mockResolvedValueOnce(Response.json({ participantId: 'new', expiresAt: Date.now() + 60000 }))
		vi.stubGlobal('fetch', fetcher)
		expect(await ensureGuest()).toBe('old')
		await expect(request('/rooms/r/skip', { roundId: 'round', expectedFrameIndex: 0 })).rejects.toMatchObject({ status: 401 })
		expect(await ensureGuest()).toBe('new')
		expect(fetcher.mock.calls.filter((call) => String(call[0]).endsWith('/skip'))).toHaveLength(1)
	})
})
