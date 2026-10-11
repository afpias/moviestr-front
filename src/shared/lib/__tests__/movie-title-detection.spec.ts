import { describe, expect, it } from 'vitest'

import { containsMovieTitle } from '@shared/lib/movie-title-detection'

describe('movie title detection', () => {
	it('находит русское или английское название в распознанном тексте', () => {
		const titles = ['Интерстеллар', 'Interstellar']

		expect(containsMovieTitle('Смотрите: ИНТЕРСТЕЛЛАР!', titles)).toBe(true)
		expect(containsMovieTitle('INTERSTELLAR — only in cinemas', titles)).toBe(true)
	})

	it('сопоставляет короткое название только как отдельное слово', () => {
		expect(containsMovieTitle('HD 4K', ['It', 'Оно'])).toBe(false)
		expect(containsMovieTitle('Stephen King IT official trailer', ['It', 'Оно'])).toBe(true)
		expect(containsMovieTitle('With the heroes', ['It', 'Оно'])).toBe(false)
	})

	it('оставляет кадр с посторонним текстом', () => {
		expect(containsMovieTitle('New York Central Station', ['Матрица', 'The Matrix'])).toBe(false)
	})
})
