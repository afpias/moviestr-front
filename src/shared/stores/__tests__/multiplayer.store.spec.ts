import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@shared/api/api-error'
import type { LobbyPreview } from '@shared/types/multiplayer'

import { useMultiplayerStore } from '../multiplayer.store'

const mocks = vi.hoisted(() => ({ guest: vi.fn(), room: vi.fn(), list: vi.fn(), connect: vi.fn(), dispose: vi.fn() }))
vi.mock('@shared/api/http', () => ({ ensureGuest: mocks.guest }))
vi.mock('@shared/api/multiplayer', () => ({ createMultiplayerApi: () => ({ getRoom: mocks.room, listRooms: mocks.list }) }))
vi.mock('@shared/api/realtime', () => ({ connectRealtime: mocks.connect }))
const preview: LobbyPreview = {
	view: 'preview',
	id: 'r',
	status: 'waiting',
	playerCount: 1,
	hasPassword: true,
	settings: { name: 'Room', capacity: 4, filmCount: 20, difficulty: 'easy', genre: 'all', mode: 'points', visibility: 'private' }
}
beforeEach(() => {
	vi.useFakeTimers()
	vi.resetAllMocks()
	setActivePinia(createPinia())
	mocks.guest.mockResolvedValue('old')
	mocks.list.mockResolvedValue([])
	mocks.room.mockResolvedValue(preview)
	mocks.connect.mockReturnValue(mocks.dispose)
})
afterEach(() => {
	vi.useRealTimers()
})
describe('multiplayer connection lifecycle', () => {
	it('does not leave a clock after stop while initial GET is in flight', async () => {
		let resolve!: (value: LobbyPreview) => void
		mocks.room.mockImplementationOnce(
			() =>
				new Promise<LobbyPreview>((r) => {
					resolve = r
				})
		)
		const store = useMultiplayerStore()
		const task = store.connect('r')
		await vi.advanceTimersByTimeAsync(0)
		store.stop()
		resolve(preview)
		await task
		expect(vi.getTimerCount()).toBe(0)
		expect(store.room).toBeNull()
		expect(store.preview).toBeNull()
		expect(mocks.connect).not.toHaveBeenCalled()
	})
	it('recovers initial network failure without requiring a route reload or sending a mutation', async () => {
		mocks.guest.mockRejectedValueOnce(new ApiError(0, { code: 'NETWORK_ERROR', message: 'offline' }))
		const store = useMultiplayerStore()
		await store.connect('r')
		expect(store.error).toContain('offline')
		await vi.advanceTimersByTimeAsync(2000)
		expect(store.preview?.id).toBe('r')
		expect(store.participantId).toBe('old')
		store.stop()
		expect(vi.getTimerCount()).toBe(0)
	})
	it('never invokes a queued action after navigation during guest bootstrap', async () => {
		const store = useMultiplayerStore()
		await store.connect('r')
		let resolve!: (id: string) => void
		mocks.guest.mockImplementationOnce(
			() =>
				new Promise<string>((r) => {
					resolve = r
				})
		)
		const action = vi.fn().mockResolvedValue(true)
		const task = store.execute(action)
		store.stop()
		resolve('old')
		await task
		expect(action).not.toHaveBeenCalled()
	})
	it('requires rejoin instead of executing a mutation under a replacement guest', async () => {
		const store = useMultiplayerStore()
		await store.connect('r')
		mocks.guest.mockResolvedValue('new')
		const action = vi.fn().mockResolvedValue(true)
		await store.execute(action)
		expect(action).not.toHaveBeenCalled()
		expect(store.participantId).toBe('new')
		expect(store.preview?.view).toBe('preview')
		expect(store.me).toBeNull()
		store.stop()
	})
})
