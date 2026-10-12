import { createWorker } from 'tesseract.js'

let workerPromise: ReturnType<typeof createWorker> | null = null
const recognitionCache = new Map<string, Promise<string>>()

function getWorker(): ReturnType<typeof createWorker> {
	workerPromise ??= createWorker(['eng', 'rus'])

	return workerPromise
}

async function recognize(imageUrl: string): Promise<string> {
	const worker = await getWorker()
	const result = await worker.recognize(imageUrl)

	return result.data.text
}

export function recognizeTmdbImageText(imageUrl: string): Promise<string> {
	const cachedRecognition = recognitionCache.get(imageUrl)

	if (cachedRecognition) {
		return cachedRecognition
	}

	const recognition = recognize(imageUrl).catch((error: unknown) => {
		recognitionCache.delete(imageUrl)
		throw error
	})

	recognitionCache.set(imageUrl, recognition)

	return recognition
}
