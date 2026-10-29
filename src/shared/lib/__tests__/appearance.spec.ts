import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useGameStore } from '@shared/stores/game.store'
import { installApiFixture, playingGame } from '@shared/testing/api-fixture'

import { saveGame } from '../game-persistence'
import { getGamePreferences, saveGamePreferences } from '../game-preferences'

afterEach(() => {
	vi.restoreAllMocks()
	delete document.documentElement.dataset.gameDifficulty
	document.documentElement.classList.remove('app-dark')
})
describe('safe appearance before game fetch', () => {
	it('restores the old accepted round appearance when switching difficulty failed before POST acceptance', async () => {
		const fixture = installApiFixture()
		setActivePinia(createPinia())
		const store = useGameStore()
		await store.initializeGame()
		fixture.fetcher.mockResolvedValueOnce(Response.json({ code: 'RATE_LIMITED', message: 'Повторите позже' }, { status: 429 }))
		await store.switchDifficulty('hard')
		expect(store.status).toBe('error')
		expect(store.difficulty).toBe('hard')
		runInNewContext(readFileSync(resolve('public/appearance.js'), 'utf8'), {
			document,
			localStorage,
			location: { pathname: '/' }
		})
		expect(document.documentElement.dataset.gameDifficulty).toBe('easy')
		setActivePinia(createPinia())
		const restored = useGameStore()
		expect(restored.difficulty).toBe('easy')
		await restored.initializeGame()
		expect(restored.difficulty).toBe('easy')
	})
	it('keeps a neutral resume appearance when preferences are corrupt but a legacy saved game exists', () => {
		localStorage.setItem('moviestr:game-preferences:v1', '{')
		saveGame('11111111-1111-4111-8111-111111111111', 'horror')
		runInNewContext(readFileSync(resolve('public/appearance.js'), 'utf8'), {
			document,
			localStorage,
			location: { pathname: '/' }
		})
		expect(document.documentElement.dataset.gameDifficulty).toBe('loading')
	})
	it('persists only UI preferences and hydrates a saved non-easy round before initial GET', async () => {
		const fixture = installApiFixture()
		const snapshot = { ...playingGame(), difficulty: 'hard' as const, genre: 'horror' as const }
		fixture.games.set(snapshot.gameId, snapshot)
		saveGame(snapshot.gameId, 'horror')
		saveGamePreferences('hard', 'horror')
		setActivePinia(createPinia())
		const store = useGameStore()
		expect(store.difficulty).toBe('hard')
		expect(store.genre).toBe('horror')
		await store.initializeGame()
		expect(store.difficulty).toBe('hard')
		expect(getGamePreferences()).toEqual({ version: 1, difficulty: 'hard', genre: 'horror' })
		expect(localStorage.getItem('moviestr:game-preferences:v1')).not.toMatch(/frames|movieId|answer|aliases/)
	})
	it('runs the actual early script with dark/non-easy prefs before the Vue module exists', () => {
		localStorage.setItem('moviestr:theme:v1', JSON.stringify('dark'))
		saveGamePreferences('expert', 'drama')
		runInNewContext(readFileSync(resolve('public/appearance.js'), 'utf8'), {
			document,
			localStorage,
			location: { pathname: '/' }
		})
		expect(document.documentElement.classList.contains('app-dark')).toBe(true)
		expect(document.documentElement.style.colorScheme).toBe('dark')
		expect(document.documentElement.dataset.gameDifficulty).toBe('expert')
	})
	it('early script survives corrupt or inaccessible storage and does not apply solo sizing to lobby', () => {
		localStorage.setItem('moviestr:theme:v1', 'broken')
		localStorage.setItem('moviestr:game-preferences:v1', '{')
		const script = readFileSync(resolve('public/appearance.js'), 'utf8')
		expect(() => runInNewContext(script, { document, localStorage, location: { pathname: '/lobby' } })).not.toThrow()
		expect(document.documentElement.classList.contains('app-dark')).toBe(true)
		expect(document.documentElement.dataset.gameDifficulty).toBeUndefined()
		expect(() =>
			runInNewContext(script, {
				document,
				localStorage: {
					getItem() {
						throw new Error('blocked')
					}
				},
				location: { pathname: '/' }
			})
		).not.toThrow()
	})
	it('does not present Easy as the restored difficulty when a legacy pointer has no safe preference hint', () => {
		saveGame('11111111-1111-4111-8111-111111111111', 'horror')
		setActivePinia(createPinia())
		const store = useGameStore()
		expect(store.preferencesReady).toBe(false)
	})
})
