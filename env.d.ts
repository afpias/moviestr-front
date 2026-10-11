/// <reference types="vite/client" />

import 'vue-router'

interface ImportMetaEnv {
	readonly VITE_ENABLE_MOCKS?: string
	readonly VITE_TMDB_READ_TOKEN?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}

declare module 'vue-router' {
	interface RouteMeta {
		title: string
	}
}
