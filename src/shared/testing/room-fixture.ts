import type { RoomSnapshot } from '../types/multiplayer'

export const aliceId = '11111111-1111-4111-8111-111111111111'
export const bobId = '22222222-2222-4222-8222-222222222222'
export const roundId = '33333333-3333-4333-8333-333333333333'

// Complete transport fixtures, only imported from tests.
export function roomResultFixture() {
	return {
		view: 'member' as const,
		version: 3,
		serverTime: 1000,
		id: 'room',
		settings: {
			name: 'Кино',
			capacity: 4,
			filmCount: 2,
			difficulty: 'hard' as const,
			genre: 'all' as const,
			mode: 'points' as const,
			visibility: 'public' as const
		},
		hostId: aliceId,
		status: 'round-result' as const,
		roundId,
		roundNumber: 1,
		deadline: null,
		players: [
			{
				id: aliceId,
				nickname: 'Алиса',
				score: 1100,
				status: 'won' as const,
				lastAnswer: 'correct' as const,
				connected: true,
				left: false
			},
			{ id: bobId, nickname: 'Боб', score: 950, status: 'lost' as const, lastAnswer: null, connected: true, left: false }
		],
		currentFrame: null,
		attemptedMovieIds: [],
		winnerIds: [],
		error: null,
		result: {
			title: 'Матрица',
			originalTitle: 'The Matrix',
			releaseYear: 1999,
			posterUrl: 'https://image.tmdb.org/t/p/w780/poster.jpg'
		},
		roundResult: {
			roundId,
			roundNumber: 1,
			outcome: 'won' as const,
			readyPlayerIds: [] as string[],
			requiredPlayerIds: [aliceId, bobId],
			isReady: false,
			canContinue: true,
			isLastRound: false
		}
	}
}

export function waitingRoomFixture(): RoomSnapshot {
	return { ...roomResultFixture(), status: 'waiting', roundNumber: 0, result: null, roundResult: null }
}
