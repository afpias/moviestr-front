import { env } from 'node:process'

import { handleTmdbRequest } from '../server/tmdb-proxy'

export default {
	fetch(request: Request): Promise<Response> {
		return handleTmdbRequest(request, env.TMDB_READ_TOKEN)
	}
}
