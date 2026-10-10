interface MockGameSession {
	currentFrameIndex: number
	gameId: string
	movieId: string
	points: number
	status: 'lost' | 'playing' | 'won'
}

const sessions = new Map<string, MockGameSession>()
let gameCounter = 0
let movieCounter = 0

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

	return session
}

export function getMockSession(gameId: string): MockGameSession | undefined {
	return sessions.get(gameId)
}

export function resetMockState(): void {
	sessions.clear()
	gameCounter = 0
	movieCounter = 0
}
