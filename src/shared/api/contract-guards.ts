import { isGameDifficulty } from '@shared/lib/game-difficulty'
import { isGameGenre } from '@shared/lib/game-genres'
import { GAME_FRAME_COUNT } from '@shared/lib/game-rules'
import { isNumber, isRecord, isString } from '@shared/lib/type-guards'
import type {
	FinishedGameResponse,
	GameFrame,
	GameResponse,
	GameResult,
	MovieCollectionSummary,
	PlayingGameResponse,
	SkipFrameResponse,
	SubmitGuessResponse
} from '@shared/types/game'

export function isGameFrame(value: unknown): value is GameFrame {
	return isRecord(value) && isString(value.alt) && isNumber(value.index) && isString(value.url)
}

function isGameResult(value: unknown): value is GameResult {
	return (
		isRecord(value) &&
		isString(value.originalTitle) &&
		isString(value.posterUrl) &&
		isNumber(value.releaseYear) &&
		isString(value.title)
	)
}

function isPlayingGame(value: unknown): value is PlayingGameResponse {
	return (
		isRecord(value) &&
		isGameFrame(value.currentFrame) &&
		isGameDifficulty(value.difficulty) &&
		isString(value.gameId) &&
		isGameGenre(value.genre) &&
		value.status === 'playing' &&
		value.totalFrames === GAME_FRAME_COUNT
	)
}

function isFinishedGame(value: unknown): value is FinishedGameResponse {
	return (
		isRecord(value) &&
		isGameDifficulty(value.difficulty) &&
		isString(value.gameId) &&
		isGameGenre(value.genre) &&
		isGameResult(value.result) &&
		(value.status === 'lost' || value.status === 'won') &&
		value.totalFrames === GAME_FRAME_COUNT
	)
}

export function isGameResponse(value: unknown): value is GameResponse {
	return isPlayingGame(value) || isFinishedGame(value)
}

function isCollection(value: unknown): value is MovieCollectionSummary {
	return (
		isRecord(value) && isString(value.description) && isString(value.id) && isNumber(value.movieCount) && isString(value.title)
	)
}

export function isCollectionsResponse(value: unknown): value is { items: MovieCollectionSummary[] } {
	return isRecord(value) && Array.isArray(value.items) && value.items.every(isCollection)
}

export function isSubmitGuessResponse(value: unknown): value is SubmitGuessResponse {
	if (!isRecord(value) || typeof value.correct !== 'boolean') {
		return false
	}

	if (value.status === 'playing') {
		return value.correct === false && isGameFrame(value.currentFrame)
	}

	return (value.status === 'lost' || value.status === 'won') && isGameResult(value.result)
}

export function isSkipFrameResponse(value: unknown): value is SkipFrameResponse {
	if (!isRecord(value)) {
		return false
	}

	if (value.status === 'playing') {
		return isGameFrame(value.currentFrame)
	}

	return value.status === 'lost' && isGameResult(value.result)
}
