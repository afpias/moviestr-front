import { delay, http, HttpResponse } from 'msw'

import { isGameDifficulty } from '@shared/lib/game-difficulty'
import { isGameGenre } from '@shared/lib/game-genres'
import { GAME_FRAME_COUNT, normalizeMovieTitle } from '@shared/lib/game-rules'
import { isRecord, isString } from '@shared/lib/type-guards'

import { FIXTURE_COLLECTIONS, FIXTURE_MOVIES, toMovieResult, toMovieSuggestion } from './data/catalog'
import { createMockSession, getMockSession, saveMockSession } from './data/sessions'
import { getRandomTmdbMovie, getTmdbCollection, searchTmdbCatalog, TMDB_COLLECTION_ID, TmdbApiError } from './tmdb'

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
			return HttpResponse.json({ items: isFixtureMode() ? FIXTURE_COLLECTIONS : [await getTmdbCollection()] })
		} catch (error: unknown) {
			return upstreamError(error)
		}
	}),
	http.post('/api/v1/games', async ({ request }) => {
		await mockDelay()
		const body: unknown = await request.json()

		if (!isRecord(body) || !isString(body.collectionId) || !isGameDifficulty(body.difficulty) || !isGameGenre(body.genre)) {
			return apiError(400, 'VALIDATION_ERROR', 'collectionId, difficulty and genre are required')
		}

		const collectionIds = isFixtureMode() ? FIXTURE_COLLECTIONS.map((collection) => collection.id) : [TMDB_COLLECTION_ID]

		if (!collectionIds.includes(body.collectionId)) {
			return apiError(404, 'COLLECTION_NOT_FOUND', 'Collection not found')
		}

		try {
			const movies = isFixtureMode() ? FIXTURE_MOVIES : [await getRandomTmdbMovie(body.difficulty, body.genre)]
			const session = createMockSession(movies, body.difficulty, body.genre)

			return HttpResponse.json({
				currentFrame: session.movie.frames[0],
				difficulty: session.difficulty,
				gameId: session.gameId,
				genre: session.genre,
				status: 'playing',
				totalFrames: GAME_FRAME_COUNT
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
				difficulty: session.difficulty,
				gameId,
				genre: session.genre,
				status: 'playing',
				totalFrames: GAME_FRAME_COUNT
			})
		}

		return HttpResponse.json({
			difficulty: session.difficulty,
			gameId,
			genre: session.genre,
			result: toMovieResult(session.movie),
			status: session.status,
			totalFrames: GAME_FRAME_COUNT
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
	http.post('/api/v1/games/:gameId/skip', async ({ params }) => {
		await mockDelay()
		const gameId = String(params.gameId)
		const session = getMockSession(gameId)

		if (!session) {
			return apiError(404, 'GAME_NOT_FOUND', 'Game not found')
		}

		if (session.status !== 'playing') {
			return apiError(409, 'GAME_FINISHED', 'Game already finished')
		}

		if (session.currentFrameIndex === session.movie.frames.length - 1) {
			session.status = 'lost'
			saveMockSession()

			return HttpResponse.json({
				result: toMovieResult(session.movie),
				status: 'lost'
			})
		}

		session.currentFrameIndex += 1
		saveMockSession()

		return HttpResponse.json({
			currentFrame: session.movie.frames[session.currentFrameIndex],
			status: 'playing'
		})
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
			saveMockSession()

			return HttpResponse.json({
				correct: true,
				result: toMovieResult(session.movie),
				status: 'won'
			})
		}

		if (session.currentFrameIndex === session.movie.frames.length - 1) {
			session.status = 'lost'
			saveMockSession()

			return HttpResponse.json({
				correct: false,
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
