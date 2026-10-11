<script setup lang="ts">
import { storeToRefs } from 'pinia'
import AutoComplete from 'primevue/autocomplete'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@app/router'
import { searchMovies } from '@shared/api/movies.api'
import { useGameStore } from '@shared/stores/game.store'
import type { MovieSuggestion } from '@shared/types/game'

interface CompleteEvent {
	query: string
}

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const { currentFrame, lastError, points, result, status, totalFrames } = storeToRefs(gameStore)
const answer = ref<MovieSuggestion | string | null>(null)
const feedbackMessage = ref<string | null>(null)
const suggestions = ref<MovieSuggestion[]>([])

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

async function completeSearch(event: CompleteEvent): Promise<void> {
	if (event.query.trim().length < 2) {
		suggestions.value = []
		return
	}

	try {
		suggestions.value = await searchMovies(event.query)
	} catch {
		suggestions.value = []
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
			<Skeleton width="10rem" height="1rem" />
			<Skeleton width="100%" height="min(58vw, 620px)" border-radius="1.5rem" />
			<Skeleton width="100%" height="3.25rem" border-radius="0.8rem" />
		</div>

		<div v-else-if="status === 'error'" class="status-page">
			<div class="status-page__icon" aria-hidden="true"><i class="pi pi-exclamation-triangle"></i></div>
			<p class="eyebrow">Ошибка загрузки</p>
			<h1>Кадр потерялся</h1>
			<p role="alert">{{ lastError }}</p>
			<div class="game-page__error-actions">
				<Button label="Попробовать снова" icon="pi pi-refresh" @click="loadCurrentGame" />
				<Button label="На главную" severity="secondary" text @click="returnHome" />
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
					<AutoComplete
						v-model="answer"
						input-id="movie-answer"
						:suggestions="suggestions"
						:disabled="isSubmitting"
						:min-length="2"
						option-label="title"
						placeholder="Например, Интерстеллар"
						fluid
						@complete="completeSearch"
					>
						<template #option="slotProps">
							<div class="suggestion-option">
								<span>{{ slotProps.option.title }}</span>
								<small>{{ slotProps.option.releaseYear }}</small>
							</div>
						</template>
					</AutoComplete>
					<Button :disabled="isSubmitting" :loading="isSubmitting" label="Ответить" type="submit" />
				</div>
				<p class="answer-form__hint">Можно ввести русское или оригинальное название</p>
			</form>

			<Message v-if="feedbackMessage" severity="warn" :closable="false" role="status">
				{{ feedbackMessage }}
			</Message>
			<Message v-if="lastError" severity="error" :closable="false" role="alert">
				{{ lastError }}
			</Message>
		</template>

		<Dialog
			:visible="isFinished"
			:closable="false"
			:draggable="false"
			:header="status === 'won' ? 'Фильм угадан!' : 'Попытки закончились'"
			modal
			class="result-dialog"
		>
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
				<Button label="Сыграть ещё" icon="pi pi-replay" @click="returnHome" />
			</template>
		</Dialog>
	</section>
</template>

<style scoped src="./GamePage.css"></style>
