import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

import { handleTmdbRequest } from './tmdb-proxy.ts'

export function tmdbProxyPlugin(token: string | undefined): Plugin {
	const middleware = (request: IncomingMessage, response: ServerResponse, next: () => void): void => {
		const url = new URL(request.url ?? '/', 'http://localhost')
		if (url.pathname !== '/api/tmdb' && !url.pathname.startsWith('/api/tmdb/')) {
			next()
			return
		}
		void handleTmdbRequest(new Request(url, { method: request.method }), token)
			.then(async (result) => {
				response.statusCode = result.status
				result.headers.forEach((value, name) => response.setHeader(name, value))
				response.end(new Uint8Array(await result.arrayBuffer()))
			})
			.catch(() => {
				response.statusCode = 502
				response.end('{"code":"UPSTREAM_ERROR"}')
			})
	}
	return {
		name: 'moviestr-tmdb-proxy',
		configureServer(server) {
			server.middlewares.use(middleware)
		},
		configurePreviewServer(server) {
			server.middlewares.use(middleware)
		}
	}
}
