import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

import { resetHttpSession } from '@shared/api/http'
import { useMultiplayerStore } from '@shared/stores/multiplayer.store'
import { aliceId, bobId, roomResultFixture, roundId } from '@shared/testing/room-fixture'
import type { RoomSnapshot } from '@shared/types/multiplayer'

import RoomConsole from '../RoomConsole.vue'

// Subscription transport is external; the real store, HTTP adapter and controls remain in the test.
vi.mock('@shared/api/realtime', () => ({ connectRealtime: () => () => undefined }))

let mountedWrapper: VueWrapper | undefined
let stop: (() => void) | undefined
afterEach(() => {
	mountedWrapper?.unmount()
	stop?.()
	vi.restoreAllMocks()
	resetHttpSession()
})

async function mountResult(snapshot: RoomSnapshot) {
	let current = snapshot
	let completeReady: (() => void) | undefined
	let readyCalls = 0
	let failReady = false
	resetHttpSession()
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init?: RequestInit) => {
			if (input.endsWith('/guest-sessions')) return Response.json({ participantId: aliceId, expiresAt: Date.now() + 60000 })
			if (input.endsWith('/rooms/room/ready')) {
				readyCalls += 1
				expect(JSON.parse(String(init?.body))).toEqual({ roundId })
				expect(init?.credentials).toBe('include')
				expect(new Headers(init?.headers).get('Idempotency-Key')).toMatch(/^[\da-f-]{36}$/)
				if (failReady)
					return Response.json({ code: 'READY_NOT_REQUIRED', message: 'Готовность не подтверждена' }, { status: 403 })
				await new Promise<void>((resolve) => {
					completeReady = resolve
				})
				return Response.json(current)
			}
			if (input.endsWith('/rooms/room')) return Response.json(current)
			throw new Error(`Unexpected HTTP request: ${input}`)
		})
	)
	const pinia = createPinia()
	setActivePinia(pinia)
	const store = useMultiplayerStore()
	stop = store.stop
	await store.connect('room')
	store.connection = 'connected'
	mountedWrapper = mount(RoomConsole, { global: { plugins: [pinia] } })
	return {
		wrapper: mountedWrapper,
		store,
		get readyCalls() {
			return readyCalls
		},
		rejectReady(value: boolean) {
			failReady = value
		},
		finishReady(next: RoomSnapshot) {
			current = next
			completeReady?.()
		}
	}
}

describe('room reveal and server-owned all-ready barrier', () => {
	it.each(['won', 'lost'] as const)(
		'shows the correct movie and personal %s result with Next instead of solo retry',
		async (outcome) => {
			const snapshot = roomResultFixture()
			const { wrapper } = await mountResult({ ...snapshot, roundResult: { ...snapshot.roundResult, outcome } })
			expect(wrapper.get('.round-result__answer').text()).toContain('Матрица')
			expect(wrapper.get('.round-result__answer').text()).toContain('1999')
			expect(wrapper.get('.round-result__poster img').attributes('src')).toBe('https://image.tmdb.org/t/p/w780/poster.jpg')
			expect(wrapper.get('.round-result__badge').text()).toContain(outcome === 'won' ? 'Победа' : 'Не угадано')
			expect(wrapper.get('.round-result__action').text()).toContain('Далее')
			expect(wrapper.text()).not.toContain('Повторить')
			expect(wrapper.find('form').exists()).toBe(false)
		}
	)
	it('does not mark ready before the server ack, then disables Next and ignores old snapshots', async () => {
		const snapshot = roomResultFixture()
		const state = await mountResult(snapshot)
		await state.wrapper.get('.round-result__action').trigger('click')
		await flushPromises()
		expect(state.readyCalls).toBe(1)
		expect(state.wrapper.get('.room-console__readiness').text()).toContain('0 / 2')
		expect(state.wrapper.get('.round-result__action').attributes('disabled')).toBeDefined()
		state.finishReady({
			...snapshot,
			version: 4,
			roundResult: { ...snapshot.roundResult, readyPlayerIds: [aliceId], isReady: true, canContinue: false }
		})
		await flushPromises()
		expect(state.store.room?.status).toBe('round-result')
		expect(state.wrapper.get('.room-console__readiness').text()).toContain('1 / 2')
		expect(state.wrapper.get('.round-result__action').attributes('disabled')).toBeDefined()
		state.store.applyRoom(snapshot)
		await flushPromises()
		expect(state.wrapper.get('.room-console__readiness').text()).toContain('1 / 2')
		expect(state.wrapper.get('.room-players').text()).toContain('Готов')
	})
	it('restores already acknowledged readiness from the initial server snapshot', async () => {
		const snapshot = roomResultFixture()
		const state = await mountResult({
			...snapshot,
			roundResult: { ...snapshot.roundResult, readyPlayerIds: [aliceId], isReady: true, canContinue: false }
		})
		expect(state.wrapper.get('.round-result__action').attributes('disabled')).toBeDefined()
		expect(state.wrapper.get('.room-console__readiness').text()).toContain('1 / 2')
		expect(state.readyCalls).toBe(0)
	})
	it('reveals the last film before rating and waits for the server transition after all ready', async () => {
		const snapshot = roomResultFixture()
		const last: RoomSnapshot = {
			...snapshot,
			settings: { ...snapshot.settings, filmCount: 1 },
			roundResult: { ...snapshot.roundResult, readyPlayerIds: [bobId], isLastRound: true }
		}
		const state = await mountResult(last)
		expect(state.wrapper.text()).not.toContain('Итоговый рейтинг')
		await state.wrapper.get('.round-result__action').trigger('click')
		await flushPromises()
		expect(state.store.room?.status).toBe('round-result')
		state.finishReady({ ...last, version: 4, status: 'finished', roundResult: null, winnerIds: [aliceId] })
		await flushPromises()
		expect(state.wrapper.text()).toContain('Итоговый рейтинг')
		expect(state.wrapper.find('.round-result').exists()).toBe(false)
	})
	it('does not acknowledge while offline and does not turn a rejected command into ready', async () => {
		const state = await mountResult(roomResultFixture())
		state.store.connection = 'reconnecting'
		await flushPromises()
		expect(state.wrapper.get('.round-result__action').attributes('disabled')).toBeDefined()
		expect(state.readyCalls).toBe(0)
		state.store.connection = 'connected'
		state.rejectReady(true)
		await flushPromises()
		await state.wrapper.get('.round-result__action').trigger('click')
		await flushPromises()
		expect(state.store.error).toContain('Готовность не подтверждена')
		expect(state.wrapper.get('.room-console__readiness').text()).toContain('0 / 2')
		expect(state.wrapper.get('.round-result__action').attributes('disabled')).toBeUndefined()
	})
})
