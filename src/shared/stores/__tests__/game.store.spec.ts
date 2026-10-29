import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@shared/api/api-error'
import * as gamesApi from '@shared/api/games.api'
import { saveGame } from '@shared/lib/game-persistence'
import { installApiFixture, playingGame } from '@shared/testing/api-fixture'
import type { GameResponse } from '@shared/types/game'

import { useGameStore } from '../game.store'

describe('server-authoritative solo store', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		installApiFixture()
	})
	it('does not let delayed resync of game A overwrite newly selected game B or its persistence', async () => {
		const store = useGameStore()
		const old = playingGame()
		store.applyGame(old)
		let resolve!: (game: GameResponse) => void
		const skipped = vi
			.spyOn(gamesApi, 'skipFrame')
			.mockRejectedValueOnce(new ApiError(0, { code: 'NETWORK_ERROR', message: 'offline' }))
		const read = vi.spyOn(gamesApi, 'getChallenge').mockImplementationOnce(
			() =>
				new Promise<GameResponse>((done) => {
					resolve = done
				})
		)
		const task = store.skipFrame()
		await vi.waitFor(() => expect(read).toHaveBeenCalled())
		await store.switchDifficulty('medium')
		const newId = store.gameId
		resolve({ ...old, version: 99 })
		await task
		expect(store.gameId).toBe(newId)
		expect(store.difficulty).toBe('medium')
		expect(JSON.parse(localStorage.getItem('moviestr:game:v2') ?? '{}').gameId).toBe(newId)
		skipped.mockRestore()
		read.mockRestore()
	})
	it('polls the pending operation and persists only an opaque game ID and UI genre', async () => {
		const store = useGameStore()
		await store.initializeGame()
		expect(store.status).toBe('playing')
		expect(JSON.parse(localStorage.getItem('moviestr:game:v2') ?? '{}')).toEqual({
			gameId: store.gameId,
			genre: 'all',
			version: 2
		})
		expect(sessionStorage.length).toBe(0)
	})
	it('restores attempts from server after refresh and never stores the answer', async () => {
		const fixture = installApiFixture()
		const saved = playingGame()
		fixture.games.set(saved.gameId, { ...saved, attemptedMovieIds: ['tmdb-603'] })
		saveGame(saved.gameId, 'all')
		const store = useGameStore()
		await store.initializeGame()
		expect(store.attemptedMovieIds).toEqual(['tmdb-603'])
		expect(store.gameId).toBe(saved.gameId)
		expect(localStorage.getItem('moviestr:game:v2')).not.toContain('Интерстеллар')
	})
	it('ignores stale snapshots that would roll back a newer frame', async () => {
		const store = useGameStore()
		const snapshot = playingGame()
		store.applyGame({
			...snapshot,
			version: 5,
			status: 'playing',
			currentFrame: { index: 3, alt: 'Кадр', url: 'https://image.tmdb.org/t/p/w1280/f.jpg' }
		})
		store.applyGame({ ...snapshot, version: 2 })
		expect(store.currentFrame?.index).toBe(3)
		expect(store.version).toBe(5)
	})
	it('uses the backend result and cycles difficulty only after explicit Next', async () => {
		const store = useGameStore()
		await store.switchDifficulty('impossible')
		expect(await store.submitGuess('tmdb-157336')).toBe(true)
		expect(store.status).toBe('won')
		expect(store.difficulty).toBe('impossible')
		await store.continueAfterWin()
		expect(store.status).toBe('playing')
		expect(store.difficulty).toBe('easy')
	})
	it('preserves UI preferences while removing legacy answer/demo storage', async () => {
		localStorage.setItem('moviestr:theme', 'dark')
		localStorage.setItem('moviestr:multiplayer:demo:v1', 'secret')
		sessionStorage.setItem('moviestr:game-sessions:v1', 'secret')
		const store = useGameStore()
		await store.initializeGame()
		expect(localStorage.getItem('moviestr:theme')).toBe('dark')
		expect(localStorage.getItem('moviestr:multiplayer:demo:v1')).toBeNull()
		expect(sessionStorage.getItem('moviestr:game-sessions:v1')).toBeNull()
	})
	it('reports transport errors without fabricating a film, result or score', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
		const store = useGameStore()
		await store.initializeGame()
		expect(store.status).toBe('error')
		expect(store.currentFrame).toBeNull()
		expect(store.roundResult).toBeNull()
	})
})
