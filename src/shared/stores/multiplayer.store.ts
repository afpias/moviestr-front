import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'

import { ApiError } from '@shared/api/api-error'
import { ensureGuest } from '@shared/api/http'
import { createMultiplayerApi } from '@shared/api/multiplayer'
import { type ConnectionStatus, connectRealtime } from '@shared/api/realtime'
import { clearLegacyState } from '@shared/lib/legacy-state'
import type { LobbyPreview, LobbySummary, MultiplayerApi, RoomSnapshot } from '@shared/types/multiplayer'

export const useMultiplayerStore = defineStore('multiplayer', () => {
	const rooms = shallowRef<LobbySummary[]>([])
	const room = shallowRef<RoomSnapshot | null>(null)
	const preview = shallowRef<LobbyPreview | null>(null)
	const participantId = ref('')
	const error = ref<string | null>(null)
	const busy = ref(false)
	const initializing = ref(false)
	const notFound = ref(false)
	const sessionChanged = ref(false)
	const connection = ref<ConnectionStatus>('offline')
	const now = ref(Date.now())
	const activeRoomId = ref<string | null>(null)
	const api = createMultiplayerApi()
	let disconnect: (() => void) | null = null
	let clock: ReturnType<typeof setInterval> | null = null
	let retry: ReturnType<typeof setTimeout> | null = null
	let generation = 0
	let offset = 0
	let lobbyRevision = -1
	let failures = 0
	const me = computed(() => room.value?.players.find((player) => player.id === participantId.value && !player.left) ?? null)
	const isHost = computed(() => room.value?.hostId === participantId.value)
	const remainingSeconds = computed(() =>
		room.value?.deadline ? Math.max(0, Math.ceil((room.value.deadline - now.value - offset) / 1000)) : 90
	)
	function report(cause: unknown): void {
		error.value = cause instanceof Error ? cause.message : 'Не удалось обновить комнату.'
	}
	function applyRoom(snapshot: RoomSnapshot, resync = false): void {
		if (snapshot.id !== activeRoomId.value) return
		if (!resync && room.value?.id === snapshot.id && snapshot.version <= room.value.version) return
		room.value = snapshot
		preview.value = null
		offset = snapshot.serverTime - Date.now()
	}
	function subscribe(id?: string): void {
		if (disconnect) return
		const token = generation
		disconnect = connectRealtime({
			roomId: id,
			onStatus: (value) => {
				if (token === generation) {
					connection.value = value
					if (value === 'connected') error.value = null
				}
			},
			onRoom: (snapshot, resync) => {
				if (token === generation) applyRoom(snapshot, resync)
			},
			onLobbies: (list, revision, resync) => {
				if (token === generation && (resync || revision > lobbyRevision)) {
					rooms.value = list
					lobbyRevision = revision
				}
			},
			onError: (cause) => {
				if (token === generation) report(cause)
			},
			onSessionExpired: () => {
				if (token === generation) {
					sessionChanged.value = true
					void connect(activeRoomId.value, true)
				}
			}
		})
	}
	function schedule(token: number): void {
		if (token !== generation || retry !== null) return
		connection.value = 'reconnecting'
		retry = setTimeout(
			() => {
				retry = null
				if (token === generation) void refresh()
			},
			Math.min(15000, 500 * 2 ** Math.min(failures++, 5))
		)
	}
	async function refresh(): Promise<void> {
		const token = generation
		const id = activeRoomId.value
		try {
			const identity = await ensureGuest()
			if (token !== generation) return
			if (participantId.value && participantId.value !== identity) {
				disconnect?.()
				disconnect = null
				room.value = null
				preview.value = null
				sessionChanged.value = true
			}
			participantId.value = identity
			if (id) {
				const snapshot = await api.getRoom(id)
				if (token !== generation) return
				if (snapshot.view === 'preview') {
					preview.value = snapshot
					room.value = null
				} else {
					applyRoom(snapshot)
					subscribe(id)
				}
			} else {
				const list = await api.listRooms()
				if (token !== generation) return
				if (!disconnect) rooms.value = list
				subscribe()
			}
			if (token !== generation) return
			failures = 0
			notFound.value = false
			error.value = null
			if (!clock)
				clock = setInterval(() => {
					now.value = Date.now()
				}, 500)
		} catch (cause: unknown) {
			if (token !== generation) return
			report(cause)
			notFound.value = cause instanceof ApiError && cause.status === 404
			if (!notFound.value && (!(cause instanceof ApiError) || cause.status === 0 || cause.status === 401 || cause.status >= 500))
				schedule(token)
		} finally {
			if (token === generation) initializing.value = false
		}
	}
	function stop(): void {
		generation += 1
		disconnect?.()
		disconnect = null
		if (clock) clearInterval(clock)
		if (retry) clearTimeout(retry)
		clock = null
		retry = null
		activeRoomId.value = null
		connection.value = 'offline'
		busy.value = false
		initializing.value = false
	}
	async function connect(roomId: string | null = null, expired = false): Promise<void> {
		stop()
		activeRoomId.value = roomId
		room.value = null
		preview.value = null
		error.value = null
		notFound.value = false
		initializing.value = true
		lobbyRevision = -1
		sessionChanged.value = expired
		clearLegacyState()
		await refresh()
	}
	async function execute<T>(action: (adapter: MultiplayerApi) => Promise<T>): Promise<T | null> {
		if (busy.value || initializing.value) return null
		const token = generation
		const identity = participantId.value
		const scope = activeRoomId.value
		busy.value = true
		error.value = null
		try {
			const currentIdentity = await ensureGuest()
			if (token !== generation) return null
			if (identity && currentIdentity !== identity) {
				await refresh()
				sessionChanged.value = true
				return null
			}
			participantId.value = currentIdentity
			const result = await action(api)
			if (token !== generation) return null
			await refresh()
			return token === generation ? result : null
		} catch (cause: unknown) {
			if (token !== generation) return null
			if (cause instanceof ApiError && cause.status === 401) await connect(scope, true)
			else {
				await refresh()
				report(cause)
			}
			return null
		} finally {
			if (token === generation) busy.value = false
		}
	}
	return {
		rooms,
		room,
		preview,
		participantId,
		error,
		busy,
		initializing,
		notFound,
		sessionChanged,
		connection,
		me,
		isHost,
		remainingSeconds,
		connect,
		stop,
		refresh,
		execute,
		applyRoom
	}
})
