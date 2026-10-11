<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { AlertCircle, Image, Play } from '@lucide/vue'

import { ROUTE_NAMES } from '@app/router'
import { DifficultySelector } from '@features/select-difficulty'
import { ApiError } from '@shared/api/api-error'
import { getCollections } from '@shared/api/collections.api'
import { useGameStore } from '@shared/stores/game.store'
import type { GameDifficulty, MovieCollectionSummary } from '@shared/types/game'
import { Alert, Button, Skeleton } from '@shared/ui'

const router = useRouter()
const gameStore = useGameStore()
const collections = ref<MovieCollectionSummary[]>([])
const errorMessage = ref<string | null>(null)
const isLoading = ref(true)
const selectedDifficulty = ref<GameDifficulty>('easy')

function getCollectionsError(error: unknown): string {
	if (error instanceof ApiError && error.code === 'SERVICE_NOT_CONFIGURED') {
		return 'Добавьте VITE_TMDB_READ_TOKEN в .env.local и перезапустите dev-сервер.'
	}

	if (error instanceof ApiError && error.code === 'UPSTREAM_ERROR') {
		return 'TMDB сейчас недоступен. Попробуйте ещё раз.'
	}

	return 'Не удалось загрузить подборки. Попробуйте ещё раз.'
}

async function loadCollections(): Promise<void> {
	isLoading.value = true
	errorMessage.value = null

	try {
		collections.value = await getCollections()
	} catch (error: unknown) {
		errorMessage.value = getCollectionsError(error)
	} finally {
		isLoading.value = false
	}
}

async function startCollection(collectionId: string): Promise<void> {
	const gameId = await gameStore.startGame(collectionId, selectedDifficulty.value)

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
		<header class="home-hero">
			<p class="eyebrow">Solo · image mode</p>
			<h1><span>Угадай</span> фильм</h1>
			<p>Шесть изображений, пять уровней сложности и никаких таймеров. Выбери режим и начни раунд.</p>
		</header>

		<div class="home-console">
			<div class="home-console__stage" aria-label="Превью игрового экрана">
				<div class="home-console__meta">
					<span><Image :size="15" /> Только изображения</span>
					<span>6 кадров</span>
				</div>
				<div class="home-console__focus">
					<span class="home-console__play"><Play :size="30" fill="currentColor" /></span>
					<p>Насколько хорошо ты знаешь кино?</p>
					<small>Фильм выбирается из выбранной части топа TMDB</small>
				</div>
				<div class="home-console__frames" aria-hidden="true">
					<span v-for="frame in 6" :key="frame" :class="{ 'is-active': frame === 1 }"></span>
				</div>
			</div>

			<aside class="home-setup" aria-label="Настройка раунда">
				<div>
					<p class="control-label">Подборка</p>
					<div v-if="isLoading" class="collection-skeleton" aria-label="Загрузка подборки">
						<Skeleton class="h-5 w-44" />
						<Skeleton class="h-3.5 w-52 max-w-full" />
					</div>
					<div v-else-if="collections[0]" class="collection-meta">
						<strong>{{ collections[0].title }}</strong>
						<span>{{ collections[0].movieCount }} фильмов</span>
					</div>
					<div v-else-if="!errorMessage" class="home-page__empty">Подборки пока не добавлены.</div>
				</div>

				<div>
					<p class="control-label">Сложность</p>
					<DifficultySelector v-model="selectedDifficulty" variant="list" />
				</div>

				<Alert v-if="errorMessage || gameStore.lastError" class="home-page__alert" variant="destructive" role="alert">
					<template #icon><AlertCircle /></template>
					{{ errorMessage ?? gameStore.lastError }}
				</Alert>

				<div class="home-page__actions">
					<Button
						v-if="collections[0]"
						:disabled="gameStore.status === 'loading'"
						size="large"
						type="button"
						@click="startCollection(collections[0].id)"
					>
						<Play :size="18" fill="currentColor" />
						{{ gameStore.status === 'loading' ? 'Создаём раунд…' : 'Начать игру' }}
					</Button>
					<Button v-if="gameStore.persistedGameId" type="button" variant="outline" @click="resumeGame"> Продолжить </Button>
				</div>
			</aside>
		</div>
	</section>
</template>

<style scoped src="./HomePage.css"></style>
