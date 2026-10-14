import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { createLobby } from '@features/create-lobby'
import { joinLobby } from '@features/join-lobby'
import { useMultiplayerStore } from '@shared/stores/multiplayer.store'
import type { LobbySettings } from '@shared/types/multiplayer'

export function useLobbyPage() {
	const router = useRouter()
	const store = useMultiplayerStore()

	async function create(settings: LobbySettings, nickname: string, password: string): Promise<void> {
		const roomId = await createLobby(settings, nickname, password)
		if (roomId) {
			await router.push({ name: 'room', params: { roomId } })
		}
	}

	async function join(roomId: string, nickname: string, password: string): Promise<void> {
		const joined = await joinLobby(roomId, nickname, password)
		if (joined) {
			await router.push({ name: 'room', params: { roomId: roomId.trim() } })
		}
	}

	function openRoom(roomId: string): void {
		void router.push({ name: 'room', params: { roomId } })
	}

	onMounted(() => store.connect())
	onBeforeUnmount(store.stop)
	return { store, create, join, openRoom }
}
