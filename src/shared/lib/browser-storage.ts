export function readStorage<T>(key: string, isValid: (value: unknown) => value is T): T | null {
	const rawValue = window.localStorage.getItem(key)

	if (rawValue === null) {
		return null
	}

	try {
		const value: unknown = JSON.parse(rawValue)

		if (isValid(value)) {
			return value
		}
	} catch {
		window.localStorage.removeItem(key)
		return null
	}

	window.localStorage.removeItem(key)
	return null
}

export function writeStorage<T>(key: string, value: T): void {
	window.localStorage.setItem(key, JSON.stringify(value))
}
