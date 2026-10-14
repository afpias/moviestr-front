import { reactive, ref } from 'vue'

import type { LobbySettings } from '@shared/types/multiplayer'

export function useCreateLobby() {
	const nickname = ref('')
	const password = ref('')
	const settings = reactive<LobbySettings>({
		name: '',
		capacity: 4,
		filmCount: 20,
		difficulty: 'easy',
		genre: 'all',
		visibility: 'public',
		mode: 'points'
	})
	return { nickname, password, settings }
}
