function jsonResponse(body: unknown): Response {
	return new Response(JSON.stringify(body), {
		headers: { 'Content-Type': 'application/json' },
		status: 200
	})
}

function createMovie(id: number, title: string, originalTitle: string, releaseDate: string) {
	return {
		backdrop_path: '/backdrop.jpg',
		id,
		original_title: originalTitle,
		popularity: 100,
		poster_path: '/poster.jpg',
		release_date: releaseDate,
		title,
		vote_count: 10_000
	}
}

function createInterstellar(language: string) {
	return createMovie(157_336, language === 'ru-RU' ? 'Интерстеллар' : 'Interstellar', 'Interstellar', '2014-11-05')
}

function createMatrix(language: string) {
	return createMovie(603, language === 'ru-RU' ? 'Матрица' : 'The Matrix', 'The Matrix', '1999-03-30')
}

export async function fetchTmdbFixture(input: RequestInfo | URL): Promise<Response> {
	const requestUrl = input instanceof Request ? input.url : input
	const url = new URL(String(requestUrl))
	const language = url.searchParams.get('language') ?? 'ru-RU'

	if (url.pathname.endsWith('/discover/movie')) {
		return jsonResponse({
			page: Number(url.searchParams.get('page')),
			results: Array.from({ length: 20 }, () => createInterstellar(language)),
			total_pages: 500,
			total_results: 10_000
		})
	}

	if (url.pathname.endsWith('/search/movie')) {
		const query = url.searchParams.get('query')?.toLocaleLowerCase('ru-RU') ?? ''
		const movie = query.includes('matrix') || query.includes('матр') ? createMatrix(language) : createInterstellar(language)

		return jsonResponse({ results: [movie] })
	}

	if (/\/movie\/\d+$/.test(url.pathname)) {
		return jsonResponse({
			...createInterstellar(language),
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

	return new Response(null, { status: 404 })
}
