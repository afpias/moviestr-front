<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

import { Clapperboard, Moon, Sun } from '@lucide/vue'

import { useThemeStore } from '@shared/stores/theme.store'
import { Button } from '@shared/ui'

const themeStore = useThemeStore()
</script>

<template>
	<div class="app-shell">
		<header class="app-header">
			<RouterLink aria-label="Moviestr — на главную" class="brand" to="/">
				<span class="brand__mark" aria-hidden="true"><Clapperboard :size="17" /></span>
				<span>MOVIE<strong>STR</strong></span>
			</RouterLink>

			<nav aria-label="Основная навигация" class="app-nav">
				<RouterLink to="/">Соло</RouterLink>
				<RouterLink to="/lobby">Мультиплеер</RouterLink>
			</nav>

			<Button
				:aria-label="themeStore.theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'"
				size="icon"
				type="button"
				variant="ghost"
				@click="themeStore.toggleTheme"
			>
				<Sun v-if="themeStore.theme === 'dark'" :size="19" />
				<Moon v-else :size="19" />
			</Button>
		</header>

		<main id="main-content" class="app-main">
			<RouterView />
		</main>
	</div>
</template>

<style scoped src="./App.css"></style>
