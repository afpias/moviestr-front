<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { AlertTriangle, Clapperboard, Image, RefreshCcw, RotateCcw } from '@lucide/vue'

import { ROUTE_NAMES } from '@app/router'
import { DifficultySelector } from '@features/select-difficulty'
import { searchMovies } from '@shared/api/movies.api'
import { getDifficultyOption } from '@shared/lib/game-difficulty'
import { useGameStore } from '@shared/stores/game.store'
import type { MovieSuggestion } from '@shared/types/game'
import { Alert, Button, Dialog, MovieCombobox, Skeleton } from '@shared/ui'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const { currentFrame, difficulty, lastError, result, status, totalFrames } = storeToRefs(gameStore)
const answer = ref<MovieSuggestion | string | null>(null)
const feedbackMessage = ref<string | null>(null)
const isSearching = ref(false)
const searchError = ref<string | null>(null)
const suggestions = ref<MovieSuggestion[]>([])
let latestSearchId = 0

const isFinished = computed(() => status.value === 'won' || status.value === 'lost')
const isSubmitting = computed(() => status.value === 'submitting')
const currentAttempt = computed(() => (currentFrame.value?.index ?? 0) + 1)
const difficultyLabel = computed(() => getDifficultyOption(difficulty.value).label)

function getGameId(): string | null {
	return typeof route.params.id === 'string' ? route.params.id : null
}

async function loadCurrentGame(): Promise<void> {
	const id = getGameId()

	if (!id) {
		await router.replace({ name: ROUTE_NAMES.notFound })
		return
	}

	await gameStore.loadGame(id)
}

async function completeSearch(query: string): Promise<void> {
	if (query.trim().length < 2) {
		suggestions.value = []
		searchError.value = null
		return
	}

	const searchId = ++latestSearchId
	isSearching.value = true
	searchError.value = null

	try {
		const results = await searchMovies(query)

		if (searchId === latestSearchId) {
			suggestions.value = results
		}
	} catch {
		if (searchId === latestSearchId) {
			suggestions.value = []
			searchError.value = 'Не удалось найти фильмы. Попробуйте ещё раз.'
		}
	} finally {
		if (searchId === latestSearchId) {
			isSearching.value = false
		}
	}
}

async function submitAnswer(): Promise<void> {
	const title = typeof answer.value === 'string' ? answer.value.trim() : answer.value?.title.trim()

	if (!title || isSubmitting.value) {
		return
	}

	feedbackMessage.value = null
	const isCorrect = await gameStore.submitGuess(title)

	if (isCorrect === false) {
		feedbackMessage.value = 'Не угадал — открываем следующий кадр.'
		answer.value = null
	}
}

async function returnHome(): Promise<void> {
	await router.push({ name: ROUTE_NAMES.home })
}

async function restartRound(): Promise<void> {
	const nextGameId = await gameStore.startGame('top-250', difficulty.value)

	if (nextGameId) {
		answer.value = null
		feedbackMessage.value = null
		suggestions.value = []
		await router.replace({ name: ROUTE_NAMES.game, params: { id: nextGameId } })
	}
}

watch(() => route.params.id, loadCurrentGame, { immediate: true })
</script>

