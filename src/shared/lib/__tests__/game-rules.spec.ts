import { describe, expect, it } from 'vitest'

import { normalizeMovieTitle } from '@shared/lib/game-rules'

describe('game rules', () => {
	it('нормализует регистр, букву ё, пунктуацию и пробелы', () => {
		expect(normalizeMovieTitle('  Всё, везде   и сразу! ')).toBe('все везде и сразу')
	})
})
