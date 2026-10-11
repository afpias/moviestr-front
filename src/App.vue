<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

import { Clapperboard, Moon, Sun } from '@lucide/vue'

import { useThemeStore } from '@shared/stores/theme.store'
import { Button } from '@shared/ui'

const themeStore = useThemeStore()
</script>

<template>
	<a class="skip-link" href="#main-content">Перейти к содержимому</a>

	<div class="app-shell">
		<header class="app-header">
			<RouterLink aria-label="Moviestr — на главную" class="brand" to="/">
				<span class="brand__mark" aria-hidden="true"><Clapperboard :size="17" /></span>
				<span>MOVIE<strong>STR</strong></span>
			</RouterLink>

			<nav aria-label="Основная навигация" class="app-nav">
				<RouterLink to="/">Соло</RouterLink>
				<RouterLink to="/rules">Правила</RouterLink>
				<span class="app-nav__soon">Мультиплеер · скоро</span>
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

		<footer class="app-footer">
			<div>
				<p>Moviestr · solo image mode</p>
				<p class="app-footer__attribution">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
			</div>
			<div class="app-footer__links">
				<a class="tmdb-link" href="https://www.themoviedb.org" rel="noreferrer" target="_blank">
					<img
						alt="The Movie Database"
						src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_1-5bdc75aaebeb75dc7ae79426ddd9be3b2be1e342510f8202baf6bffa71d7f5c4.svg"
					/>
				</a>
				<RouterLink to="/rules">Как играть</RouterLink>
			</div>
		</footer>
	</div>
</template>

<style scoped src="./App.css"></style>
