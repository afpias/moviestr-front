import { isRecord } from '@shared/lib/type-guards'
import type { LobbySummary, RoomSnapshot } from '@shared/types/multiplayer'

import { ApiError } from './api-error'
import { parseLobbies, parseRoom } from './contracts'
import { ensureGuest, invalidateGuestSession, request } from './http'

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline'
interface RealtimeOptions {
	roomId?: string
	onStatus: (status: ConnectionStatus) => void
	onRoom: (snapshot: RoomSnapshot, resync: boolean) => void
	onLobbies: (rooms: LobbySummary[], revision: number, resync: boolean) => void
	onError: (error: Error) => void
	onSessionExpired?: () => void
}

export function connectRealtime(options: RealtimeOptions): () => void {
	let stopped = false
	let socket: WebSocket | null = null
	let retry: ReturnType<typeof setTimeout> | undefined
	let authTimeout: ReturnType<typeof setTimeout> | undefined
	let failures = 0
	let received = false
	function expired(): void {
		invalidateGuestSession()
		options.onSessionExpired?.()
	}
	function reconnect(): void {
		clearTimeout(authTimeout)
		if (stopped) return
		options.onStatus('reconnecting')
		retry = setTimeout(() => void open(), Math.min(15_000, 500 * 2 ** Math.min(failures++, 5)))
	}
	async function open(): Promise<void> {
		try {
			await ensureGuest()
			if (stopped) return
			const response = await request('/realtime-tickets', options.roomId ? { roomId: options.roomId } : {}, true)
			if (stopped) return
			if (!isRecord(response) || typeof response.ticket !== 'string' || typeof response.expiresAt !== 'number')
				throw new ApiError(502, { code: 'INVALID_RESPONSE', message: 'Не удалось открыть соединение.' })
			const url = new URL('/ws', window.location.href)
			url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
			const current = new WebSocket(url)
			socket = current
			received = false
			authTimeout = setTimeout(() => current.close(), 10_000)
			current.onopen = () => current.send(JSON.stringify({ event: 'session.auth', data: { ticket: response.ticket } }))
			current.onmessage = (message) => {
				if (stopped || socket !== current) return
				try {
					const value: unknown = JSON.parse(String(message.data))
					if (!isRecord(value) || !isRecord(value.data)) throw new Error('Некорректное сообщение сервера.')
					if (value.event === 'session.ready') {
						clearTimeout(authTimeout)
						current.send(
							JSON.stringify(
								options.roomId
									? { event: 'room.subscribe', data: { roomId: options.roomId } }
									: { event: 'lobbies.subscribe', data: {} }
							)
						)
					} else if (value.event === 'room.snapshot' && options.roomId) {
						const snapshot = parseRoom(value.data)
						if (snapshot.id !== options.roomId) throw new Error('Сообщение другой комнаты.')
						options.onRoom(snapshot, !received)
						received = true
						failures = 0
						options.onStatus('connected')
					} else if (value.event === 'lobbies.snapshot' && !options.roomId) {
						if (typeof value.data.revision !== 'number' || !Number.isSafeInteger(value.data.revision))
							throw new Error('Некорректная версия списка.')
						options.onLobbies(parseLobbies(value.data.rooms), value.data.revision, !received)
						received = true
						failures = 0
						options.onStatus('connected')
					} else if (value.event === 'session.error') {
						if (value.data.code === 'SESSION_REQUIRED' || value.data.code === 'SESSION_EXPIRED') expired()
						options.onError(new Error(typeof value.data.message === 'string' ? value.data.message : 'Ошибка соединения.'))
						if (value.data.code !== 'REALTIME_UNAVAILABLE') current.close()
					}
				} catch (cause: unknown) {
					options.onError(cause instanceof Error ? cause : new Error('Некорректный ответ сервера.'))
					current.close()
				}
			}
			current.onclose = (event) => {
				if (event.code === 4401) expired()
				reconnect()
			}
			current.onerror = () => current.close()
		} catch (cause: unknown) {
			if (stopped) return
			if (cause instanceof ApiError && cause.status === 401) expired()
			options.onError(cause instanceof Error ? cause : new Error('Нет связи с сервером.'))
			reconnect()
		}
	}
	options.onStatus('connecting')
	void open()
	return () => {
		stopped = true
		clearTimeout(retry)
		clearTimeout(authTimeout)
		if (socket) {
			socket.onclose = null
			socket.close()
		}
		options.onStatus('offline')
	}
}
