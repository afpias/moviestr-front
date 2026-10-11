import { normalizeMovieTitle } from '@shared/lib/game-rules'

export function containsMovieTitle(recognizedText: string, titles: readonly string[]): boolean {
	const normalizedText = normalizeMovieTitle(recognizedText)

	if (normalizedText.length === 0) {
		return false
	}

	const paddedText = ` ${normalizedText} `

	return titles.some((title) => {
		const normalizedTitle = normalizeMovieTitle(title)

		return normalizedTitle.length > 0 && paddedText.includes(` ${normalizedTitle} `)
	})
}
