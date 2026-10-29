import { defineStore } from 'pinia'
import { ref } from 'vue'

import { ApiError } from '@shared/api/api-error'
import {
	getChallenge,
	loadChallenge as createGame,
	retryPreparation,
	skipFrame as skip,
	submitGuess as guess
} from '@shared/api/games.api'
import { getNextDifficulty } from '@shared/lib/game-difficulty'
import { clearSavedGame, getSavedGame, saveGame } from '@shared/lib/game-persistence'
import { getGamePreferences, saveGamePreferences } from '@shared/lib/game-preferences'
import { clearLegacyState } from '@shared/lib/legacy-state'
import type { GameDifficulty, GameFrame, GameGenre, GameResponse, GameResult, GameStatus } from '@shared/types/game'

export const useGameStore = defineStore('game', () => {
	const initialPreferences = getGamePreferences()
	const initialSavedGame = getSavedGame()
	const preferencesReady = ref(initialPreferences !== null || initialSavedGame === null)
	const currentFrame = ref<GameFrame | null>(null)
	const difficulty = ref<GameDifficulty>(initialPreferences?.difficulty ?? 'easy')
	const gameId = ref<string | null>(null)
	const genre = ref<GameGenre>(initialSavedGame?.genre ?? initialPreferences?.genre ?? 'all')
	const lastError = ref<string | null>(null)
	const roundResult = ref<GameResult | null>(null)
	const status = ref<GameStatus>('idle')
	const totalFrames = ref<5>(5)
	const attemptedMovieIds = ref<string[]>([])
	const version = ref(0)
	let generation = 0
	let pendingSelection: { difficulty: GameDifficulty; genre: GameGenre } | null = null

	function applyGame(game: GameResponse): boolean {
		if (game.gameId === gameId.value && game.version < version.value) return false
		gameId.value = game.gameId
		version.value = game.version
		difficulty.value = game.difficulty
		genre.value = game.genre
		preferencesReady.value = true
		saveGamePreferences(game.difficulty, game.genre)
		attemptedMovieIds.value = game.attemptedMovieIds
		status.value = game.status
		lastError.value = game.status === 'error' ? (game.error ?? 'Не удалось подготовить фильм. Повторите загрузку.') : null
		if (game.status === 'playing') {
			currentFrame.value = game.currentFrame
			roundResult.value = null
		}
		if (game.status === 'won' || game.status === 'lost') roundResult.value = game.result
		if (game.status === 'loading' || game.status === 'error') currentFrame.value = null
		saveGame(game.gameId, game.genre)
		return true
	}
	function report(cause: unknown): void {
		lastError.value = cause instanceof Error ? cause.message : 'Не удалось связаться с сервером.'
	}
	async function poll(id: string, token: number): Promise<void> {
		const deadline = Date.now() + 120_000
		while (true) {
			if (token !== generation) return
			const game = await getChallenge(id)
			if (token !== generation) return
			applyGame(game)
			if (game.status !== 'loading') return
			if (Date.now() > deadline)
				throw new ApiError(408, {
					code: 'TIMEOUT',
					message: 'Подготовка фильма занимает больше времени. Попробуйте продолжить загрузку.'
				})
			await new Promise((resolve) => setTimeout(resolve, 500))
		}
	}
	async function load(selectedDifficulty: GameDifficulty, selectedGenre = genre.value): Promise<void> {
		const token = ++generation
		pendingSelection = { difficulty: selectedDifficulty, genre: selectedGenre }
		difficulty.value = selectedDifficulty
		genre.value = selectedGenre
		preferencesReady.value = true
		status.value = 'loading'
		lastError.value = null
		roundResult.value = null
		currentFrame.value = null
		attemptedMovieIds.value = []
		try {
			const pending = await createGame('tmdb-catalog', selectedDifficulty, selectedGenre)
			if (token !== generation) return
			pendingSelection = null
			gameId.value = pending.gameId
			version.value = 0
			difficulty.value = selectedDifficulty
			genre.value = selectedGenre
			attemptedMovieIds.value = []
			currentFrame.value = null
			saveGame(pending.gameId, selectedGenre)
			saveGamePreferences(selectedDifficulty, selectedGenre)
			await poll(pending.gameId, token)
		} catch (cause: unknown) {
			if (token === generation) {
				status.value = 'error'
				report(cause)
			}
		}
	}
	async function initializeGame(): Promise<void> {
		if (status.value !== 'idle') return
		clearLegacyState()
		const saved = getSavedGame()
		if (!saved) return load(difficulty.value, genre.value)
		genre.value = saved.genre
		gameId.value = saved.gameId
		status.value = 'loading'
		const token = ++generation
		try {
			await poll(saved.gameId, token)
		} catch (cause: unknown) {
			if (token !== generation) return
			if (cause instanceof ApiError && (cause.status === 404 || cause.status === 403)) {
				clearSavedGame()
				await load('easy', saved.genre)
			} else {
				status.value = 'error'
				report(cause)
			}
		}
	}
	async function retryLoading(): Promise<void> {
		if (pendingSelection) return load(pendingSelection.difficulty, pendingSelection.genre)
		if (!gameId.value) return load(difficulty.value)
		const token = ++generation
		status.value = 'loading'
		lastError.value = null
		try {
			const snapshot = await getChallenge(gameId.value)
			if (token !== generation) return
			if (snapshot.status === 'error') await retryPreparation(gameId.value)
			await poll(gameId.value, token)
		} catch (cause: unknown) {
			if (token === generation) {
				status.value = 'error'
				report(cause)
			}
		}
	}
	async function resync(id: string, token: number): Promise<void> {
		try {
			const snapshot = await getChallenge(id)
			if (token === generation && gameId.value === id) applyGame(snapshot)
		} catch {
			/* Keep the last validated snapshot. */
		}
	}
	async function skipFrame(): Promise<void> {
		if (status.value !== 'playing' || !gameId.value || !currentFrame.value) return
		const id = gameId.value
		const token = generation
		status.value = 'submitting'
		lastError.value = null
		try {
			const snapshot = await skip(id, currentFrame.value.index)
			if (token === generation && gameId.value === id) applyGame(snapshot)
		} catch (cause: unknown) {
			if (token === generation && gameId.value === id) {
				await resync(id, token)
				if (token === generation && gameId.value === id) {
					if (status.value === 'submitting') status.value = 'playing'
					report(cause)
				}
			}
		}
	}
	async function submitGuess(movieId: string): Promise<boolean | null> {
		if (status.value !== 'playing' || !gameId.value || !currentFrame.value) return null
		const id = gameId.value
		const token = generation
		status.value = 'submitting'
		lastError.value = null
		try {
			const snapshot = await guess(id, movieId, currentFrame.value.index)
			if (token !== generation || gameId.value !== id) return null
			applyGame(snapshot)
			return snapshot.correct
		} catch (cause: unknown) {
			if (token === generation && gameId.value === id) {
				await resync(id, token)
				if (token === generation && gameId.value === id) {
					if (status.value === 'submitting') status.value = 'playing'
					report(cause)
				}
			}
			return null
		}
	}
	async function switchDifficulty(value: GameDifficulty): Promise<void> {
		if (value !== difficulty.value || status.value !== 'playing') await load(value)
	}
	async function switchGenre(value: GameGenre): Promise<void> {
		if (value !== genre.value || status.value !== 'playing') await load(difficulty.value, value)
	}
	async function restartRound(): Promise<void> {
		await load('easy')
	}
	async function continueAfterWin(): Promise<void> {
		if (status.value === 'won') await load(getNextDifficulty(difficulty.value))
	}
	async function retryAfterLoss(): Promise<void> {
		if (status.value === 'lost') await load(difficulty.value)
	}
	return {
		currentFrame,
		continueAfterWin,
		difficulty,
		gameId,
		genre,
		initializeGame,
		lastError,
		restartRound,
		retryAfterLoss,
		retryLoading,
		roundResult,
		skipFrame,
		status,
		submitGuess,
		switchDifficulty,
		switchGenre,
		totalFrames,
		attemptedMovieIds,
		version,
		preferencesReady,
		applyGame
	}
})
