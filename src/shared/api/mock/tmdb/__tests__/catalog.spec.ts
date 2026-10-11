import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getRandomTmdbMovie, searchTmdbCatalog } from '../catalog'

function jsonResponse(body: unknown): Response {
	return new Response(JSON.stringify(body), {
		headers: { 'Content-Type': 'application/json' },
		status: 200
	})
}

function createMovieResponse(title: string, originalTitle = 'Interstellar', id = 157_336, knownness = 100) {
	return {
		id,
		original_title: originalTitle,
		popularity: knownness,
		poster_path: '/poster.jpg',
		release_date: '2014-11-05',
		title,
		vote_count: knownness * 10
	}
}

function createDiscoverPage(page: number) {
	const startIndex = (page - 1) * 20
	const pageSize = page === 13 ? 10 : 20

	return Array.from({ length: pageSize }, (_, index) => {
		const rank = startIndex + index

		return createMovieResponse('Интерстеллар', 'Interstellar', rank + 1, 250 - rank)
	})
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

		expect(suggestions).toEqual([{ englishTitle: 'Interstellar', id: 'tmdb-157336', releaseYear: 2014, title: 'Интерстеллар' }])
	})

	it('создаёт раунд с пятью настоящими tmdb backdrops', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0)
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: URL) => {
				const url = new URL(input)

				if (url.pathname.endsWith('/discover/movie')) {
					return jsonResponse({ results: createDiscoverPage(Number(url.searchParams.get('page'))) })
				}

				if (url.pathname.endsWith('/images')) {
					return jsonResponse({
						backdrops: Array.from({ length: 5 }, (_, index) => ({
							file_path: `/frame-${index + 1}.jpg`,
							height: 720,
							iso_639_1: null,
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

		const movie = await getRandomTmdbMovie('easy', 'all', async () => '')

		expect(movie.title).toBe('Интерстеллар')
		expect(movie.aliases).toEqual(expect.arrayContaining(['Интерстеллар', 'Interstellar']))
		expect(movie.frames).toHaveLength(5)
		expect(movie.frames.every((frame) => frame.url.startsWith('https://image.tmdb.org/t/p/w1280/'))).toBe(true)
		expect(movie.posterUrl).toBe('https://image.tmdb.org/t/p/w500/poster.jpg')
	})

	it('запрашивает выбранный жанр и берёт impossible из нижних 20% известности', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0)
		const requestedUrls: URL[] = []
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: URL) => {
				const url = new URL(input)
				requestedUrls.push(url)

				if (url.pathname.endsWith('/discover/movie')) {
					return jsonResponse({ results: createDiscoverPage(Number(url.searchParams.get('page'))) })
				}

				if (url.pathname.endsWith('/images')) {
					return jsonResponse({
						backdrops: Array.from({ length: 5 }, (_, index) => ({
							file_path: `/genre-frame-${index + 1}.jpg`,
							height: 720,
							iso_639_1: null,
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

		await getRandomTmdbMovie('impossible', 'science-fiction', async () => '')

		const discoverUrl = requestedUrls.find((url) => url.pathname.endsWith('/discover/movie'))
		const russianDetailsUrl = requestedUrls.find(
			(url) => /^\/3\/movie\/\d+$/.test(url.pathname) && url.searchParams.get('language') === 'ru-RU'
		)
		expect(discoverUrl?.searchParams.get('with_genres')).toBe('878')
		expect(discoverUrl?.searchParams.get('sort_by')).toBe('popularity.desc')
		expect(russianDetailsUrl?.pathname).toBe('/3/movie/201')
	})
})
