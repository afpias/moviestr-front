export function readStorage<T>(key: string, isValid: (value: unknown) => value is T): T | null {
	try {
		const rawValue = window.localStorage.getItem(key)
		if (rawValue === null) return null
		const value: unknown = JSON.parse(rawValue)

		if (isValid(value)) {
			return value
		}
	} catch {
		removeStorage(key)
		return null
	}

	removeStorage(key)
	return null
}

export function writeStorage<T>(key: string, value: T): void {
	try {
		window.localStorage.setItem(key, JSON.stringify(value))
	} catch {
		/* Persistence is optional. */
	}
}

export function removeStorage(key: string, area: 'local' | 'session' = 'local'): void {
	try {
		window[area === 'local' ? 'localStorage' : 'sessionStorage'].removeItem(key)
	} catch {
		/* Storage may be denied. */
	}
}
