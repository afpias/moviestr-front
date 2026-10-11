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
import { clearSavedGame, getSavedGameId, saveGameId } from '@shared/lib/game-persistence'
import type { GameDifficulty, GameFrame, GameResponse, GameStatus } from '@shared/types/game'

const ERROR_MESSAGES: Record<string, string> = {
	COLLECTION_NOT_FOUND: 'Подборка не найдена.',
	GAME_FINISHED: 'Этот фильм уже заменён. Обновите игровую доску.',
	GAME_NOT_FOUND: 'Сохранённое состояние не найдено.',
	NETWORK_ERROR: 'Не удалось связаться с сервером. Проверьте соединение.',
	SERVICE_NOT_CONFIGURED: 'Добавьте VITE_TMDB_READ_TOKEN в .env.local и перезапустите dev-сервер.',
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
	const lastError = ref<string | null>(null)
	const status = ref<GameStatus>('idle')
	const totalFrames = ref<6>(6)

	function applyGame(game: GameResponse): void {
		gameId.value = game.gameId
		difficulty.value = game.difficulty
		totalFrames.value = game.totalFrames
		status.value = game.status
		lastError.value = null

		if (game.status === 'playing') {
			currentFrame.value = game.currentFrame
			saveGameId(game.gameId)
			return
		}

		currentFrame.value = null
		clearSavedGame()
	}

	async function loadChallenge(selectedDifficulty: GameDifficulty): Promise<void> {
		status.value = 'loading'
		lastError.value = null

		try {
			const game = await requestChallenge('top-250', selectedDifficulty)
			applyGame(game)
		} catch (error: unknown) {
			status.value = 'error'
			lastError.value = getErrorMessage(error)
		}
	}

	async function loadSavedGame(id: string): Promise<void> {
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
				await loadChallenge('easy')
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

		const savedGameId = getSavedGameId()

		if (savedGameId) {
			await loadSavedGame(savedGameId)
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

			await loadChallenge(difficulty.value)
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

			if (!response.correct) {
				await loadChallenge(difficulty.value)
				return false
			}

			await loadChallenge(getNextDifficulty(difficulty.value))

			return true
		} catch (error: unknown) {
			status.value = 'playing'
			lastError.value = getErrorMessage(error)
			return null
		}
	}

	return {
		currentFrame,
		difficulty,
		initializeGame,
		lastError,
		skipFrame,
		status,
		submitGuess,
		switchDifficulty,
		totalFrames
	}
})
