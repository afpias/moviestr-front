import { GAME_FRAME_COUNT } from '@shared/lib/game-rules'
import { containsMovieTitle } from '@shared/lib/movie-title-detection'

import type { TmdbImage } from './client'

const BACKDROP_CANDIDATE_LIMIT = 18
const OCR_TIME_BUDGET_MS = 450
const SAFE_BACKDROP_TARGET = BACKDROP_CANDIDATE_LIMIT

export type ImageTextRecognizer = (imageUrl: string) => Promise<string>

type RecognitionResult = { status: 'failed' } | { status: 'recognized'; text: string } | { status: 'timed-out' }

function getRecognitionScore(image: TmdbImage): number {
	return Math.log1p(Math.max(0, image.voteCount)) * 0.7 + Math.max(0, image.voteAverage) * 0.3
}

function pickAcrossRecognitionRange(images: readonly TmdbImage[]): TmdbImage[] {
	if (images.length <= GAME_FRAME_COUNT) {
		return [...images]
	}

	return Array.from({ length: GAME_FRAME_COUNT }, (_, index) => {
		const imageIndex = Math.round((index * (images.length - 1)) / (GAME_FRAME_COUNT - 1))

		return images[imageIndex]
	}).filter((image): image is TmdbImage => image !== undefined)
}

async function recognizeWithinBudget(
	imageUrl: string,
	recognizeImageText: ImageTextRecognizer,
	deadline: number
): Promise<RecognitionResult> {
	const remainingTime = deadline - Date.now()

	if (remainingTime <= 0) {
		return { status: 'timed-out' }
	}

	let timeoutId: ReturnType<typeof setTimeout> | undefined
	const timeout = new Promise<RecognitionResult>((resolve) => {
		timeoutId = setTimeout(() => resolve({ status: 'timed-out' }), remainingTime)
	})
	const recognition: Promise<RecognitionResult> = recognizeImageText(imageUrl)
		.then((text) => ({ status: 'recognized' as const, text }))
		.catch(() => ({ status: 'failed' as const }))

	const result = await Promise.race([recognition, timeout])
	clearTimeout(timeoutId)

	return result
}

export async function selectSafeBackdrops(
	images: readonly TmdbImage[],
	titles: readonly string[],
	createImageUrl: (filePath: string) => string,
	recognizeImageText: ImageTextRecognizer
): Promise<TmdbImage[]> {
	const candidates = images
		.filter((image) => image.width >= 780 && image.width > image.height && image.language === null)
		.sort((first, second) => second.voteCount - first.voteCount || second.width - first.width)
		.slice(0, BACKDROP_CANDIDATE_LIMIT)
		.sort((first, second) => getRecognitionScore(first) - getRecognitionScore(second))
	const safeBackdrops: TmdbImage[] = []
	const ocrDeadline = Date.now() + OCR_TIME_BUDGET_MS

	for (const candidate of candidates) {
		const recognition = await recognizeWithinBudget(createImageUrl(candidate.filePath), recognizeImageText, ocrDeadline)

		if (recognition.status !== 'recognized' || !containsMovieTitle(recognition.text, titles)) {
			safeBackdrops.push(candidate)
		}

		if (safeBackdrops.length === SAFE_BACKDROP_TARGET) {
			break
		}
	}

	return pickAcrossRecognitionRange(safeBackdrops)
}
