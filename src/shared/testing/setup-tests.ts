import { afterAll, afterEach, beforeAll } from 'vitest'

import { resetMockState } from '@shared/api/mock/data/sessions'
import { server } from '@shared/api/mock/server'

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