<template>
	<section class="game-page">
		<div v-if="status === 'loading'" class="game-loading" aria-label="Загрузка игры">
			<Skeleton class="h-12 w-full rounded-xl" />
			<Skeleton class="aspect-video w-full rounded-[var(--app-radius-large)]" />
			<Skeleton class="h-12 w-full rounded-xl" />
		</div>

		<div v-else-if="status === 'error'" class="status-page">
			<div class="status-page__icon" aria-hidden="true"><AlertTriangle /></div>
			<p class="eyebrow">Ошибка загрузки</p>
			<h1>Кадр потерялся</h1>
			<p role="alert">{{ lastError }}</p>
			<div class="game-page__error-actions">
				<Button type="button" @click="loadCurrentGame"><RefreshCcw :size="17" /> Попробовать снова</Button>
				<Button type="button" variant="ghost" @click="returnHome">На главную</Button>
			</div>
		</div>

		<div v-else-if="currentFrame && (status === 'playing' || status === 'submitting')" class="game-console">
			<aside class="game-sidebar">
				<section>
					<p class="control-label">Подборка</p>
					<div class="game-sidebar__collection">
						<Clapperboard :size="17" />
						<div>
							<strong>Топ 250 TMDB</strong>
							<small>Все жанры</small>
						</div>
					</div>
				</section>

				<section>
					<p class="control-label">Сложность</p>
					<DifficultySelector :model-value="difficulty" readonly variant="list" />
				</section>

				<Button class="game-sidebar__restart" type="button" variant="ghost" @click="restartRound">
					<RefreshCcw :size="16" /> Перезапустить раунд
				</Button>
			</aside>

			<div class="game-stage">
				<header class="game-stage__header">
					<div>
						<p class="eyebrow">Solo · {{ difficultyLabel }}</p>
						<h1>Назови этот фильм</h1>
					</div>
					<DifficultySelector :model-value="difficulty" readonly variant="pills" />
				</header>

				<figure class="movie-frame">
					<img :key="currentFrame.url" :alt="currentFrame.alt" :src="currentFrame.url" />
					<figcaption><Image :size="14" /> Кадр {{ currentAttempt }} / {{ totalFrames }}</figcaption>
				</figure>

				<div class="frame-progress" aria-label="Прогресс изображений">
					<span
						v-for="frame in totalFrames"
						:key="frame"
						:class="{ 'is-active': frame === currentAttempt, 'is-used': frame < currentAttempt }"
					></span>
				</div>

				<form class="answer-form" @submit.prevent="submitAnswer">
					<label class="visually-hidden" for="movie-answer">Название фильма</label>
					<div class="answer-form__controls">
						<MovieCombobox
							v-model="answer"
							input-id="movie-answer"
							:suggestions="suggestions"
							:disabled="isSubmitting"
							:is-loading="isSearching"
							placeholder="Введи название фильма"
							@search="completeSearch"
						/>
						<Button :disabled="isSubmitting" type="submit">
							{{ isSubmitting ? 'Проверяем…' : 'Ответить' }}
						</Button>
					</div>
					<p class="answer-form__hint">Русское, английское или оригинальное название</p>
				</form>

				<Alert v-if="feedbackMessage" class="game-page__alert" variant="warning" role="status">
					<template #icon><AlertTriangle /></template>
					{{ feedbackMessage }}
				</Alert>
				<Alert v-if="searchError || lastError" class="game-page__alert" variant="destructive" role="alert">
					<template #icon><AlertTriangle /></template>
					{{ searchError ?? lastError }}
				</Alert>
			</div>

			<aside class="game-info" aria-label="Информация о раунде">
				<section>
					<p class="control-label">Раунд</p>
					<strong>{{ String(currentAttempt).padStart(2, '0') }}</strong>
					<span>/ {{ String(totalFrames).padStart(2, '0') }}</span>
				</section>
				<section>
					<p class="control-label">Формат</p>
					<p><Image :size="16" /> Изображения</p>
				</section>
				<section>
					<p class="control-label">Режим</p>
					<p>{{ difficultyLabel }}</p>
					<small>{{ getDifficultyOption(difficulty).startRank }}–{{ getDifficultyOption(difficulty).endRank }} место</small>
				</section>
			</aside>
		</div>

		<Dialog :open="isFinished" :closable="false" :title="status === 'won' ? 'Фильм угадан!' : 'Попытки закончились'">
			<div v-if="result" class="game-result">
				<img :alt="`Постер фильма «${result.title}»`" :src="result.posterUrl" />
				<div>
					<p class="eyebrow">{{ status === 'won' ? 'Фильм угадан' : 'Фильм раскрыт' }}</p>
					<h2>{{ result.title }}</h2>
					<p>{{ result.originalTitle }} · {{ result.releaseYear }}</p>
					<p class="game-result__message">
						{{ status === 'won' ? 'Отличный глаз! Попробуешь ещё один?' : 'Теперь ты точно узнаешь этот фильм.' }}
					</p>
				</div>
			</div>
			<template #footer>
				<Button type="button" variant="ghost" @click="returnHome">Выбрать режим</Button>
				<Button type="button" @click="restartRound"><RotateCcw :size="17" /> Новый раунд</Button>
			</template>
		</Dialog>
	</section>
</template>

<style scoped src="./GamePage.css"></style>
