import { afterEach, vi } from 'vitest'

import { fetchTmdbFixture } from './tmdb-fixture'

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
	configurable: true,
	value: () => undefined
})
Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
	configurable: true,
	value: () => false
})
Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
	configurable: true,
	value: () => undefined
})
Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
	configurable: true,
	value: () => undefined
})

vi.stubEnv('VITE_TMDB_READ_TOKEN', 'test-token')
vi.stubGlobal('fetch', vi.fn(fetchTmdbFixture))

afterEach(() => {
	window.localStorage.clear()
	window.sessionStorage.clear()
})
