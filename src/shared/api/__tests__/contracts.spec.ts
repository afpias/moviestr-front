import { describe, expect, it } from 'vitest'

import { parseGame, parseGuess, parseRoomView, parseSuggestions } from '../contracts'

export const playing = {
	gameId: '11111111-1111-4111-8111-111111111111',
	difficulty: 'easy',
	genre: 'all',
	totalFrames: 5,
	version: 2,
	serverTime: 1000,
	attemptedMovieIds: ['tmdb-603'],
	status: 'playing',
	currentFrame: { index: 1, alt: 'Кадр', url: 'https://image.tmdb.org/t/p/w1280/frame.jpg' }
}
describe('backend DTO boundaries', () => {
	it('accepts a personal game snapshot with attempted IDs', () => {
		expect(parseGame(playing)).toEqual(playing)
	})
	it.each([{ movieId: 'tmdb-1' }, { aliases: ['answer'] }, { frames: [playing.currentFrame] }, { result: { title: 'answer' } }])(
		'rejects active answer/future-frame leaks: %o',
		(leak) => {
			expect(() => parseGame({ ...playing, ...leak })).toThrow()
		}
	)
	it('rejects invalid frame indices, versions and malformed search suggestions', () => {
		expect(() => parseGame({ ...playing, version: 0 })).toThrow()
		expect(() => parseGame({ ...playing, currentFrame: { ...playing.currentFrame, index: 5 } })).toThrow()
		expect(() => parseSuggestions([{ id: '603', title: 'Матрица', releaseYear: 1999 }])).toThrow()
	})
	it('accepts guess snapshots but rejects correct=true while still playing', () => {
		expect(parseGuess({ ...playing, correct: false }).attemptedMovieIds).toEqual(['tmdb-603'])
		expect(() => parseGuess({ ...playing, correct: true })).toThrow()
	})
	it('keeps preview separate and rejects leaked players before join', () => {
		const preview = {
			view: 'preview',
			id: 'room',
			status: 'waiting',
			playerCount: 1,
			hasPassword: true,
			settings: {
				name: 'Кино',
				capacity: 4,
				filmCount: 20,
				difficulty: 'easy',
				genre: 'all',
				mode: 'points',
				visibility: 'private'
			}
		}
		expect(parseRoomView(preview).view).toBe('preview')
		expect(() => parseRoomView({ ...preview, players: [] })).toThrow()
	})
})
