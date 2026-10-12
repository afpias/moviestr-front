import { isGameDifficulty } from '@shared/lib/game-difficulty'
import { isGameGenre } from '@shared/lib/game-genres'
import { GAME_FRAME_COUNT } from '@shared/lib/game-rules'
import { isRecord } from '@shared/lib/type-guards'
import type { GameDifficulty, GameGenre, GameResult } from '@shared/types/game'

import type { CatalogMovie } from './tmdb/catalog'

export interface GameSession {
	currentFrameIndex: number
	difficulty: GameDifficulty
	gameId: string
	genre: GameGenre
	movie: CatalogMovie
	status: 'lost' | 'playing' | 'won'
}

const GAME_SESSIONS_KEY = 'moviestr:game-sessions:v1'
const sessions = new Map<string, GameSession>()
let gameCounter = 0

function isCatalogMovie(value: unknown): value is CatalogMovie {
	return (
		isRecord(value) &&
		Array.isArray(value.aliases) &&
		value.aliases.every((alias) => typeof alias === 'string') &&
		Array.isArray(value.frames) &&
		value.frames.length === GAME_FRAME_COUNT &&
		value.frames.every(
			(frame) =>
				isRecord(frame) && typeof frame.alt === 'string' && typeof frame.index === 'number' && typeof frame.url === 'string'
		) &&
		typeof value.id === 'string' &&
		typeof value.originalTitle === 'string' &&
		typeof value.posterUrl === 'string' &&
		typeof value.releaseYear === 'number' &&
		typeof value.title === 'string'
	)
}

function isGameSession(value: unknown): value is GameSession {
	return (
		isRecord(value) &&
		typeof value.currentFrameIndex === 'number' &&
		isGameDifficulty(value.difficulty) &&
		typeof value.gameId === 'string' &&
		isGameGenre(value.genre) &&
		isCatalogMovie(value.movie) &&
		(value.status === 'lost' || value.status === 'playing' || value.status === 'won')
	)
}

function hydrateSessions(): void {
	if (sessions.size > 0) {
		return
	}

	const serializedSessions = window.sessionStorage.getItem(GAME_SESSIONS_KEY)

	if (!serializedSessions) {
		return
	}

	try {
		const storedSessions: unknown = JSON.parse(serializedSessions)

		if (Array.isArray(storedSessions) && storedSessions.every(isGameSession)) {
			for (const session of storedSessions) {
				sessions.set(session.gameId, session)
			}
		}
	} catch {
		window.sessionStorage.removeItem(GAME_SESSIONS_KEY)
	}
}

function persistSessions(): void {
	window.sessionStorage.setItem(GAME_SESSIONS_KEY, JSON.stringify([...sessions.values()]))
}

function createGameId(): string {
	gameCounter += 1

	return `game-${Date.now().toString(36)}-${gameCounter.toString(36)}`
}

export function createGameSession(movie: CatalogMovie, difficulty: GameDifficulty, genre: GameGenre): GameSession {
	const gameId = createGameId()
	const session: GameSession = {
		currentFrameIndex: 0,
		difficulty,
		gameId,
		genre,
		movie,
		status: 'playing'
	}

	sessions.set(gameId, session)
	persistSessions()

	return session
}

export function getGameSession(gameId: string): GameSession | undefined {
	hydrateSessions()

	return sessions.get(gameId)
}

export function saveGameSession(): void {
	persistSessions()
}

export function toGameResult(movie: CatalogMovie): GameResult {
	return {
		originalTitle: movie.originalTitle,
		posterUrl: movie.posterUrl,
		releaseYear: movie.releaseYear,
		title: movie.title
	}
}
