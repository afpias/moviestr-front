import { cwd } from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

import { tmdbProxyPlugin } from './server/vite-tmdb-plugin.ts'

export default defineConfig(({ mode }) => ({
	plugins: [vue(), vueJsx(), tailwindcss(), vueDevTools(), tmdbProxyPlugin(loadEnv(mode, cwd(), 'TMDB_').TMDB_READ_TOKEN)],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
			'@app': fileURLToPath(new URL('./src/app', import.meta.url)),
			'@assets': fileURLToPath(new URL('./src/shared/assets', import.meta.url)),
			'@entities': fileURLToPath(new URL('./src/entities', import.meta.url)),
			'@features': fileURLToPath(new URL('./src/features', import.meta.url)),
			'@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
			'@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
			'@widgets': fileURLToPath(new URL('./src/widgets', import.meta.url))
		}
	}
}))
