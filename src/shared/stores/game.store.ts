import { defineStore } from 'pinia'
import { ref } from 'vue'

import { ApiError } from '@shared/api/api-error'
import {
	getChallenge,
	loadChallenge as requestChallenge,
	skipFrame as requestSkipFrame,
	submitGuess as requestSubmitGuess
} from '@shared/api/games.api'
import { getNextDifficulty } from '@shared/lib/game-difficulty'
import { clearSavedGame, getSavedGame, saveGame } from '@shared/lib/game-persistence'
import { GAME_FRAME_COUNT } from '@shared/lib/game-rules'
import type { GameDifficulty, GameFrame, GameGenre, GameResponse, GameResult, GameStatus } from '@shared/types/game'

const ERROR_MESSAGES: Record<string, string> = {
	COLLECTION_NOT_FOUND: 'Подборка не найдена.',
	GAME_FINISHED: 'Этот фильм уже заменён. Обновите игровую доску.',
	GAME_NOT_FOUND: 'Сохранённое состояние не найдено.',
	NETWORK_ERROR: 'Не удалось связаться с сервером. Проверьте соединение.',
	SERVICE_NOT_CONFIGURED: 'Каталог временно недоступен. Попробуйте позже.',
	TIMEOUT: 'Сервер отвечает слишком долго. Попробуйте ещё раз.',
	UPSTREAM_ERROR: 'TMDB сейчас недоступен. Попробуйте ещё раз.',
	VALIDATION_ERROR: 'Проверьте введённые данные.'
}

function getErrorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		return ERROR_MESSAGES[error.code] ?? 'Что-то пошло не так. Попробуйте ещё раз.'
	}

	return 'Что-то пошло не так. Попробуйте ещё раз.'
}

export const useGameStore = defineStore('game', () => {
	const currentFrame = ref<GameFrame | null>(null)
	const difficulty = ref<GameDifficulty>('easy')
	const gameId = ref<string | null>(null)
	const genre = ref<GameGenre>('all')
	const lastError = ref<string | null>(null)
	const roundResult = ref<GameResult | null>(null)
	const status = ref<GameStatus>('idle')
	const totalFrames = ref<5>(GAME_FRAME_COUNT)

	function applyGame(game: GameResponse): void {
		gameId.value = game.gameId
		difficulty.value = game.difficulty
		genre.value = game.genre
		totalFrames.value = game.totalFrames
		status.value = game.status
		lastError.value = null

		if (game.status === 'playing') {
			currentFrame.value = game.currentFrame
			roundResult.value = null
			saveGame(game.gameId, game.genre)
			return
		}

		currentFrame.value = null
		roundResult.value = game.result
		clearSavedGame()
	}

	function finishRound(result: GameResult, resultStatus: 'lost' | 'won'): void {
		roundResult.value = result
		status.value = resultStatus
		clearSavedGame()
	}

	async function loadChallenge(selectedDifficulty: GameDifficulty, selectedGenre = genre.value): Promise<void> {
		status.value = 'loading'
		lastError.value = null
		roundResult.value = null

		try {
			const game = await requestChallenge('tmdb-catalog', selectedDifficulty, selectedGenre)
			applyGame(game)
		} catch (error: unknown) {
			status.value = 'error'
			lastError.value = getErrorMessage(error)
		}
	}

	async function loadSavedGame(id: string, savedGenre: GameGenre): Promise<void> {
		status.value = 'loading'
		lastError.value = null

		try {
			const game = await getChallenge(id)

			if (game.status === 'playing') {
				applyGame(game)
				return
			}

			await loadChallenge(game.difficulty)
		} catch (error: unknown) {
			if (error instanceof ApiError && error.code === 'GAME_NOT_FOUND') {
				clearSavedGame()
				await loadChallenge('easy', savedGenre)
				return
			}

			gameId.value = id
			status.value = 'error'
			lastError.value = getErrorMessage(error)
		}
	}

	async function initializeGame(): Promise<void> {
		if (status.value === 'playing') {
			return
		}

		const savedGame = getSavedGame()

		if (savedGame) {
			await loadSavedGame(savedGame.gameId, savedGame.genre)
			return
		}

		await loadChallenge('easy')
	}

	async function switchDifficulty(selectedDifficulty: GameDifficulty): Promise<void> {
		if (selectedDifficulty === difficulty.value && status.value === 'playing') {
			return
		}

		await loadChallenge(selectedDifficulty)
	}

	async function switchGenre(selectedGenre: GameGenre): Promise<void> {
		if (selectedGenre === genre.value && status.value === 'playing') {
			return
		}

		await loadChallenge(difficulty.value, selectedGenre)
	}

	async function restartRound(): Promise<void> {
		await loadChallenge('easy')
	}

	async function skipFrame(): Promise<void> {
		if (status.value !== 'playing' || gameId.value === null) {
			return
		}

		status.value = 'submitting'
		lastError.value = null

		try {
			const response = await requestSkipFrame(gameId.value)

			if (response.status === 'playing') {
				currentFrame.value = response.currentFrame
				status.value = 'playing'
				return
			}

			finishRound(response.result, 'lost')
		} catch (error: unknown) {
			status.value = 'playing'
			lastError.value = getErrorMessage(error)
		}
	}

	async function submitGuess(title: string): Promise<boolean | null> {
		if (status.value !== 'playing' || gameId.value === null) {
			return null
		}

		status.value = 'submitting'
		lastError.value = null

		try {
			const response = await requestSubmitGuess(gameId.value, title)

			if (response.status === 'playing') {
				currentFrame.value = response.currentFrame
				status.value = 'playing'
				return false
			}

			finishRound(response.result, response.correct ? 'won' : 'lost')

			return response.correct
		} catch (error: unknown) {
			status.value = 'playing'
			lastError.value = getErrorMessage(error)
			return null
		}
	}

	async function continueAfterWin(): Promise<void> {
		if (status.value !== 'won') {
			return
		}

		await loadChallenge(getNextDifficulty(difficulty.value))
	}

	async function retryAfterLoss(): Promise<void> {
		if (status.value !== 'lost') {
			return
		}

		await loadChallenge(difficulty.value)
	}

	return {
		currentFrame,
		continueAfterWin,
		difficulty,
		genre,
		initializeGame,
		lastError,
		restartRound,
		retryAfterLoss,
		roundResult,
		skipFrame,
		status,
		submitGuess,
		switchDifficulty,
		switchGenre,
		totalFrames
	}
})
