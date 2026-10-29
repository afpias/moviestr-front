import { isRecord } from '@shared/lib/type-guards'

import { ApiError } from './api-error'

const pendingKeys = new Map<string, string>()
let guest: Promise<string> | null = null
let guestExpiresAt = 0
let identityEpoch = 0

export function invalidateGuestSession(): void {
	guest = null
	guestExpiresAt = 0
	identityEpoch += 1
	pendingKeys.clear()
}

export function resetHttpSession(): void {
	invalidateGuestSession()
}

export async function request(path: string, body?: unknown, bootstrap = false): Promise<unknown> {
	const serialized = body === undefined ? undefined : JSON.stringify(body)
	const epoch = identityEpoch
	const command = `${path}:${serialized ?? ''}`
	const key = body !== undefined && !bootstrap ? (pendingKeys.get(command) ?? crypto.randomUUID()) : null
	if (key) pendingKeys.set(command, key)
	for (let attempt = 0; ; attempt += 1) {
		try {
			if (epoch !== identityEpoch)
				throw new ApiError(401, { code: 'SESSION_CHANGED', message: 'Гостевая сессия изменилась. Повторите вход.' })
			const response = await fetch(`/api/v1${path}`, {
				method: body === undefined ? 'GET' : 'POST',
				credentials: 'include',
				cache: 'no-store',
				headers: {
					Accept: 'application/json',
					...(serialized ? { 'Content-Type': 'application/json' } : {}),
					...(key ? { 'Idempotency-Key': key } : {})
				},
				body: serialized,
				signal: AbortSignal.timeout(15_000)
			})
			let value: unknown
			try {
				value = await response.json()
			} catch {
				throw new ApiError(502, { code: 'INVALID_RESPONSE', message: 'Сервер вернул некорректный ответ.' })
			}
			if (!response.ok) {
				if (response.status === 401) invalidateGuestSession()
				if (response.status < 500) pendingKeys.delete(command)
				throw new ApiError(
					response.status,
					isRecord(value) && typeof value.code === 'string' && typeof value.message === 'string'
						? {
								code: value.code,
								message: value.message,
								...(typeof value.requestId === 'string' ? { requestId: value.requestId } : {})
							}
						: { code: 'HTTP_ERROR', message: 'Не удалось выполнить запрос.' }
				)
			}
			pendingKeys.delete(command)
			return value
		} catch (cause: unknown) {
			const error =
				cause instanceof ApiError
					? cause
					: new ApiError(0, {
							code: 'NETWORK_ERROR',
							message: 'Нет связи с сервером. Повторите действие после восстановления соединения.'
						})
			if (attempt === 0 && error.code !== 'INVALID_RESPONSE' && (error.status === 0 || error.status >= 500)) {
				await new Promise((resolve) => setTimeout(resolve, 250))
				continue
			}
			throw error
		}
	}
}

export async function ensureGuest(): Promise<string> {
	if (guest && guestExpiresAt > Date.now()) return guest
	guest = request('/guest-sessions', {}, true)
		.then((value) => {
			if (!isRecord(value) || typeof value.participantId !== 'string' || typeof value.expiresAt !== 'number') {
				throw new ApiError(502, { code: 'INVALID_RESPONSE', message: 'Не удалось создать гостевую сессию.' })
			}
			guestExpiresAt = value.expiresAt
			return value.participantId
		})
		.catch((error: unknown) => {
			guest = null
			throw error
		})
	guestExpiresAt = Number.POSITIVE_INFINITY
	return guest
}
