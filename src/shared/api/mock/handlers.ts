import { delay, http, HttpResponse } from 'msw'

import { getPointsForFrame, normalizeMovieTitle } from '@shared/lib/game-rules'
import { isRecord, isString } from '@shared/lib/type-guards'

import { MOCK_COLLECTIONS, MOCK_MOVIES, toMovieResult, toMovieSuggestion } from './data/catalog'
import { createMockSession, getMockSession } from './data/sessions'

async function mockDelay(): Promise<void> {
	await delay(import.meta.env.MODE === 'test' ? 0 : 280)
}

function apiError(status: number, code: string, message: string) {
	return HttpResponse.json({ code, message }, { status })
}

export const handlers = [
	http.get('/api/v1/collections', async () => {
		await mockDelay()
		return HttpResponse.json({ items: MOCK_COLLECTIONS })
	}),
	http.post('/api/v1/games', async ({ request }) => {
		await mockDelay()
		const body: unknown = await request.json()

		if (!isRecord(body) || !isString(body.collectionId)) {
			return apiError(400, 'VALIDATION_ERROR', 'collectionId is required')
		}

		if (!MOCK_COLLECTIONS.some((collection) => collection.id === body.collectionId)) {
			return apiError(404, 'COLLECTION_NOT_FOUND', 'Collection not found')
		}

		const session = createMockSession(MOCK_MOVIES.map((movie) => movie.id))
		const movie = MOCK_MOVIES.find((item) => item.id === session.movieId)

		if (!movie) {
			return apiError(500, 'INTERNAL_ERROR', 'Movie not found')
		}

		return HttpResponse.json({
			currentFrame: movie.frames[0],
			gameId: session.gameId,
			status: 'playing',
			totalFrames: 6
		})
	}),
	http.get('/api/v1/games/:gameId', async ({ params }) => {
		await mockDelay()
		const gameId = String(params.gameId)
		const session = getMockSession(gameId)

		if (!session) {
			return apiError(404, 'GAME_NOT_FOUND', 'Game not found')
		}

		const movie = MOCK_MOVIES.find((item) => item.id === session.movieId)

		if (!movie) {
			return apiError(500, 'INTERNAL_ERROR', 'Movie not found')
		}

		if (session.status === 'playing') {
			return HttpResponse.json({
				currentFrame: movie.frames[session.currentFrameIndex],
				gameId,
				status: 'playing',
				totalFrames: 6
			})
		}

		return HttpResponse.json({
			gameId,
			points: session.points,
			result: toMovieResult(movie),
			status: session.status,
			totalFrames: 6
		})
	}),
	http.get('/api/v1/movies/suggestions', async ({ request }) => {
		await mockDelay()
		const query = new URL(request.url).searchParams.get('q') ?? ''
		const normalizedQuery = normalizeMovieTitle(query)

		if (normalizedQuery.length < 2) {
			return HttpResponse.json({ items: [] })
		}

		const items = MOCK_MOVIES.filter((movie) =>
			[movie.title, movie.originalTitle, ...movie.aliases].some((title) => normalizeMovieTitle(title).includes(normalizedQuery))
		)
			.slice(0, 10)
			.map(toMovieSuggestion)

		return HttpResponse.json({ items })
	}),
	http.post('/api/v1/games/:gameId/guesses', async ({ params, request }) => {
		await mockDelay()
		const gameId = String(params.gameId)
		const session = getMockSession(gameId)

		if (!session) {
			return apiError(404, 'GAME_NOT_FOUND', 'Game not found')
		}

		if (session.status !== 'playing') {
			return apiError(409, 'GAME_FINISHED', 'Game already finished')
		}

		const body: unknown = await request.json()

		if (!isRecord(body) || !isString(body.title) || normalizeMovieTitle(body.title).length === 0) {
			return apiError(400, 'VALIDATION_ERROR', 'title is required')
		}

		const movie = MOCK_MOVIES.find((item) => item.id === session.movieId)

		if (!movie) {
			return apiError(500, 'INTERNAL_ERROR', 'Movie not found')
		}

		const answer = normalizeMovieTitle(body.title)
		const isCorrect = [movie.title, movie.originalTitle, ...movie.aliases].some((title) => normalizeMovieTitle(title) === answer)

		if (isCorrect) {
			session.status = 'won'
			session.points = getPointsForFrame(session.currentFrameIndex)

			return HttpResponse.json({
				correct: true,
				points: session.points,
				result: toMovieResult(movie),
				status: 'won'
			})
		}

		if (session.currentFrameIndex === movie.frames.length - 1) {
			session.status = 'lost'

			return HttpResponse.json({
				correct: false,
				points: 0,
				result: toMovieResult(movie),
				status: 'lost'
			})
		}

		session.currentFrameIndex += 1

		return HttpResponse.json({
			correct: false,
			currentFrame: movie.frames[session.currentFrameIndex],
			status: 'playing'
		})
	})
]
