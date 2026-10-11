import { defineStore } from 'pinia'
import { ref } from 'vue'

import { ApiError } from '@shared/api/api-error'
import { getGame, startGame as requestStartGame, submitGuess as requestSubmitGuess } from '@shared/api/games.api'
import { clearSavedGame, getSavedGameId, saveGameId } from '@shared/lib/game-persistence'
import type { GameFrame, GameResponse, GameResult, GameStatus } from '@shared/types/game'

const ERROR_MESSAGES: Record<string, string> = {
	COLLECTION_NOT_FOUND: 'Подборка не найдена.',
	GAME_FINISHED: 'Эта игра уже завершена.',
	GAME_NOT_FOUND: 'Игра не найдена. Начните новый раунд.',
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
	const gameId = ref<string | null>(null)
	const lastError = ref<string | null>(null)
	const persistedGameId = ref<string | null>(getSavedGameId())
	const points = ref<number | null>(null)
	const result = ref<GameResult | null>(null)
	const status = ref<GameStatus>('idle')
	const totalFrames = ref<6>(6)

	function applyGame(game: GameResponse): void {
		gameId.value = game.gameId
		totalFrames.value = game.totalFrames
		status.value = game.status
		lastError.value = null

		if (game.status === 'playing') {
			currentFrame.value = game.currentFrame
			points.value = null
			result.value = null
			persistedGameId.value = game.gameId
			saveGameId(game.gameId)
			return
		}

		currentFrame.value = null
		points.value = game.points
		result.value = game.result
		persistedGameId.value = null
		clearSavedGame()
	}

	async function startGame(collectionId: string): Promise<string | null> {
		status.value = 'loading'
		lastError.value = null

		try {
			const game = await requestStartGame(collectionId)
			applyGame(game)
			return game.gameId
		} catch (error: unknown) {
			status.value = 'error'
			lastError.value = getErrorMessage(error)
			return null
		}
	}

	async function loadGame(id: string): Promise<void> {
		status.value = 'loading'
		lastError.value = null

		try {
			applyGame(await getGame(id))
		} catch (error: unknown) {
			gameId.value = id
			status.value = 'error'
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

			status.value = response.status
			points.value = response.points
			result.value = response.result
			persistedGameId.value = null
			clearSavedGame()

			return response.correct
		} catch (error: unknown) {
			status.value = 'playing'
			lastError.value = getErrorMessage(error)
			return null
		}
	}

	return {
		currentFrame,
		gameId,
		lastError,
		loadGame,
		persistedGameId,
		points,
		result,
		startGame,
		status,
		submitGuess,
		totalFrames
	}
})
