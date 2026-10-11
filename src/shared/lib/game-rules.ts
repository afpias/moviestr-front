export const GAME_FRAME_COUNT = 5

export function normalizeMovieTitle(title: string): string {
	return title
		.toLocaleLowerCase('ru-RU')
		.replace(/ё/g, 'е')
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim()
		.replace(/\s+/g, ' ')
}
