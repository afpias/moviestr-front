import { useMultiplayerStore } from '@shared/stores/multiplayer.store'

export async function joinLobby(roomId: string, nickname: string, password: string): Promise<boolean> {
	const result = await useMultiplayerStore().execute(async (api) => {
		await api.joinRoom(roomId.trim(), nickname, password)
		return true
	})
	return result === true
}
