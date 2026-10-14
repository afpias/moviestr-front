import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'

import { createMultiplayerApi } from '@shared/api/multiplayer'
import type { LobbySummary, MultiplayerApi, RoomSnapshot } from '@shared/types/multiplayer'

export const useMultiplayerStore = defineStore('multiplayer', () => {
	const rooms = shallowRef<LobbySummary[]>([])
	const room = shallowRef<RoomSnapshot | null>(null)
	const participantId = ref('')
	const error = ref<string | null>(null)
	const busy = ref(false)
	const now = ref(Date.now())
	const activeRoomId = ref<string | null>(null)
	let api: MultiplayerApi | null = null
	let unsubscribe: (() => void) | null = null
	let heartbeatTimer: ReturnType<typeof setInterval> | null = null
	let clockTimer: ReturnType<typeof setInterval> | null = null
	let preparing = false
	let pulsing = false

	const me = computed(() => room.value?.players.find((player) => player.id === participantId.value && !player.left) ?? null)
	const isHost = computed(() => room.value?.hostId === participantId.value)
	const remainingSeconds = computed(() =>
		room.value?.deadline === null || !room.value?.deadline ? 90 : Math.max(0, Math.ceil((room.value.deadline - now.value) / 1000))
	)

	function getApi(): MultiplayerApi {
		api ??= createMultiplayerApi()
		participantId.value = api.participantId
		return api
	}

	function reportError(cause: unknown): void {
		error.value = cause instanceof Error ? cause.message : 'Не удалось обновить комнату.'
	}

	async function prepare(): Promise<void> {
		if (preparing || !activeRoomId.value || room.value?.status !== 'loading' || !me.value) {
			return
		}
		preparing = true
		try {
			await getApi().prepareMovie(activeRoomId.value)
		} catch (cause: unknown) {
			reportError(cause)
		} finally {
			preparing = false
		}
	}

	function refresh(): void {
		try {
			const adapter = getApi()
			rooms.value = adapter.listRooms()
			room.value = activeRoomId.value ? adapter.getRoom(activeRoomId.value) : null
			now.value = Date.now()
			void prepare()
		} catch (cause: unknown) {
			reportError(cause)
		}
	}

	async function pulse(): Promise<void> {
		if (pulsing) {
			return
		}
		pulsing = true
		try {
			await getApi().heartbeat(activeRoomId.value ?? '')
			refresh()
		} catch (cause: unknown) {
			reportError(cause)
		} finally {
			pulsing = false
		}
	}

	function stop(): void {
		unsubscribe?.()
		unsubscribe = null
		if (heartbeatTimer !== null) {
			clearInterval(heartbeatTimer)
			heartbeatTimer = null
		}
		if (clockTimer !== null) {
			clearInterval(clockTimer)
			clockTimer = null
		}
		activeRoomId.value = null
	}

	function connect(roomId: string | null = null): void {
		stop()
		activeRoomId.value = roomId
		error.value = null
		try {
			unsubscribe = getApi().subscribe(refresh)
			refresh()
			void pulse()
			heartbeatTimer = setInterval(() => void pulse(), 3000)
			clockTimer = setInterval(() => {
				now.value = Date.now()
			}, 1000)
		} catch (cause: unknown) {
			reportError(cause)
		}
	}

	async function execute<T>(action: (adapter: MultiplayerApi) => Promise<T>): Promise<T | null> {
		if (busy.value) {
			return null
		}
		busy.value = true
		error.value = null
		try {
			const result = await action(getApi())
			refresh()
			return result
		} catch (cause: unknown) {
			reportError(cause)
			refresh()
			return null
		} finally {
			busy.value = false
		}
	}

	return { rooms, room, participantId, error, busy, me, isHost, remainingSeconds, connect, stop, refresh, execute }
})
