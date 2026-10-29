import { describe, expect, it } from 'vitest'

import { roomResultFixture, waitingRoomFixture } from '@shared/testing/room-fixture'

import { parseRoom, parseRoomView } from '../contracts'

describe('room result DTO boundary', () => {
	it('accepts the backend reveal and readiness in HTTP and WS member snapshots', () => {
		const snapshot = roomResultFixture()
		expect(parseRoom(snapshot).status).toBe('round-result')
		expect(parseRoomView(snapshot)).toEqual(snapshot)
	})
	it('requires readiness only in round-result, an answer, and no playable frame or timer there', () => {
		const snapshot = roomResultFixture()
		for (const invalid of [
			{ ...snapshot, roundResult: null },
			{ ...snapshot, result: null },
			{ ...snapshot, deadline: 5000 },
			{ ...snapshot, roundResult: { ...snapshot.roundResult, roundId: '44444444-4444-4444-8444-444444444444' } },
			{ ...snapshot, roundResult: { ...snapshot.roundResult, readyPlayerIds: ['not-a-player-id'] } },
			{ ...snapshot, roundResult: { ...snapshot.roundResult, answer: 'leak' } },
			{ ...snapshot, status: 'playing', result: snapshot.result, roundResult: null }
		])
			expect(() => parseRoom(invalid)).toThrow()
		expect(parseRoom(waitingRoomFixture()).roundResult).toBeNull()
		expect(() => parseRoom({ ...waitingRoomFixture(), roundResult: snapshot.roundResult })).toThrow()
	})
	it('does not expose personal result or readiness in a preview', () => {
		const snapshot = roomResultFixture()
		const preview = {
			view: 'preview',
			id: snapshot.id,
			settings: snapshot.settings,
			playerCount: 2,
			hasPassword: false,
			status: 'round-result'
		}
		expect(parseRoomView(preview).view).toBe('preview')
		expect(() => parseRoomView({ ...preview, roundResult: snapshot.roundResult })).toThrow()
	})
})
