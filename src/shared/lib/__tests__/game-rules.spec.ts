import { describe, expect, it } from 'vitest'

import { getPointsForFrame, normalizeMovieTitle } from '@shared/lib/game-rules'

describe('game rules', () => {
	it('нормализует регистр, букву ё, пунктуацию и пробелы', () => {
		expect(normalizeMovieTitle('  Всё, везде   и сразу! ')).toBe('все везде и сразу')
	})

	it.each([
		[0, 600],
		[1, 500],
		[2, 400],
		[3, 300],
		[4, 200],
		[5, 100],
		[6, 0]
	])('возвращает очки для кадра %i', (frameIndex, expectedPoints) => {
		expect(getPointsForFrame(frameIndex)).toBe(expectedPoints)
	})
})
