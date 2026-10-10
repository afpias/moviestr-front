import { isRecord } from '@shared/lib/type-guards'

interface MockGameSession {
	currentFrameIndex: number
	gameId: string
	movieId: string
	points: number
	status: 'lost' | 'playing' | 'won'
}

const MOCK_SESSIONS_KEY = 'moviestr:mock-sessions:v1'
const sessions = new Map<string, MockGameSession>()
let gameCounter = 0
let movieCounter = 0

function isMockSession(value: unknown): value is MockGameSession {
	if (!isRecord(value)) {
		return false
	}

	return (
		typeof value.currentFrameIndex === 'number' &&
		typeof value.gameId === 'string' &&
		typeof value.movieId === 'string' &&
		typeof value.points === 'number' &&
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

export function createMockSession(movieIds: string[]): MockGameSession {
	const movieId = movieIds[movieCounter % movieIds.length]

	if (!movieId) {
		throw new Error('Mock movie catalog is empty')
	}

	const gameId = `game-${Date.now().toString(36)}-${gameCounter + 1}`
	const session: MockGameSession = {
		currentFrameIndex: 0,
		gameId,
		movieId,
		points: 0,
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
