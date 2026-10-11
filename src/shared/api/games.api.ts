import type { GameDifficulty, GameGenre, GameResponse, SkipFrameResponse, SubmitGuessResponse } from '@shared/types/game'

import { requestJson } from './client'
import { isGameResponse, isSkipFrameResponse, isSubmitGuessResponse } from './contract-guards'

export function loadChallenge(collectionId: string, difficulty: GameDifficulty, genre: GameGenre = 'all'): Promise<GameResponse> {
	return requestJson(
		'/games',
		{
			body: JSON.stringify({ collectionId, difficulty, genre }),
			method: 'POST'
		},
		isGameResponse
	)
}

export function getChallenge(gameId: string): Promise<GameResponse> {
	return requestJson(`/games/${encodeURIComponent(gameId)}`, { method: 'GET' }, isGameResponse)
}

export function submitGuess(gameId: string, title: string): Promise<SubmitGuessResponse> {
	return requestJson(
		`/games/${encodeURIComponent(gameId)}/guesses`,
		{
			body: JSON.stringify({ title }),
			method: 'POST'
		},
		isSubmitGuessResponse
	)
}

export function skipFrame(gameId: string): Promise<SkipFrameResponse> {
	return requestJson(`/games/${encodeURIComponent(gameId)}/skip`, { method: 'POST' }, isSkipFrameResponse)
}
