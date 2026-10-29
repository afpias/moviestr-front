import { useMultiplayerStore } from '@shared/stores/multiplayer.store'

export async function submitRoomGuess(roomId: string, roundId: string, movieId: string): Promise<void> {
	const store = useMultiplayerStore()
	const frame = store.room?.currentFrame
	if (frame) await store.execute((api) => api.submitGuess(roomId, roundId, movieId, frame.index))
}

export async function skipRoomFrame(roomId: string, roundId: string, frameIndex: number): Promise<void> {
	await useMultiplayerStore().execute((api) => api.skipFrame(roomId, roundId, frameIndex))
}

export async function readyRoomRound(roomId: string, roundId: string): Promise<void> {
	await useMultiplayerStore().execute((api) => api.readyRoom(roomId, roundId))
}
