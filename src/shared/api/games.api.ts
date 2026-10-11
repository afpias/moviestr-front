import type { GameDifficulty, GameResponse, SubmitGuessResponse } from '@shared/types/game'

import { requestJson } from './client'
import { isGameResponse, isSubmitGuessResponse } from './contract-guards'

export function startGame(collectionId: string, difficulty: GameDifficulty): Promise<GameResponse> {
	return requestJson(
		'/games',
		{
			body: JSON.stringify({ collectionId, difficulty }),
			method: 'POST'
		},
		isGameResponse
	)
}

export function getGame(gameId: string): Promise<GameResponse> {
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
