import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { mount, type VueWrapper } from '@vue/test-utils'

import { resetHttpSession } from '@shared/api/http'
import { useGameStore } from '@shared/stores/game.store'
import type { GameDifficulty, GameGenre } from '@shared/types/game'
import { GameSidebar } from '@widgets/game-sidebar'

import GamePage from '../GamePage.vue'

const id = '11111111-1111-4111-8111-111111111111'
const operationId = '22222222-2222-4222-8222-222222222222'
const wrappers: VueWrapper[] = []
function scenario(initial = 'loading') {
	resetHttpSession()
	let phase = initial
	let difficulty: GameDifficulty = 'easy'
	let genre: GameGenre = 'all'
	let version = 1
	let creates = 0
	let reads = 0
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init?: RequestInit) => {
			if (input.endsWith('/guest-sessions')) return Response.json({ participantId: id, expiresAt: Date.now() + 60_000 })
			if (input.endsWith('/games')) {
				const body = JSON.parse(String(init?.body)) as { difficulty: GameDifficulty; genre: GameGenre }
				difficulty = body.difficulty
				genre = body.genre
				creates += 1
				return Response.json({ gameId: id, operationId, status: 'loading', version: 1, serverTime: 1000 }, { status: 202 })
			}
			if (input.endsWith('/retry-preparation')) {
				phase = 'loading'
				return Response.json(
					{ gameId: id, operationId, status: 'loading', version: ++version, serverTime: 1000 },
					{ status: 202 }
				)
			}
			reads += 1
			const base = { gameId: id, difficulty, genre, totalFrames: 5, attemptedMovieIds: [], serverTime: 1000, version: ++version }
			return Response.json(
				phase === 'playing'
					? {
							...base,
							status: phase,
							currentFrame: { index: 0, alt: 'Кадр', url: 'https://image.tmdb.org/t/p/w1280/current.jpg' }
						}
					: { ...base, status: phase, operationId, error: phase === 'error' ? 'Подготовка не удалась' : null }
			)
		})
	)
	const pinia = createPinia()
	setActivePinia(pinia)
	const wrapper = mount(GamePage, { global: { plugins: [pinia] } })
	wrappers.push(wrapper)
	const store = useGameStore()
	return {
		wrapper,
		store,
		ready: () => {
			phase = 'playing'
		},
		fail: () => {
			phase = 'error'
		},
		pending: () => {
			phase = 'loading'
		},
		creates: () => creates,
		reads: () => reads
	}
}
afterEach(() => {
	for (const wrapper of wrappers.splice(0)) wrapper.unmount()
	vi.restoreAllMocks()
	delete document.documentElement.dataset.gameDifficulty
})
const nodes = (wrapper: VueWrapper) =>
	['.game-page__layout', '.game-sidebar', '.game-info'].map((selector) => wrapper.find(selector).element)
describe('stable solo route shell', () => {
	it.each(['won', 'lost'] as const)('keeps layout identity through %s and its explicit next/retry action', async (outcome) => {
		const flow = scenario('playing')
		await vi.waitFor(() => expect(flow.store.status).toBe('playing'))
		const original = nodes(flow.wrapper)
		flow.store.applyGame({
			gameId: id,
			difficulty: 'easy',
			genre: 'all',
			totalFrames: 5,
			attemptedMovieIds: [],
			serverTime: 1000,
			version: 100,
			status: outcome,
			result: {
				title: 'Фильм',
				originalTitle: 'Film',
				releaseYear: 2000,
				posterUrl: 'https://image.tmdb.org/t/p/w780/poster.jpg'
			}
		})
		await flow.wrapper.vm.$nextTick()
		expect(nodes(flow.wrapper)).toEqual(original)
		flow.pending()
		await flow.wrapper.get('.round-result__action').trigger('click')
		await vi.waitFor(() => expect(flow.creates()).toBe(2))
		expect(nodes(flow.wrapper)).toEqual(original)
		expect(flow.wrapper.find('.round-result').exists()).toBe(false)
		expect(flow.wrapper.find('.movie-frame img').exists()).toBe(false)
		flow.ready()
		await vi.waitFor(() => expect(flow.store.status).toBe('playing'), { timeout: 2000 })
		expect(nodes(flow.wrapper)).toEqual(original)
	})
	it('mounts sidebar/info once during real 202 polling, error and preparation retry', async () => {
		const flow = scenario()
		expect(flow.wrapper.find('.game-sidebar').exists()).toBe(true)
		const original = nodes(flow.wrapper)
		await vi.waitFor(() => expect(flow.reads()).toBeGreaterThan(0))
		expect(flow.store.status).toBe('loading')
		expect(nodes(flow.wrapper)).toEqual(original)
		expect(flow.wrapper.find('.movie-frame img').exists()).toBe(false)
		flow.fail()
		await vi.waitFor(() => expect(flow.store.status).toBe('error'), { timeout: 2000 })
		expect(nodes(flow.wrapper)).toEqual(original)
		expect(flow.wrapper.get('.game-stage [role="alert"]').text()).toContain('Подготовка не удалась')
		const retry = flow.store.retryLoading()
		await vi.waitFor(() => expect(flow.store.status).toBe('loading'))
		flow.ready()
		await retry
		expect(nodes(flow.wrapper)).toEqual(original)
		expect(flow.store.status).toBe('playing')
	})
	it.each(['difficulty', 'genre'] as const)(
		'keeps the same DOM after %s changes, hiding the previous image while pending',
		async (kind) => {
			const flow = scenario('playing')
			await vi.waitFor(() => expect(flow.store.status).toBe('playing'))
			const original = nodes(flow.wrapper)
			flow.pending()
			await flow.wrapper.vm.$nextTick()
			flow.wrapper
				.getComponent(GameSidebar)
				.vm.$emit(kind === 'difficulty' ? 'selectDifficulty' : 'selectGenre', kind === 'difficulty' ? 'hard' : 'horror')
			await vi.waitFor(() => expect(flow.creates()).toBe(2))
			expect(flow.store.status).toBe('loading')
			expect(nodes(flow.wrapper)).toEqual(original)
			expect(flow.wrapper.find('.movie-frame img').exists()).toBe(false)
			flow.ready()
			await vi.waitFor(() => expect(flow.store.status).toBe('playing'), { timeout: 2000 })
			expect(nodes(flow.wrapper)).toEqual(original)
		}
	)
})
