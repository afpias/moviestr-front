<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { AlertTriangle, RefreshCcw, RotateCcw } from '@lucide/vue'

import { ROUTE_NAMES } from '@app/router'
import { searchMovies } from '@shared/api/movies.api'
import { useGameStore } from '@shared/stores/game.store'
import type { MovieSuggestion } from '@shared/types/game'
import { Alert, Button, Dialog, MovieCombobox, Skeleton } from '@shared/ui'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const { currentFrame, lastError, points, result, status, totalFrames } = storeToRefs(gameStore)
const answer = ref<MovieSuggestion | string | null>(null)
const feedbackMessage = ref<string | null>(null)
const isSearching = ref(false)
const searchError = ref<string | null>(null)
const suggestions = ref<MovieSuggestion[]>([])
let latestSearchId = 0

const isFinished = computed(() => status.value === 'won' || status.value === 'lost')
const isSubmitting = computed(() => status.value === 'submitting')
const currentAttempt = computed(() => (currentFrame.value?.index ?? 0) + 1)

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

watch(() => route.params.id, loadCurrentGame, { immediate: true })
</script>

<template>
	<section class="game-page">
		<div v-if="status === 'loading'" class="game-loading" aria-label="Загрузка игры">
			<Skeleton class="h-4 w-40" />
			<Skeleton class="aspect-video w-full rounded-[var(--app-radius-large)]" />
			<Skeleton class="h-13 w-full rounded-[calc(var(--radius)*0.8)]" />
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

		<template v-else-if="currentFrame && (status === 'playing' || status === 'submitting')">
			<header class="game-header">
				<div>
					<p class="eyebrow">Топ 250 · случайный фильм</p>
					<h1>Что это за фильм?</h1>
				</div>
				<p>
					<strong>{{ currentAttempt }}</strong> / {{ totalFrames }}
				</p>
			</header>

			<ol class="attempts" aria-label="Прогресс попыток">
				<li
					v-for="attempt in totalFrames"
					:key="attempt"
					:class="{
						'is-active': attempt === currentAttempt,
						'is-used': attempt < currentAttempt
					}"
				>
					<span class="attempts__dot">{{ attempt }}</span>
					<span v-if="attempt < totalFrames" class="attempts__line"></span>
				</li>
			</ol>

			<figure class="movie-frame">
				<img :key="currentFrame.url" :alt="currentFrame.alt" :src="currentFrame.url" />
				<figcaption>Кадр {{ currentAttempt }} из {{ totalFrames }}</figcaption>
			</figure>

			<form class="answer-form" @submit.prevent="submitAnswer">
				<label for="movie-answer">Название фильма</label>
				<div class="answer-form__controls">
					<MovieCombobox
						v-model="answer"
						input-id="movie-answer"
						:suggestions="suggestions"
						:disabled="isSubmitting"
						:is-loading="isSearching"
						placeholder="Например, Интерстеллар"
						@search="completeSearch"
					/>
					<Button :disabled="isSubmitting" type="submit">
						{{ isSubmitting ? 'Проверяем…' : 'Ответить' }}
					</Button>
				</div>
				<p class="answer-form__hint">Можно ввести русское или оригинальное название</p>
			</form>

			<Alert v-if="feedbackMessage" class="game-page__alert" variant="warning" role="status">
				<template #icon><AlertTriangle /></template>
				{{ feedbackMessage }}
			</Alert>
			<Alert v-if="searchError || lastError" class="game-page__alert" variant="destructive" role="alert">
				<template #icon><AlertTriangle /></template>
				{{ searchError ?? lastError }}
			</Alert>
		</template>

		<Dialog :open="isFinished" :closable="false" :title="status === 'won' ? 'Фильм угадан!' : 'Попытки закончились'">
			<div v-if="result" class="game-result">
				<img :alt="`Постер фильма «${result.title}»`" :src="result.posterUrl" />
				<div>
					<p class="eyebrow">{{ status === 'won' ? `+${points} очков` : '0 очков' }}</p>
					<h2>{{ result.title }}</h2>
					<p>{{ result.originalTitle }} · {{ result.releaseYear }}</p>
					<p class="game-result__message">
						{{ status === 'won' ? 'Отличный глаз! Попробуешь ещё один?' : 'Теперь ты точно узнаешь этот фильм.' }}
					</p>
				</div>
			</div>
			<template #footer>
				<Button type="button" @click="returnHome"><RotateCcw :size="17" /> Сыграть ещё</Button>
			</template>
		</Dialog>
	</section>
</template>

<style scoped src="./GamePage.css"></style>
