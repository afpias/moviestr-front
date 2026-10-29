import type { GameDifficulty, GameGenre, GameResponse, PendingGame, SubmitGuessResponse } from '@shared/types/game'

import { parseGame, parseGuess, parsePendingGame } from './contracts'
import { ensureGuest, request } from './http'

export async function loadChallenge(
	collectionId: string,
	difficulty: GameDifficulty,
	genre: GameGenre = 'all'
): Promise<PendingGame> {
	await ensureGuest()
	return parsePendingGame(await request('/games', { collectionId, difficulty, genre }))
}
export async function getChallenge(gameId: string): Promise<GameResponse> {
	await ensureGuest()
	return parseGame(await request(`/games/${encodeURIComponent(gameId)}`))
}
export async function retryPreparation(gameId: string): Promise<PendingGame> {
	await ensureGuest()
	return parsePendingGame(await request(`/games/${encodeURIComponent(gameId)}/retry-preparation`, {}))
}
export async function submitGuess(gameId: string, movieId: string, expectedFrameIndex: number): Promise<SubmitGuessResponse> {
	await ensureGuest()
	return parseGuess(await request(`/games/${encodeURIComponent(gameId)}/guesses`, { movieId, expectedFrameIndex }))
}
export async function skipFrame(gameId: string, expectedFrameIndex: number): Promise<GameResponse> {
	await ensureGuest()
	return parseGame(await request(`/games/${encodeURIComponent(gameId)}/skip`, { expectedFrameIndex }))
}
