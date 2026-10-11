import { isRecord, isString } from '@shared/lib/type-guards'

import { ApiError } from './api-error'

const API_BASE_URL = '/api/v1'
const REQUEST_TIMEOUT_MS = 15_000

function isApiErrorBody(value: unknown): value is { code: string; message: string; requestId?: string } {
	return isRecord(value) && isString(value.code) && isString(value.message)
}

export async function requestJson<T>(path: string, options: RequestInit, isValid: (value: unknown) => value is T): Promise<T> {
	const controller = new AbortController()
	const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

	try {
		const response = await fetch(`${API_BASE_URL}${path}`, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...options.headers
			},
			signal: controller.signal
		})
		const body: unknown = await response.json()

		if (!response.ok) {
			throw new ApiError(
				response.status,
				isApiErrorBody(body) ? body : { code: 'INTERNAL_ERROR', message: 'Invalid error response' }
			)
		}

		if (!isValid(body)) {
			throw new ApiError(500, { code: 'INTERNAL_ERROR', message: 'Invalid API response' })
		}

		return body
	} catch (error: unknown) {
		if (error instanceof ApiError) {
			throw error
		}

		if (error instanceof DOMException && error.name === 'AbortError') {
			throw new ApiError(408, { code: 'TIMEOUT', message: 'Request timeout' })
		}

		throw new ApiError(500, { code: 'NETWORK_ERROR', message: 'Network request failed' })
	} finally {
		window.clearTimeout(timeoutId)
	}
}
