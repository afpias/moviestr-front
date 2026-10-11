<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { AlertCircle, Play } from '@lucide/vue'

import { ROUTE_NAMES } from '@app/router'
import { getCollections } from '@shared/api/collections.api'
import { useGameStore } from '@shared/stores/game.store'
import type { MovieCollectionSummary } from '@shared/types/game'
import { Alert, Button, Skeleton } from '@shared/ui'

const router = useRouter()
const gameStore = useGameStore()
const collections = ref<MovieCollectionSummary[]>([])
const errorMessage = ref<string | null>(null)
const isLoading = ref(true)

async function loadCollections(): Promise<void> {
	isLoading.value = true
	errorMessage.value = null

	try {
		collections.value = await getCollections()
	} catch {
		errorMessage.value = 'Не удалось загрузить подборки. Попробуйте ещё раз.'
	} finally {
		isLoading.value = false
	}
}

async function startCollection(collectionId: string): Promise<void> {
	const gameId = await gameStore.startGame(collectionId)

	if (gameId) {
		await router.push({ name: ROUTE_NAMES.game, params: { id: gameId } })
	}
}

async function resumeGame(): Promise<void> {
	if (gameStore.persistedGameId) {
		await router.push({ name: ROUTE_NAMES.game, params: { id: gameStore.persistedGameId } })
	}
}

onMounted(loadCollections)
</script>

<template>
	<section class="home-page">
		<div class="home-page__copy">
			<p class="eyebrow">Киноигра для внимательных</p>
			<h1>Узнай фильм.<br /><span>Кадр за кадром.</span></h1>
			<p class="home-page__lead">
				Шесть кадров, шесть попыток и максимум 600 очков. Чем раньше узнаешь фильм, тем выше результат.
			</p>

			<div class="home-page__actions">
				<Button
					v-if="collections[0]"
					:disabled="gameStore.status === 'loading'"
					size="large"
					type="button"
					@click="startCollection(collections[0].id)"
				>
					<Play :size="18" />
					{{ gameStore.status === 'loading' ? 'Создаём игру…' : 'Начать игру' }}
				</Button>
				<Button v-if="gameStore.persistedGameId" size="large" type="button" variant="outline" @click="resumeGame">
					Продолжить раунд
				</Button>
			</div>

			<Alert v-if="errorMessage || gameStore.lastError" class="home-page__alert" variant="destructive" role="alert">
				<template #icon><AlertCircle /></template>
				{{ errorMessage ?? gameStore.lastError }}
			</Alert>

			<div v-if="isLoading" class="collection-skeleton" aria-label="Загрузка подборки">
				<Skeleton class="h-5 w-44" />
				<Skeleton class="h-3.5 w-72 max-w-full" />
			</div>
			<div v-else-if="collections[0]" class="collection-meta">
				<span>{{ collections[0].title }}</span>
				<span>{{ collections[0].movieCount }} фильма в демо</span>
			</div>
			<div v-else-if="!errorMessage" class="home-page__empty">Подборки пока не добавлены.</div>
		</div>

		<div class="film-preview" aria-label="Пример последовательности кадров">
			<div class="film-preview__screen">
				<span class="film-preview__glow"></span>
				<span class="film-preview__planet"></span>
				<p>Сможешь узнать с первого кадра?</p>
			</div>
			<ol class="film-preview__steps" aria-label="Шесть попыток">
				<li v-for="step in 6" :key="step" :class="{ 'is-active': step === 1 }">{{ step }}</li>
			</ol>
		</div>
	</section>
</template>

<style scoped src="./HomePage.css"></style>
