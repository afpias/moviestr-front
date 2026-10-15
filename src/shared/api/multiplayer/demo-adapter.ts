import type { LobbySettings, MultiplayerApi, RoomSnapshot } from '@shared/types/multiplayer'

import {
	applyGuess,
	applySkip,
	createPlayer,
	type DemoRoom,
	joinPlayer,
	leavePlayer,
	publishMovie,
	requireHost,
	requirePlayer,
	type RoomMovie,
	startMatch,
	tickRoom,
	toLobbySummary,
	toRoomSnapshot,
	validateSettings
} from './room-model'
import { type DemoRegistry, parseRegistry } from './storage-schema'

export const DEMO_STORAGE_KEY = 'moviestr:multiplayer:demo:v1'
const DEMO_CHANGE_EVENT = 'moviestr:multiplayer-changed'

export interface DemoAdapterOptions {
	participantId: string
	storage: Pick<Storage, 'getItem' | 'setItem'>
	exclusive: <T>(operation: () => T) => Promise<T>
	loadMovie: (settings: LobbySettings) => Promise<RoomMovie>
	hashPassword: (roomId: string, password: string) => Promise<string>
	now: () => number
	newId: () => string
	onChange: (callback: () => void) => () => void
	notify: () => void
}

export function createDemoAdapter(options: DemoAdapterOptions): MultiplayerApi {
	const read = (): DemoRegistry => parseRegistry(options.storage.getItem(DEMO_STORAGE_KEY))
	const requireRoom = (registry: DemoRegistry, roomId: string): DemoRoom => {
		const room = registry.rooms.find((candidate) => candidate.id === roomId)
		if (!room) {
			throw new Error('Комната не найдена.')
		}
		return room
	}

	async function change<T>(operation: (registry: DemoRegistry) => T): Promise<T> {
		const result = await options.exclusive(() => {
			const registry = read()
			const value = operation(registry)
			options.storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(registry))
			return value
		})
		options.notify()
		return result
	}

	async function updateRoom(roomId: string, operation: (room: DemoRoom) => void): Promise<void> {
		await change((registry) => {
			const room = requireRoom(registry, roomId)
			// Reconcile deadlines before accepting a command, even when background timers were throttled.
			tickRoom(room, options.now())
			operation(room)
			room.updatedAt = options.now()
		})
	}

	async function createRoom(settings: LobbySettings, nickname: string, password: string): Promise<string> {
		validateSettings(settings)
		if (password.length > 64) {
			throw new Error('Пароль должен содержать не больше 64 символов.')
		}
		const id = options.newId().split('-').join('').slice(0, 10)
		const player = createPlayer(options.participantId, nickname, options.now())
		const passwordHash = password ? await options.hashPassword(id, password) : null
		return change((registry) => {
			if (registry.rooms.some((room) => room.id === id)) {
				throw new Error('Не удалось создать уникальный код. Попробуй ещё раз.')
			}
			registry.rooms.push({
				id,
				settings: { ...settings, name: settings.name.trim() },
				passwordHash,
				hostId: player.id,
				players: [player],
				status: 'waiting',
				roundId: '',
				roundNumber: 0,
				deadline: null,
				movie: null,
				usedMovieIds: [],
				loadingSince: 0,
				loaderId: null,
				error: null,
				updatedAt: options.now()
			})
			return id
		})
	}

	async function joinRoom(roomId: string, nickname: string, password: string): Promise<void> {
		const passwordHash = password ? await options.hashPassword(roomId, password) : null
		await updateRoom(roomId, (room) => {
			const existing = room.players.some((player) => player.id === options.participantId && !player.left)
			if (!existing && room.passwordHash !== passwordHash) {
				throw new Error('Неверный пароль комнаты.')
			}
			joinPlayer(room, options.participantId, nickname, options.now())
		})
	}

	async function prepareMovie(roomId: string): Promise<void> {
		const reservation = await change((registry) => {
			const room = requireRoom(registry, roomId)
			const me = requirePlayer(room, options.participantId)
			me.lastSeen = options.now()
			tickRoom(room, options.now())
			if (room.status !== 'loading') {
				return null
			}
			const loaderConnected = room.players.some(
				(player) => player.id === room.loaderId && !player.left && options.now() - player.lastSeen <= 30_000
			)
			if (room.loaderId !== null && loaderConnected && options.now() - room.loadingSince < 120_000) {
				return null
			}
			room.loaderId = options.participantId
			room.loadingSince = options.now()
			return {
				roundId: room.roundId,
				loadingSince: room.loadingSince,
				settings: room.settings,
				usedMovieIds: [...room.usedMovieIds]
			}
		})
		if (!reservation) {
			return
		}
		try {
			let movie: RoomMovie | null = null
			for (let attempt = 0; attempt < 12; attempt += 1) {
				const candidate = await options.loadMovie(reservation.settings)
				if (!reservation.usedMovieIds.includes(candidate.id)) {
					movie = candidate
					break
				}
			}
			if (!movie) {
				throw new Error('Не удалось подобрать новый фильм. Попробуй повторить загрузку.')
			}
			const preparedMovie = movie
			await updateRoom(roomId, (room) => {
				if (
					room.status === 'loading' &&
					room.roundId === reservation.roundId &&
					room.loaderId === options.participantId &&
					room.loadingSince === reservation.loadingSince
				) {
					publishMovie(room, preparedMovie, options.now())
				}
			})
		} catch (error: unknown) {
			await updateRoom(roomId, (room) => {
				if (
					room.status === 'loading' &&
					room.roundId === reservation.roundId &&
					room.loaderId === options.participantId &&
					room.loadingSince === reservation.loadingSince
				) {
					room.status = 'error'
					room.error = error instanceof Error ? error.message : 'Не удалось загрузить фильм.'
					room.loaderId = null
				}
			})
		}
	}

	async function heartbeat(roomId: string): Promise<void> {
		await change((registry) => {
			const now = options.now()
			const currentRoom = registry.rooms.find((room) => room.id === roomId)
			const me = currentRoom?.players.find((player) => player.id === options.participantId && !player.left)
			if (me && currentRoom && currentRoom.status !== 'closed') {
				me.lastSeen = now
				currentRoom.updatedAt = now
			}
			for (const room of registry.rooms) {
				tickRoom(room, now)
			}
			registry.rooms = registry.rooms.filter((room) => room.status !== 'closed' || now - room.updatedAt < 3_600_000)
		})
	}

	const getRoom = (roomId: string): RoomSnapshot | null => {
		const room = read().rooms.find((candidate) => candidate.id === roomId)
		return room ? toRoomSnapshot(room, options.participantId, options.now()) : null
	}

	return {
		participantId: options.participantId,
		listRooms: () =>
			read()
				.rooms.filter((room) => room.status === 'waiting' && room.settings.visibility === 'public')
				.map(toLobbySummary),
		getRoom,
		createRoom,
		joinRoom,
		prepareMovie,
		heartbeat,
		startRoom: (roomId) => updateRoom(roomId, (room) => startMatch(room, options.participantId, options.now())),
		submitGuess: (roomId, roundId, movieId) =>
			updateRoom(roomId, (room) => applyGuess(room, options.participantId, roundId, movieId)),
		skipFrame: (roomId, roundId, frameIndex) =>
			updateRoom(roomId, (room) => applySkip(room, options.participantId, roundId, frameIndex)),
		leaveRoom: (roomId) => updateRoom(roomId, (room) => leavePlayer(room, options.participantId, options.now())),
		retryPreparation: (roomId) =>
			updateRoom(roomId, (room) => {
				requireHost(room, options.participantId)
				if (room.status === 'error') {
					room.status = 'loading'
					room.loaderId = null
					room.error = null
				}
			}),
		subscribe: options.onChange
	}
}

export function getDemoParticipantId(): string {
	const key = 'moviestr:multiplayer:guest:v1'
	const savedId = window.sessionStorage.getItem(key)
	if (savedId) {
		return savedId
	}
	const id = crypto.randomUUID()
	window.sessionStorage.setItem(key, id)
	return id
}

export async function hashDemoPassword(roomId: string, password: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${roomId}:${password}`))
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function subscribeDemoChanges(callback: () => void): () => void {
	const storageListener = (event: StorageEvent): void => {
		if (event.key === DEMO_STORAGE_KEY || event.key === null) {
			callback()
		}
	}
	window.addEventListener('storage', storageListener)
	window.addEventListener(DEMO_CHANGE_EVENT, callback)
	return () => {
		window.removeEventListener('storage', storageListener)
		window.removeEventListener(DEMO_CHANGE_EVENT, callback)
	}
}

export function notifyDemoChanges(): void {
	window.dispatchEvent(new Event(DEMO_CHANGE_EVENT))
}
