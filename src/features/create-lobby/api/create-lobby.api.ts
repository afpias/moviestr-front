import { useMultiplayerStore } from '@shared/stores/multiplayer.store'
import type { LobbySettings } from '@shared/types/multiplayer'

export function createLobby(settings: LobbySettings, nickname: string, password: string): Promise<string | null> {
	return useMultiplayerStore().execute((api) => api.createRoom(settings, nickname, password))
}
