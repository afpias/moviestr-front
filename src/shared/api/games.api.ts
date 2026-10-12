import { GAME_FRAME_COUNT, normalizeMovieTitle } from '@shared/lib/game-rules'
import type { GameDifficulty, GameGenre, GameResponse, SkipFrameResponse, SubmitGuessResponse } from '@shared/types/game'

import { ApiError } from './api-error'
import { createGameSession, getGameSession, saveGameSession, toGameResult, type GameSession } from './game-session'
import { getRandomTmdbMovie, TMDB_COLLECTION_ID } from './tmdb'

function toGameResponse(session: GameSession): GameResponse {
	if (session.status === 'playing') {
		return {
			currentFrame: session.movie.frames[session.currentFrameIndex]!,
			difficulty: session.difficulty,
			gameId: session.gameId,
			genre: session.genre,
			status: 'playing',
			totalFrames: GAME_FRAME_COUNT
		}
	}

	return {
		difficulty: session.difficulty,
		gameId: session.gameId,
		genre: session.genre,
		result: toGameResult(session.movie),
		status: session.status,
		totalFrames: GAME_FRAME_COUNT
	}
}

function requirePlayingSession(gameId: string): GameSession {
	const session = getGameSession(gameId)

	if (!session) {
		throw new ApiError(404, { code: 'GAME_NOT_FOUND', message: 'Game not found' })
	}

	if (session.status !== 'playing') {
		throw new ApiError(409, { code: 'GAME_FINISHED', message: 'Game already finished' })
	}

	return session
}

function preloadRemainingFrames(session: GameSession): void {
	window.setTimeout(() => {
		for (const frame of session.movie.frames.slice(1)) {
			const image = new Image()
			image.decoding = 'async'
			image.src = frame.url
		}
	}, 150)
}

export async function loadChallenge(
	collectionId: string,
	difficulty: GameDifficulty,
	genre: GameGenre = 'all'
): Promise<GameResponse> {
	if (collectionId !== TMDB_COLLECTION_ID) {
		throw new ApiError(404, { code: 'COLLECTION_NOT_FOUND', message: 'Collection not found' })
	}

	const movie = await getRandomTmdbMovie(difficulty, genre)
	const session = createGameSession(movie, difficulty, genre)
	preloadRemainingFrames(session)

	return toGameResponse(session)
}

export async function getChallenge(gameId: string): Promise<GameResponse> {
	const session = getGameSession(gameId)

	if (!session) {
		throw new ApiError(404, { code: 'GAME_NOT_FOUND', message: 'Game not found' })
	}

	return toGameResponse(session)
}

export async function submitGuess(gameId: string, title: string): Promise<SubmitGuessResponse> {
	const session = requirePlayingSession(gameId)
	const answer = normalizeMovieTitle(title)
	const isCorrect = [session.movie.title, session.movie.originalTitle, ...session.movie.aliases].some(
		(candidateTitle) => normalizeMovieTitle(candidateTitle) === answer
	)

	if (isCorrect) {
		session.status = 'won'
		saveGameSession()

		return { correct: true, result: toGameResult(session.movie), status: 'won' }
	}

	if (session.currentFrameIndex === session.movie.frames.length - 1) {
		session.status = 'lost'
		saveGameSession()

		return { correct: false, result: toGameResult(session.movie), status: 'lost' }
	}

	session.currentFrameIndex += 1
	saveGameSession()

	return { correct: false, currentFrame: session.movie.frames[session.currentFrameIndex]!, status: 'playing' }
}

export async function skipFrame(gameId: string): Promise<SkipFrameResponse> {
	const session = requirePlayingSession(gameId)

	if (session.currentFrameIndex === session.movie.frames.length - 1) {
		session.status = 'lost'
		saveGameSession()

		return { result: toGameResult(session.movie), status: 'lost' }
	}

	session.currentFrameIndex += 1
	saveGameSession()

	return { currentFrame: session.movie.frames[session.currentFrameIndex]!, status: 'playing' }
}
