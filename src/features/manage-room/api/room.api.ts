import { useMultiplayerStore } from '@shared/stores/multiplayer.store'

export async function startRoom(roomId: string): Promise<void> {
	await useMultiplayerStore().execute((api) => api.startRoom(roomId))
}

export async function retryRoom(roomId: string): Promise<void> {
	await useMultiplayerStore().execute((api) => api.retryPreparation(roomId))
}

export async function leaveRoom(roomId: string): Promise<boolean> {
	return (
		(await useMultiplayerStore().execute(async (api) => {
			await api.leaveRoom(roomId)
			return true
		})) === true
	)
}
