import { describe, expect, it, vi } from 'vitest'

import { searchMovies } from '../movies.api'

describe('movie search HTTP boundary', () => {
	it.each(['матр', 'matrix'])('encodes query %s and uses server suggestions unchanged', async (query) => {
		const items = [{ id: 'tmdb-603', title: 'Матрица', englishTitle: 'The Matrix', releaseYear: 1999 }]
		const fetcher = vi.fn().mockResolvedValue(Response.json(items))
		vi.stubGlobal('fetch', fetcher)
		expect(await searchMovies(query)).toEqual(items)
		expect(fetcher.mock.calls[0]?.[0]).toBe(`/api/v1/movies/search?q=${encodeURIComponent(query)}`)
	})
	it('rejects malformed upstream data', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([{ title: 'answer' }])))
		await expect(searchMovies('xx')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
	})
})
