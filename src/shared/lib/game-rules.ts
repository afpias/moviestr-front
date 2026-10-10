export const SCORE_BY_FRAME = [600, 500, 400, 300, 200, 100] as const

export function normalizeMovieTitle(title: string): string {
	return title
		.toLocaleLowerCase('ru-RU')
		.replace(/ё/g, 'е')
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim()
		.replace(/\s+/g, ' ')
}

export function getPointsForFrame(frameIndex: number): number {
	return SCORE_BY_FRAME[frameIndex] ?? 0
}
