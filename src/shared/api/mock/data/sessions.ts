import { isGameDifficulty } from '@shared/lib/game-difficulty'
import { isGameGenre } from '@shared/lib/game-genres'
import { isRecord } from '@shared/lib/type-guards'
import type { GameDifficulty, GameGenre } from '@shared/types/game'

import type { CatalogMovie } from './catalog'

interface MockGameSession {
	currentFrameIndex: number
	difficulty: GameDifficulty
	gameId: string
	genre: GameGenre
	movie: CatalogMovie
	status: 'lost' | 'playing' | 'won'
}

const MOCK_SESSIONS_KEY = 'moviestr:mock-sessions:v4'
const sessions = new Map<string, MockGameSession>()
let gameCounter = 0
let movieCounter = 0

function isMockSession(value: unknown): value is MockGameSession {
	if (!isRecord(value)) {
		return false
	}

	return (
		typeof value.currentFrameIndex === 'number' &&
		isGameDifficulty(value.difficulty) &&
		typeof value.gameId === 'string' &&
		isGameGenre(value.genre) &&
		isCatalogMovie(value.movie) &&
		(value.status === 'lost' || value.status === 'playing' || value.status === 'won')
	)
}

function hydrateSessions(): void {
	if (sessions.size > 0 || typeof window === 'undefined') {
		return
	}

	const rawSessions = window.sessionStorage.getItem(MOCK_SESSIONS_KEY)

	if (!rawSessions) {
		return
	}

	try {
		const savedSessions: unknown = JSON.parse(rawSessions)

		if (Array.isArray(savedSessions) && savedSessions.every(isMockSession)) {
			for (const session of savedSessions) {
				sessions.set(session.gameId, session)
			}
		}
	} catch {
		window.sessionStorage.removeItem(MOCK_SESSIONS_KEY)
	}
}

function persistSessions(): void {
	if (typeof window !== 'undefined') {
		window.sessionStorage.setItem(MOCK_SESSIONS_KEY, JSON.stringify([...sessions.values()]))
	}
}

function isCatalogMovie(value: unknown): value is CatalogMovie {
	if (!isRecord(value)) {
		return false
	}

	return (
		Array.isArray(value.aliases) &&
		value.aliases.every((alias) => typeof alias === 'string') &&
		Array.isArray(value.frames) &&
		value.frames.length === 6 &&
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

export function createMockSession(movies: CatalogMovie[], difficulty: GameDifficulty, genre: GameGenre): MockGameSession {
	const movie = movies[movieCounter % movies.length]

	if (!movie) {
		throw new Error('Mock movie catalog is empty')
	}

	const gameId = `game-${Date.now().toString(36)}-${gameCounter + 1}`
	const session: MockGameSession = {
		currentFrameIndex: 0,
		difficulty,
		gameId,
		genre,
		movie,
		status: 'playing'
	}

	gameCounter += 1
	movieCounter += 1
	sessions.set(gameId, session)
	persistSessions()

	return session
}

export function getMockSession(gameId: string): MockGameSession | undefined {
	hydrateSessions()
	return sessions.get(gameId)
}

export function saveMockSession(): void {
	persistSessions()
}

export function resetMockState(): void {
	sessions.clear()
	gameCounter = 0
	movieCounter = 0

	if (typeof window !== 'undefined') {
		window.sessionStorage.removeItem(MOCK_SESSIONS_KEY)
	}
}
