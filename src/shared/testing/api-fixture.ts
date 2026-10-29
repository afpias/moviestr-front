import { vi } from 'vitest'

import { resetHttpSession } from '../api/http'
import type { GameResponse, MovieSuggestion } from '../types/game'

export const guestId = '11111111-1111-4111-8111-111111111111'
export const operationId = '22222222-2222-4222-8222-222222222222'
export const suggestions: MovieSuggestion[] = [
	{ id: 'tmdb-157336', title: 'Интерстеллар', englishTitle: 'Interstellar', releaseYear: 2014 },
	{ id: 'tmdb-603', title: 'Матрица', englishTitle: 'The Matrix', releaseYear: 1999 }
]
export function playingGame(gameId = guestId): GameResponse {
	return {
		gameId,
		difficulty: 'easy',
		genre: 'all',
		status: 'playing',
		totalFrames: 5,
		version: 1,
		serverTime: 1000,
		attemptedMovieIds: [],
		currentFrame: { index: 0, alt: 'Кадр 1', url: 'https://image.tmdb.org/t/p/w1280/frame.jpg' }
	}
}

// Test-only HTTP boundary fixtures. Not imported by the application or built into dist.
export function installApiFixture() {
	resetHttpSession()
	const games = new Map<string, GameResponse>()
	const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
		const url = new URL(String(input), 'http://localhost')
		const body: Record<string, unknown> = init?.body ? JSON.parse(String(init.body)) : {}
		if (url.pathname.endsWith('/guest-sessions')) return Response.json({ participantId: guestId, expiresAt: Date.now() + 60_000 })
		if (url.pathname.endsWith('/movies/search')) {
			const query = url.searchParams.get('q')?.toLowerCase() ?? ''
			return Response.json(suggestions.filter((movie) => (movie.title + movie.englishTitle).toLowerCase().includes(query)))
		}
		if (url.pathname === '/api/v1/games') {
			const gameId = crypto.randomUUID()
			games.set(gameId, {
				...playingGame(gameId),
				difficulty:
					body.difficulty === 'medium' ||
					body.difficulty === 'hard' ||
					body.difficulty === 'expert' ||
					body.difficulty === 'impossible'
						? body.difficulty
						: 'easy',
				genre: body.genre === 'horror' ? 'horror' : 'all'
			})
			return Response.json({ gameId, operationId, status: 'loading', version: 1, serverTime: 1000 }, { status: 202 })
		}
		const id = url.pathname.split('/')[4] ?? ''
		const saved = games.get(id)
		if (!saved) return Response.json({ code: 'GAME_NOT_FOUND', message: 'Не найдено' }, { status: 404 })
		if (init?.method !== 'POST') return Response.json(saved)
		if (saved.status !== 'playing') return Response.json({ code: 'GAME_FINISHED', message: 'Раунд окончен' }, { status: 409 })
		const correct = body.movieId === 'tmdb-157336'
		const { currentFrame, ...base } = saved
		const attemptedMovieIds =
			typeof body.movieId === 'string' && !correct ? [...base.attemptedMovieIds, body.movieId] : base.attemptedMovieIds
		const next: GameResponse =
			correct || currentFrame.index === 4
				? {
						...base,
						version: base.version + 1,
						attemptedMovieIds,
						status: correct ? 'won' : 'lost',
						result: {
							title: 'Интерстеллар',
							originalTitle: 'Interstellar',
							releaseYear: 2014,
							posterUrl: 'https://image.tmdb.org/t/p/w780/poster.jpg'
						}
					}
				: {
						...base,
						version: base.version + 1,
						attemptedMovieIds,
						status: 'playing',
						currentFrame: {
							...currentFrame,
							index: currentFrame.index + 1,
							alt: `Кадр ${currentFrame.index + 2}`,
							url: `https://image.tmdb.org/t/p/w1280/frame${currentFrame.index + 1}.jpg`
						}
					}
		games.set(id, next)
		return Response.json(url.pathname.endsWith('/guesses') ? { ...next, correct } : next)
	})
	vi.stubGlobal('fetch', fetcher)
	return { games, fetcher }
}
