import { beforeEach, describe, expect, it, vi } from 'vitest'

import { installApiFixture, playingGame } from '@shared/testing/api-fixture'

import { getChallenge, loadChallenge, skipFrame, submitGuess } from '../games.api'
import { resetHttpSession } from '../http'

describe('solo network API', () => {
	beforeEach(installApiFixture)
	it('creates a pending server operation without a frame or answer', async () => {
		const pending = await loadChallenge('tmdb-catalog', 'easy')
		expect(pending.status).toBe('loading')
		expect(pending).not.toHaveProperty('movieId')
		expect(pending).not.toHaveProperty('currentFrame')
		expect((await getChallenge(pending.gameId)).status).toBe('playing')
	})
	it('sends the selected ID and expected frame, never a trusted title or score', async () => {
		const pending = await loadChallenge('tmdb-catalog', 'easy')
		const response = await submitGuess(pending.gameId, 'tmdb-603', 0)
		expect(response.correct).toBe(false)
		expect(response.attemptedMovieIds).toEqual(['tmdb-603'])
		const fetcher = vi.mocked(fetch)
		expect(JSON.parse(String(fetcher.mock.lastCall?.[1]?.body))).toEqual({ movieId: 'tmdb-603', expectedFrameIndex: 0 })
	})
	it('uses server skip snapshot including personal attempts and version', async () => {
		const pending = await loadChallenge('tmdb-catalog', 'easy')
		expect(await skipFrame(pending.gameId, 0)).toMatchObject({ status: 'playing', version: 2, currentFrame: { index: 1 } })
	})
	it('does not turn HTTP failures into a wrong answer', async () => {
		resetHttpSession()
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValueOnce(Response.json({ participantId: 'guest', expiresAt: Date.now() + 60000 }))
				.mockResolvedValueOnce(Response.json({ code: 'FRAME_CONFLICT', message: 'stale' }, { status: 409 }))
		)
		await expect(submitGuess(playingGame().gameId, 'tmdb-603', 0)).rejects.toMatchObject({ code: 'FRAME_CONFLICT' })
	})
})
