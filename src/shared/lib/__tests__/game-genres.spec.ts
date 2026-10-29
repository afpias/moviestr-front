import { describe, expect, it } from 'vitest'

import { getGameGenreOption, isGameGenre } from '@shared/lib/game-genres'

describe('genre UI options', () => {
	it('shows a readable label for server values', () => {
		expect(getGameGenreOption('science-fiction').label).toBe('Фантастика')
	})
	it('rejects unsupported stored values', () => {
		expect(isGameGenre('thriller')).toBe(true)
		expect(isGameGenre('western')).toBe(false)
	})
})
