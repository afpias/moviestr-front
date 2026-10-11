import { describe, expect, it, vi } from 'vitest'

import type { TmdbImage } from '../client'
import { selectSafeBackdrops } from '../frame-selection'

function createImage(filePath: string, voteCount: number): TmdbImage {
	return {
		filePath,
		height: 720,
		language: null,
		voteAverage: 8,
		voteCount,
		width: 1280
	}
}

describe('tmdb frame selection', () => {
	it('исключает кадр с названием и располагает остальные от менее узнаваемого к более узнаваемому', async () => {
		const images = [
			createImage('/title.jpg', 1_000),
			...Array.from({ length: 6 }, (_, index) => createImage(`/safe-${index}.jpg`, (index + 1) * 10))
		]
		const recognize = vi.fn(async (imageUrl: string) => (imageUrl.includes('title') ? 'INTERSTELLAR' : ''))

		const selected = await selectSafeBackdrops(images, ['Интерстеллар', 'Interstellar'], (path) => path, recognize)

		expect(selected).toHaveLength(5)
		expect(selected.some((image) => image.filePath === '/title.jpg')).toBe(false)
		expect(selected.map((image) => image.voteCount)).toEqual([10, 20, 40, 50, 60])
	})

	it('использует fallback без языковой маркировки, если OCR завершился ошибкой', async () => {
		const images = Array.from({ length: 6 }, (_, index) => createImage(`/frame-${index}.jpg`, index))

		const selected = await selectSafeBackdrops(
			images,
			['Фильм'],
			(path) => path,
			async (imageUrl) => {
				if (imageUrl === '/frame-0.jpg') {
					throw new Error('OCR unavailable')
				}

				return ''
			}
		)

		expect(selected).toHaveLength(5)
		expect(selected.map((image) => image.filePath)).toContain('/frame-0.jpg')
	})

	it('не блокирует создание раунда, если OCR не отвечает', async () => {
		vi.useFakeTimers()
		const images = Array.from({ length: 5 }, (_, index) => createImage(`/frame-${index}.jpg`, index))
		const selection = selectSafeBackdrops(
			images,
			['Фильм'],
			(path) => path,
			async () => new Promise<string>(() => undefined)
		)

		await vi.advanceTimersByTimeAsync(450)

		await expect(selection).resolves.toHaveLength(5)
		vi.useRealTimers()
	})

	it('заранее исключает изображения с языковой маркировкой TMDB', async () => {
		const markedImage = { ...createImage('/title-card.jpg', 100), language: 'en' }
		const images = [markedImage, ...Array.from({ length: 5 }, (_, index) => createImage(`/frame-${index}.jpg`, index))]

		const selected = await selectSafeBackdrops(
			images,
			['Movie'],
			(path) => path,
			async () => ''
		)

		expect(selected.map((image) => image.filePath)).not.toContain('/title-card.jpg')
	})
})
