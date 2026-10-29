import { afterEach, describe, expect, it, vi } from 'vitest'

import { roomResultFixture } from '@shared/testing/room-fixture'

import { resetHttpSession } from '../http'
import { connectRealtime } from '../realtime'

class Socket {
	static instances: Socket[] = []
	onopen: (() => void) | null = null
	onmessage: ((event: { data: string }) => void) | null = null
	onclose: ((event: { code: number }) => void) | null = null
	onerror: (() => void) | null = null
	sent: unknown[] = []
	constructor() {
		Socket.instances.push(this)
	}
	send(value: string) {
		this.sent.push(JSON.parse(value))
	}
	close(code = 1000) {
		this.onclose?.({ code })
	}
	emit(event: string, data: unknown) {
		this.onmessage?.({ data: JSON.stringify({ event, data }) })
	}
}
afterEach(() => {
	vi.useRealTimers()
	vi.unstubAllGlobals()
	resetHttpSession()
	Socket.instances = []
})
describe('native realtime transport', () => {
	it('delivers result/readiness snapshots after reconnect without sending a ready command', async () => {
		vi.useFakeTimers()
		const snapshot = roomResultFixture()
		const fetcher = vi.fn(async (url: string) =>
			Response.json(
				url.endsWith('guest-sessions')
					? { participantId: snapshot.hostId, expiresAt: Date.now() + 100000 }
					: { ticket: 'scoped-ticket', expiresAt: Date.now() + 30000 }
			)
		)
		vi.stubGlobal('fetch', fetcher)
		vi.stubGlobal('WebSocket', Socket)
		const received: unknown[] = []
		const stop = connectRealtime({
			roomId: 'room',
			onStatus: vi.fn(),
			onRoom: (value) => received.push(value),
			onLobbies: vi.fn(),
			onError: vi.fn()
		})
		await vi.advanceTimersByTimeAsync(1)
		Socket.instances[0]!.emit('room.snapshot', snapshot)
		Socket.instances[0]!.close()
		await vi.advanceTimersByTimeAsync(1000)
		const restored = {
			...snapshot,
			version: 4,
			roundResult: { ...snapshot.roundResult, readyPlayerIds: [snapshot.hostId], isReady: true, canContinue: false }
		}
		Socket.instances[1]!.emit('room.snapshot', restored)
		expect(received).toEqual([snapshot, restored])
		expect(fetcher.mock.calls.every(([url]) => url.endsWith('guest-sessions') || url.endsWith('realtime-tickets'))).toBe(true)
		stop()
	})
	it('invalidates an expired WS identity and bootstraps again without replaying a game command', async () => {
		vi.useFakeTimers()
		let guests = 0
		const fetcher = vi.fn(async (url: string) =>
			Response.json(
				url.endsWith('guest-sessions')
					? { participantId: `guest-${++guests}`, expiresAt: Date.now() + 100000 }
					: { ticket: `ticket-${guests}`, expiresAt: Date.now() + 30000 }
			)
		)
		vi.stubGlobal('fetch', fetcher)
		vi.stubGlobal('WebSocket', Socket)
		const stop = connectRealtime({ onStatus: vi.fn(), onRoom: vi.fn(), onLobbies: vi.fn(), onError: vi.fn() })
		await vi.advanceTimersByTimeAsync(1)
		Socket.instances[0]!.close(4401)
		await vi.advanceTimersByTimeAsync(1000)
		expect(guests).toBe(2)
		expect(
			fetcher.mock.calls.every(
				(call) => String(call[0]).endsWith('guest-sessions') || String(call[0]).endsWith('realtime-tickets')
			)
		).toBe(true)
		stop()
	})
	it('authenticates by ticket, subscribes with correct scope and gets a fresh ticket on reconnect', async () => {
		vi.useFakeTimers()
		let ticket = 0
		const fetcher = vi.fn(async (url: string, _init?: RequestInit) =>
			Response.json(
				url.endsWith('guest-sessions')
					? { participantId: 'guest', expiresAt: Date.now() + 100000 }
					: { ticket: `fresh-ticket-${++ticket}`, expiresAt: Date.now() + 30000 }
			)
		)
		vi.stubGlobal('fetch', fetcher)
		vi.stubGlobal('WebSocket', Socket)
		const status = vi.fn()
		const stop = connectRealtime({ roomId: 'room', onStatus: status, onRoom: vi.fn(), onLobbies: vi.fn(), onError: vi.fn() })
		await vi.advanceTimersByTimeAsync(1)
		const first = Socket.instances[0]!
		first.onopen?.()
		expect(first.sent).toEqual([{ event: 'session.auth', data: { ticket: 'fresh-ticket-1' } }])
		first.emit('session.ready', { participantId: 'guest', serverTime: Date.now() })
		expect(first.sent[1]).toEqual({ event: 'room.subscribe', data: { roomId: 'room' } })
		first.close()
		await vi.advanceTimersByTimeAsync(1000)
		const second = Socket.instances[1]!
		second.onopen?.()
		expect(second.sent[0]).toEqual({ event: 'session.auth', data: { ticket: 'fresh-ticket-2' } })
		expect(JSON.parse(String(fetcher.mock.lastCall?.[1]?.body))).toEqual({ roomId: 'room' })
		stop()
		await vi.advanceTimersByTimeAsync(30000)
		expect(Socket.instances).toHaveLength(2)
	})
	it('does not open a socket after an obsolete async ticket resolves', async () => {
		vi.useFakeTimers()
		vi.stubGlobal('WebSocket', Socket)
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ participantId: 'guest', expiresAt: Date.now() + 100000 })))
		const stop = connectRealtime({ onStatus: vi.fn(), onRoom: vi.fn(), onLobbies: vi.fn(), onError: vi.fn() })
		stop()
		await vi.advanceTimersByTimeAsync(1000)
		expect(Socket.instances).toHaveLength(0)
	})
})
