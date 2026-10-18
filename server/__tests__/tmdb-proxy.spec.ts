import { afterEach, describe, expect, it, vi } from 'vitest'

import { handleTmdbRequest } from '../tmdb-proxy'

const TOKEN = 'server-only-test-token'
const request = (path: string, init?: RequestInit): Request => new Request(`https://moviestr.example/api/tmdb${path}`, init)

afterEach(() => vi.unstubAllGlobals())

describe('tMDB server proxy', () => {
	it('добавляет токен только upstream-запросу и кэширует успешный ответ', async () => {
		const fetchMock = vi.fn().mockResolvedValue(Response.json({ results: [] }))
		vi.stubGlobal('fetch', fetchMock)
		const response = await handleTmdbRequest(request('/discover/movie?page=1'), TOKEN)
		expect(response.status).toBe(200)
		const [url, options] = fetchMock.mock.calls[0] ?? []
		expect(String(url)).toBe('https://api.themoviedb.org/3/discover/movie?page=1&include_adult=false&include_video=false')
		expect(options.headers.Authorization).toBe(`Bearer ${TOKEN}`)
		expect(response.headers.get('cache-control')).toContain('s-maxage=300')
		expect(await response.text()).not.toContain(TOKEN)
	})

	it('принимает путь из rewrite Vercel', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ id: 603 })))
		const response = await handleTmdbRequest(request('?path=movie/603&language=ru-RU'), TOKEN)
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ id: 603 })
	})

	it.each([
		'/account',
		'/https://example.com',
		'/movie/1?api_key=secret',
		'/movie/1?append_to_response=account',
		'/discover/movie?page=501',
		'/discover/movie?page=1&page=2',
		'/search/movie?query=',
		'/discover/movie?include_adult=true',
		'?path=movie/1&path=movie/2'
	])('отклоняет недопустимый запрос %s без обращения к провайдеру', async (path) => {
		const fetchMock = vi.fn()
		vi.stubGlobal('fetch', fetchMock)
		const response = await handleTmdbRequest(request(path), TOKEN)
		expect(response.status).toBe(400)
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('не передаёт браузерные заголовки TMDB', async () => {
		const fetchMock = vi.fn().mockResolvedValue(Response.json({ results: [] }))
		vi.stubGlobal('fetch', fetchMock)
		await handleTmdbRequest(
			request('/search/movie?query=matrix', { headers: { Authorization: 'Bearer client', Cookie: 'private' } }),
			TOKEN
		)
		expect(fetchMock.mock.calls[0]?.[1].headers).toEqual({ Accept: 'application/json', Authorization: `Bearer ${TOKEN}` })
	})

	it('без токена возвращает 503 без upstream-запроса', async () => {
		const fetchMock = vi.fn()
		vi.stubGlobal('fetch', fetchMock)
		const response = await handleTmdbRequest(request('/discover/movie'), undefined)
		expect(response.status).toBe(503)
		expect(response.headers.get('cache-control')).toBe('no-store')
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('разрешает только GET', async () => {
		const response = await handleTmdbRequest(request('/discover/movie', { method: 'POST' }), TOKEN)
		expect(response.status).toBe(405)
		expect(response.headers.get('allow')).toBe('GET')
	})

	it('не раскрывает upstream body или токен при ошибке провайдера', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(TOKEN, { status: 401 })))
		const response = await handleTmdbRequest(request('/movie/603'), TOKEN)
		expect(response.status).toBe(502)
		expect(response.headers.get('cache-control')).toBe('no-store')
		expect(await response.text()).not.toContain(TOKEN)
	})

	it('обрабатывает некорректный JSON', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not-json')))
		expect((await handleTmdbRequest(request('/movie/603'), TOKEN)).status).toBe(502)
	})

	it('возвращает безопасную ошибку таймаута', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException(TOKEN, 'TimeoutError')))
		const response = await handleTmdbRequest(request('/movie/603'), TOKEN)
		expect(response.status).toBe(504)
		expect(await response.text()).not.toContain(TOKEN)
	})
})
