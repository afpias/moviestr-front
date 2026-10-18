import { afterEach, describe, expect, it, vi } from 'vitest'

import { getRandomTmdbMovie, getTmdbCollection, searchTmdbCatalog } from '../catalog'

function jsonResponse(body: unknown): Response {
	return new Response(JSON.stringify(body), {
		headers: { 'Content-Type': 'application/json' },
		status: 200
	})
}

function createMovieResponse(title: string, originalTitle = 'Interstellar', id = 157_336, knownness = 100) {
	return {
		backdrop_path: '/backdrop.jpg',
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

	return {
		page,
		results: Array.from({ length: 20 }, (_, index) => {
			const rank = startIndex + index

			return createMovieResponse('Интерстеллар', 'Interstellar', rank + 1, 10_000 - rank)
		}),
		total_pages: 500,
		total_results: 10_000
	}
}

describe('tmdb catalog', () => {
	it('использует same-origin API без токена в браузерных заголовках', async () => {
		const fetchMock = vi.fn(async () => jsonResponse(createDiscoverPage(1)))
		vi.stubGlobal('fetch', fetchMock)
		await getTmdbCollection()
		const [url, options] = vi.mocked(fetch).mock.calls[0] ?? []
		expect(new URL(String(url)).origin).toBe(window.location.origin)
		expect(new URL(String(url)).pathname).toBe('/api/tmdb/discover/movie')
		expect(new Headers(options?.headers).has('Authorization')).toBe(false)
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

	it('возвращает фактический размер доступного каталога', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: URL) => {
				const url = new URL(input)

				return jsonResponse(createDiscoverPage(Number(url.searchParams.get('page'))))
			})
		)

		const collection = await getTmdbCollection()

		expect(collection).toEqual({
			description: 'Фильмы TMDB, ранжированные по известности',
			id: 'tmdb-catalog',
			movieCount: 10_000,
			title: 'Каталог TMDB'
		})
	})

	it('создаёт раунд с пятью настоящими tmdb backdrops', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0)
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: URL) => {
				const url = new URL(input)

				if (url.pathname.endsWith('/discover/movie')) {
					return jsonResponse(createDiscoverPage(Number(url.searchParams.get('page'))))
				}

				if (/\/movie\/\d+$/.test(url.pathname)) {
					return jsonResponse({
						...createMovieResponse('Интерстеллар'),
						alternative_titles: { titles: [{ title: 'Интерстеллар' }, { title: 'Interstellar' }] },
						images: {
							backdrops: Array.from({ length: 5 }, (_, index) => ({
								file_path: `/frame-${index + 1}.jpg`,
								height: 720,
								iso_639_1: null,
								vote_average: 8 - index / 10,
								vote_count: 100 - index,
								width: 1280
							}))
						}
					})
				}

				return jsonResponse(createMovieResponse('Интерстеллар'))
			})
		)

		const movie = await getRandomTmdbMovie('easy', 'all', async () => '')

		expect(movie.title).toBe('Интерстеллар')
		expect(movie.aliases).toEqual(expect.arrayContaining(['Интерстеллар', 'Interstellar']))
		expect(movie.frames).toHaveLength(5)
		expect(movie.frames.every((frame) => frame.url.startsWith('https://image.tmdb.org/t/p/w1280/'))).toBe(true)
		expect(movie.posterUrl).toBe('https://image.tmdb.org/t/p/w780/poster.jpg')
	})

	it('выбирает impossible из нижних 20% всего доступного каталога жанра', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0)
		const requestedUrls: URL[] = []
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: URL) => {
				const url = new URL(input)
				requestedUrls.push(url)

				if (url.pathname.endsWith('/discover/movie')) {
					return jsonResponse(createDiscoverPage(Number(url.searchParams.get('page'))))
				}

				if (/\/movie\/\d+$/.test(url.pathname)) {
					return jsonResponse({
						...createMovieResponse('Интерстеллар'),
						alternative_titles: { titles: [] },
						images: {
							backdrops: Array.from({ length: 5 }, (_, index) => ({
								file_path: `/genre-frame-${index + 1}.jpg`,
								height: 720,
								iso_639_1: null,
								vote_average: 8,
								vote_count: 100,
								width: 1280
							}))
						}
					})
				}

				return jsonResponse(createMovieResponse('Интерстеллар'))
			})
		)

		await getRandomTmdbMovie('impossible', 'science-fiction', async () => '')

		const discoverUrls = requestedUrls.filter((url) => url.pathname.endsWith('/discover/movie'))
		const selectedPageUrl = discoverUrls.find((url) => url.searchParams.get('page') === '401')
		const movieBundleUrls = requestedUrls.filter((url) => /^\/api\/tmdb\/movie\/\d+$/.test(url.pathname))
		expect(discoverUrls).toHaveLength(2)
		expect(selectedPageUrl?.searchParams.get('with_genres')).toBe('878')
		expect(selectedPageUrl?.searchParams.get('sort_by')).toBe('vote_count.desc')
		expect(movieBundleUrls).toHaveLength(1)
		expect(movieBundleUrls[0]?.pathname).toBe('/api/tmdb/movie/8001')
		expect(movieBundleUrls[0]?.searchParams.get('append_to_response')).toBe('images,alternative_titles')
	})
})
