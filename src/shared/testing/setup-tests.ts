import { afterAll, afterEach, beforeAll } from 'vitest'

import { resetMockState } from '@shared/api/mock/data/sessions'
import { server } from '@shared/api/mock/server'

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

beforeAll(() => {
	server.listen({ onUnhandledFrame: 'error' })
})

afterEach(() => {
	server.resetHandlers()
	resetMockState()
	window.localStorage.clear()
	window.sessionStorage.clear()
})

afterAll(() => {
	server.close()
})
