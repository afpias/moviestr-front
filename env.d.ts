/// <reference types="vite/client" />

import 'vue-router'

interface ImportMetaEnv {
	readonly VITE_ENABLE_MOCKS?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}

declare module 'vue-router' {
	interface RouteMeta {
		title: string
	}
}
