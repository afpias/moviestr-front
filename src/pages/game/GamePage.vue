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

<style scoped>
.game-page {
	max-width: 980px;
	margin-inline: auto;
}

.game-loading {
	display: grid;
	gap: 1rem;
}

.game-header {
	display: flex;
	align-items: end;
	justify-content: space-between;
	gap: 2rem;
}

.game-header h1 {
	font-size: clamp(2rem, 6vw, 4rem);
	font-weight: 850;
	letter-spacing: -0.06em;
	line-height: 1;
}

.game-header > p {
	flex: 0 0 auto;
	color: var(--app-color-text-muted);
}

.game-header > p strong {
	color: var(--app-color-text);
	font-size: 1.6rem;
}

.attempts {
	margin: 1.75rem 0 1rem;
	padding: 0;
	display: grid;
	grid-template-columns: repeat(6, 1fr);
	list-style: none;
}

.attempts li {
	display: flex;
	align-items: center;
}

.attempts__dot {
	width: 2rem;
	aspect-ratio: 1;
	flex: 0 0 auto;
	display: grid;
	place-items: center;
	border: 1px solid var(--app-color-border);
	border-radius: 50%;
	background: var(--app-color-background);
	color: var(--app-color-text-muted);
	font-size: 0.75rem;
	font-weight: 800;
}

.attempts__line {
	width: 100%;
	height: 1px;
	background: var(--app-color-border);
}

.attempts .is-active .attempts__dot {
	border-color: var(--app-color-accent);
	background: var(--app-color-accent);
	color: var(--app-color-on-accent);
	box-shadow: 0 0 0 5px var(--app-color-accent-shadow);
}

.attempts .is-used .attempts__dot,
.attempts .is-used .attempts__line {
	border-color: color-mix(in srgb, var(--app-color-accent) 45%, transparent);
	background: color-mix(in srgb, var(--app-color-accent) 45%, transparent);
	color: var(--app-color-on-accent);
}

.movie-frame {
	position: relative;
	margin: 0;
	overflow: hidden;
	border: 1px solid var(--app-color-border);
	border-radius: var(--app-radius-large);
	background: #05060b;
	box-shadow: var(--app-shadow-large);
}

.movie-frame img {
	width: 100%;
	aspect-ratio: 16 / 9;
	display: block;
	object-fit: cover;
}

.movie-frame figcaption {
	position: absolute;
	right: 1rem;
	bottom: 1rem;
	padding: 0.45rem 0.7rem;
	border: 1px solid rgb(255 255 255 / 18%);
	border-radius: 999px;
	background: rgb(0 0 0 / 56%);
	color: #fff;
	font-size: 0.75rem;
	backdrop-filter: blur(10px);
}

.answer-form {
	margin-top: 1.25rem;
	padding: 1.25rem;
	border: 1px solid var(--app-color-border);
	border-radius: var(--app-radius-medium);
	background: var(--app-color-surface);
}

.answer-form > label {
	display: block;
	margin-bottom: 0.55rem;
	font-size: 0.82rem;
	font-weight: 750;
}

.answer-form__controls {
	display: grid;
	gap: 0.65rem;
}

.answer-form__hint {
	margin-top: 0.55rem;
	color: var(--app-color-text-muted);
	font-size: 0.78rem;
}

.suggestion-option {
	width: 100%;
	display: flex;
	justify-content: space-between;
	gap: 1rem;
}

.suggestion-option small {
	color: var(--app-color-text-muted);
}

.game-page > :deep(.p-message) {
	margin-top: 0.75rem;
}

.game-page__error-actions {
	margin-top: 1.75rem;
	display: flex;
	justify-content: center;
	flex-wrap: wrap;
	gap: 0.5rem;
}

.game-result {
	display: grid;
	gap: 1.5rem;
}

.game-result img {
	width: min(180px, 44vw);
	aspect-ratio: 5 / 7;
	border-radius: 1rem;
	object-fit: cover;
}

.game-result h2 {
	font-size: 2rem;
	font-weight: 850;
	letter-spacing: -0.04em;
}

.game-result div > p:not(.eyebrow) {
	color: var(--app-color-text-muted);
}

.game-result__message {
	margin-top: 1rem;
}

@media (min-width: 620px) {
	.answer-form__controls {
		grid-template-columns: minmax(0, 1fr) auto;
	}

	.game-result {
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
	}
}

@media (max-width: 500px) {
	.game-header {
		align-items: start;
	}

	.attempts__dot {
		width: 1.75rem;
	}
}
</style>
