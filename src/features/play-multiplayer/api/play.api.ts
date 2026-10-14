import { useMultiplayerStore } from '@shared/stores/multiplayer.store'

export async function submitRoomGuess(roomId: string, roundId: string, movieId: string): Promise<void> {
	await useMultiplayerStore().execute((api) => api.submitGuess(roomId, roundId, movieId))
}

export async function skipRoomFrame(roomId: string, roundId: string, frameIndex: number): Promise<void> {
	await useMultiplayerStore().execute((api) => api.skipFrame(roomId, roundId, frameIndex))
}
