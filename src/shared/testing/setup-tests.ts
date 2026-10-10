import { afterAll, afterEach, beforeAll } from 'vitest'

import { server } from '@shared/api/mock/server'

beforeAll(() => {
	server.listen({ onUnhandledFrame: 'error' })
})

afterEach(() => {
	server.resetHandlers()
})

afterAll(() => {
	server.close()
})
