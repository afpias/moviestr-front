import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { joinLobby } from '@features/join-lobby'
import { leaveRoom } from '@features/manage-room'
import { useMultiplayerStore } from '@shared/stores/multiplayer.store'

export function useRoomPage() {
	const route = useRoute()
	const router = useRouter()
	const store = useMultiplayerStore()
	const copied = ref(false)
	const roomId = computed(() => (typeof route.params.roomId === 'string' ? route.params.roomId : ''))
	const inviteUrl = computed(() =>
		new URL(router.resolve({ name: 'room', params: { roomId: roomId.value } }).href, window.location.href).toString()
	)

	watch(
		roomId,
		(id) => {
			store.connect(id)
		},
		{ immediate: true }
	)
	watch(
		() => store.room?.settings.difficulty,
		(difficulty) => {
			if (difficulty) {
				document.documentElement.dataset.roomDifficulty = difficulty
			} else {
				delete document.documentElement.dataset.roomDifficulty
			}
		},
		{ immediate: true }
	)

	async function join(id: string, nickname: string, password: string): Promise<void> {
		await joinLobby(id, nickname, password)
	}

	async function leave(): Promise<void> {
		if (await leaveRoom(roomId.value)) {
			await router.push({ name: 'lobby' })
		}
	}

	async function copyInvite(): Promise<void> {
		try {
			await navigator.clipboard.writeText(inviteUrl.value)
			copied.value = true
		} catch {
			copied.value = false
		}
	}

	onBeforeUnmount(() => {
		store.stop()
		delete document.documentElement.dataset.roomDifficulty
	})
	return { store, roomId, inviteUrl, copied, join, leave, copyInvite }
}
