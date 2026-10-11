import { isGameDifficulty } from '@shared/lib/game-difficulty'
import { isNumber, isRecord, isString } from '@shared/lib/type-guards'
import type {
	FinishedGameResponse,
	GameFrame,
	GameResponse,
	GameResult,
	MovieCollectionSummary,
	MovieSuggestion,
	PlayingGameResponse,
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
		value.status === 'playing' &&
		value.totalFrames === 6
	)
}

function isFinishedGame(value: unknown): value is FinishedGameResponse {
	return (
		isRecord(value) &&
		isGameDifficulty(value.difficulty) &&
		isString(value.gameId) &&
		isGameResult(value.result) &&
		(value.status === 'lost' || value.status === 'won') &&
		value.totalFrames === 6
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

function isSuggestion(value: unknown): value is MovieSuggestion {
	return isRecord(value) && isString(value.id) && isNumber(value.releaseYear) && isString(value.title)
}

export function isSuggestionsResponse(value: unknown): value is { items: MovieSuggestion[] } {
	return isRecord(value) && Array.isArray(value.items) && value.items.every(isSuggestion)
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
