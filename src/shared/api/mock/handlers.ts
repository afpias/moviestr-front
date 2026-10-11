import { delay, http, HttpResponse } from 'msw'

import { getPointsForFrame, normalizeMovieTitle } from '@shared/lib/game-rules'
import { isRecord, isString } from '@shared/lib/type-guards'

import { FIXTURE_COLLECTIONS, FIXTURE_MOVIES, toMovieResult, toMovieSuggestion } from './data/catalog'
import { createMockSession, getMockSession, saveMockSession } from './data/sessions'
import { getRandomTmdbMovie, getTmdbCollection, searchTmdbCatalog, TmdbApiError } from './tmdb'

async function mockDelay(): Promise<void> {
	await delay(import.meta.env.MODE === 'test' ? 0 : 280)
}

function apiError(status: number, code: string, message: string) {
	return HttpResponse.json({ code, message }, { status })
}

function upstreamError(error: unknown) {
	if (error instanceof TmdbApiError) {
		return apiError(error.status, error.code, error.message)
	}

	return apiError(502, 'UPSTREAM_ERROR', 'Unable to load movie data')
}

function isFixtureMode(): boolean {
	return import.meta.env.MODE === 'test'
}

export const handlers = [
	http.get('/api/v1/collections', async () => {
		await mockDelay()

		try {
			return HttpResponse.json({ items: isFixtureMode() ? FIXTURE_COLLECTIONS : [getTmdbCollection()] })
		} catch (error: unknown) {
			return upstreamError(error)
		}
	}),
	http.post('/api/v1/games', async ({ request }) => {
		await mockDelay()
		const body: unknown = await request.json()

		if (!isRecord(body) || !isString(body.collectionId)) {
			return apiError(400, 'VALIDATION_ERROR', 'collectionId is required')
		}

		let collections

		try {
			collections = isFixtureMode() ? FIXTURE_COLLECTIONS : [getTmdbCollection()]
		} catch (error: unknown) {
			return upstreamError(error)
		}

		if (!collections.some((collection) => collection.id === body.collectionId)) {
			return apiError(404, 'COLLECTION_NOT_FOUND', 'Collection not found')
		}

		try {
			const movies = isFixtureMode() ? FIXTURE_MOVIES : [await getRandomTmdbMovie()]
			const session = createMockSession(movies)

			return HttpResponse.json({
				currentFrame: session.movie.frames[0],
				gameId: session.gameId,
				status: 'playing',
				totalFrames: 6
			})
		} catch (error: unknown) {
			return upstreamError(error)
		}
	}),
	http.get('/api/v1/games/:gameId', async ({ params }) => {
		await mockDelay()
		const gameId = String(params.gameId)
		const session = getMockSession(gameId)

		if (!session) {
			return apiError(404, 'GAME_NOT_FOUND', 'Game not found')
		}

		if (session.status === 'playing') {
			return HttpResponse.json({
				currentFrame: session.movie.frames[session.currentFrameIndex],
				gameId,
				status: 'playing',
				totalFrames: 6
			})
		}

		return HttpResponse.json({
			gameId,
			points: session.points,
			result: toMovieResult(session.movie),
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

		try {
			const items = isFixtureMode()
				? FIXTURE_MOVIES.filter((movie) =>
						[movie.title, movie.originalTitle, ...movie.aliases].some((title) =>
							normalizeMovieTitle(title).includes(normalizedQuery)
						)
					)
						.slice(0, 10)
						.map(toMovieSuggestion)
				: await searchTmdbCatalog(query)

			return HttpResponse.json({ items })
		} catch (error: unknown) {
			return upstreamError(error)
		}
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

		const answer = normalizeMovieTitle(body.title)
		const isCorrect = [session.movie.title, session.movie.originalTitle, ...session.movie.aliases].some(
			(title) => normalizeMovieTitle(title) === answer
		)

		if (isCorrect) {
			session.status = 'won'
			session.points = getPointsForFrame(session.currentFrameIndex)
			saveMockSession()

			return HttpResponse.json({
				correct: true,
				points: session.points,
				result: toMovieResult(session.movie),
				status: 'won'
			})
		}

		if (session.currentFrameIndex === session.movie.frames.length - 1) {
			session.status = 'lost'
			saveMockSession()

			return HttpResponse.json({
				correct: false,
				points: 0,
				result: toMovieResult(session.movie),
				status: 'lost'
			})
		}

		session.currentFrameIndex += 1
		saveMockSession()

		return HttpResponse.json({
			correct: false,
			currentFrame: session.movie.frames[session.currentFrameIndex],
			status: 'playing'
		})
	})
]
