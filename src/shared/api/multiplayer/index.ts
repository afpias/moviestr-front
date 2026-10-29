import { isRecord } from '@shared/lib/type-guards'
import type { MultiplayerApi } from '@shared/types/multiplayer'

import { ApiError } from '../api-error'
import { parseLobbies, parseRoom, parseRoomView } from '../contracts'
import { ensureGuest, request } from '../http'

const roomPath = (id: string) => `/rooms/${encodeURIComponent(id.trim())}`

export function createMultiplayerApi(): MultiplayerApi {
	async function command(roomId: string, action: string, body: unknown): Promise<void> {
		await ensureGuest()
		parseRoom(await request(`${roomPath(roomId)}/${action}`, body))
	}
	return {
		listRooms: async () => parseLobbies(await request('/rooms')),
		getRoom: async (id) => {
			await ensureGuest()
			return parseRoomView(await request(roomPath(id)))
		},
		createRoom: async (settings, nickname, password) => {
			await ensureGuest()
			const value = await request('/rooms', { settings, nickname, password })
			if (!isRecord(value) || typeof value.roomId !== 'string')
				throw new ApiError(502, { code: 'INVALID_RESPONSE', message: 'Не удалось создать комнату.' })
			parseRoom(value.snapshot)
			return value.roomId
		},
		joinRoom: (id, nickname, password) => command(id, 'join', { nickname, password }),
		startRoom: (id) => command(id, 'start', {}),
		submitGuess: (id, roundId, movieId, expectedFrameIndex) => command(id, 'guesses', { roundId, movieId, expectedFrameIndex }),
		skipFrame: (id, roundId, expectedFrameIndex) => command(id, 'skip', { roundId, expectedFrameIndex }),
		readyRoom: (id, roundId) => command(id, 'ready', { roundId }),
		retryPreparation: (id) => command(id, 'retry-preparation', {}),
		leaveRoom: async (id) => {
			await ensureGuest()
			const value = await request(`${roomPath(id)}/leave`, {})
			if (!isRecord(value) || value.left !== true)
				throw new ApiError(502, { code: 'INVALID_RESPONSE', message: 'Не удалось выйти из комнаты.' })
		}
	}
}
