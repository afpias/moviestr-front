import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getRandomTmdbMovie, searchTmdbCatalog } from '../catalog'

function jsonResponse(body: unknown): Response {
	return new Response(JSON.stringify(body), {
		headers: { 'Content-Type': 'application/json' },
		status: 200
	})
}

function createMovieResponse(title: string, originalTitle = 'Interstellar') {
	return {
		id: 157_336,
		original_title: originalTitle,
		poster_path: '/poster.jpg',
		release_date: '2014-11-05',
		title
	}
}

describe('tmdb catalog', () => {
	beforeEach(() => {
		vi.stubEnv('VITE_TMDB_READ_TOKEN', 'test-token')
	})

	afterEach(() => {
		vi.restoreAllMocks()
		vi.unstubAllEnvs()
		vi.unstubAllGlobals()
	})

	it('объединяет русский и английский поиск по одному фильму', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: URL) => {
				const url = new URL(input)
				const isRussian = url.searchParams.get('language') === 'ru-RU'

				return jsonResponse({ results: [createMovieResponse(isRussian ? 'Интерстеллар' : 'Interstellar')] })
			})
		)

		const suggestions = await searchTmdbCatalog('interstellar')

		expect(suggestions).toEqual([{ id: 'tmdb-157336', releaseYear: 2014, title: 'Интерстеллар' }])
	})

	it('создаёт раунд с шестью настоящими tmdb backdrops', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0)
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: URL) => {
				const url = new URL(input)

				if (url.pathname.endsWith('/movie/top_rated')) {
					return jsonResponse({ results: [createMovieResponse('Интерстеллар')] })
				}

				if (url.pathname.endsWith('/images')) {
					return jsonResponse({
						backdrops: Array.from({ length: 6 }, (_, index) => ({
							file_path: `/frame-${index + 1}.jpg`,
							height: 720,
							vote_average: 8 - index / 10,
							vote_count: 100 - index,
							width: 1280
						}))
					})
				}

				if (url.pathname.endsWith('/alternative_titles')) {
					return jsonResponse({ titles: [{ title: 'Интерстеллар' }, { title: 'Interstellar' }] })
				}

				return jsonResponse(createMovieResponse(url.searchParams.get('language') === 'ru-RU' ? 'Интерстеллар' : 'Interstellar'))
			})
		)

		const movie = await getRandomTmdbMovie('easy')

		expect(movie.title).toBe('Интерстеллар')
		expect(movie.aliases).toEqual(expect.arrayContaining(['Интерстеллар', 'Interstellar']))
		expect(movie.frames).toHaveLength(6)
		expect(movie.frames.every((frame) => frame.url.startsWith('https://image.tmdb.org/t/p/w1280/'))).toBe(true)
		expect(movie.posterUrl).toBe('https://image.tmdb.org/t/p/w500/poster.jpg')
	})

	it('запрашивает популярные фильмы выбранного жанра через discover', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0)
		const requestedUrls: URL[] = []
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: URL) => {
				const url = new URL(input)
				requestedUrls.push(url)

				if (url.pathname.endsWith('/discover/movie')) {
					return jsonResponse({ results: [createMovieResponse('Интерстеллар')] })
				}

				if (url.pathname.endsWith('/images')) {
					return jsonResponse({
						backdrops: Array.from({ length: 6 }, (_, index) => ({
							file_path: `/genre-frame-${index + 1}.jpg`,
							height: 720,
							vote_average: 8,
							vote_count: 100,
							width: 1280
						}))
					})
				}

				if (url.pathname.endsWith('/alternative_titles')) {
					return jsonResponse({ titles: [] })
				}

				return jsonResponse(createMovieResponse('Интерстеллар'))
			})
		)

		await getRandomTmdbMovie('easy', 'science-fiction')

		const discoverUrl = requestedUrls.find((url) => url.pathname.endsWith('/discover/movie'))
		expect(discoverUrl?.searchParams.get('with_genres')).toBe('878')
		expect(discoverUrl?.searchParams.get('sort_by')).toBe('popularity.desc')
	})
})
