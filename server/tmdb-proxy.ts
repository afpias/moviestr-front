const TMDB_ORIGIN = 'https://api.themoviedb.org/3/'
const LANGUAGES = new Set(['ru-RU', 'en-US'])
const GENRES = new Set(['28', '35', '18', '53', '27', '878', '16'])

function errorResponse(status: number, code: string): Response {
	return Response.json(
		{ code, message: 'Не удалось получить данные каталога.' },
		{
			status,
			headers: { 'Cache-Control': 'no-store' }
		}
	)
}

function isValidParameter(name: string, value: string, path: string): boolean {
	switch (name) {
		case 'language':
			return LANGUAGES.has(value)
		case 'include_adult':
			return value === 'false' && (path === 'discover/movie' || path === 'search/movie')
		case 'include_video':
			return value === 'false' && path === 'discover/movie'
		case 'sort_by':
			return value === 'vote_count.desc' && path === 'discover/movie'
		case 'page':
			return /^\d{1,3}$/.test(value) && Number(value) >= 1 && Number(value) <= 500
		case 'with_genres':
			return GENRES.has(value) && path === 'discover/movie'
		case 'query':
			return path === 'search/movie' && value.trim().length > 0 && value.length <= 150
		case 'append_to_response':
			return /^movie\/\d+$/.test(path) && value === 'images,alternative_titles'
		case 'include_image_language':
			return /^movie\/\d+(?:\/images)?$/.test(path) && value === 'null,en,ru'
		default:
			return false
	}
}

export async function handleTmdbRequest(request: Request, token: string | undefined): Promise<Response> {
	if (request.method !== 'GET') {
		const response = errorResponse(405, 'METHOD_NOT_ALLOWED')
		response.headers.set('Allow', 'GET')
		return response
	}
	const incoming = new URL(request.url)
	const path = incoming.pathname.startsWith('/api/tmdb/')
		? incoming.pathname.slice('/api/tmdb/'.length)
		: (incoming.searchParams.get('path') ?? '')
	if (!/^(?:discover\/movie|search\/movie|movie\/[1-9]\d{0,9}(?:\/(?:images|alternative_titles))?)$/.test(path)) {
		return errorResponse(400, 'VALIDATION_ERROR')
	}
	const upstream = new URL(path, TMDB_ORIGIN)
	const seen = new Set<string>()
	for (const [name, value] of incoming.searchParams) {
		if (name === 'path') {
			if (incoming.searchParams.getAll(name).length !== 1 || value !== path) return errorResponse(400, 'VALIDATION_ERROR')
			continue
		}
		if (seen.has(name) || !isValidParameter(name, value, path)) return errorResponse(400, 'VALIDATION_ERROR')
		seen.add(name)
		upstream.searchParams.set(name, value)
	}
	if (path === 'search/movie' && !upstream.searchParams.has('query')) return errorResponse(400, 'VALIDATION_ERROR')
	if (path === 'search/movie' || path === 'discover/movie') upstream.searchParams.set('include_adult', 'false')
	if (path === 'discover/movie') upstream.searchParams.set('include_video', 'false')
	if (!token?.trim()) return errorResponse(503, 'SERVICE_NOT_CONFIGURED')
	try {
		const response = await fetch(upstream, {
			headers: { Accept: 'application/json', Authorization: `Bearer ${token.trim()}` },
			redirect: 'error',
			signal: AbortSignal.timeout(8_000)
		})
		if (!response.ok) return errorResponse(502, 'UPSTREAM_ERROR')
		const body: unknown = await response.json()
		return Response.json(body, {
			headers: {
				'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
				'X-Content-Type-Options': 'nosniff'
			}
		})
	} catch (error: unknown) {
		if (
			typeof error === 'object' &&
			error !== null &&
			'name' in error &&
			(error.name === 'TimeoutError' || error.name === 'AbortError')
		)
			return errorResponse(504, 'TIMEOUT')
		return errorResponse(502, 'UPSTREAM_ERROR')
	}
}
