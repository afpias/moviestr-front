<script setup lang="ts">
import { computed } from 'vue'

import { CheckCircle2, Clock, LoaderCircle, SkipForward, Trophy } from '@lucide/vue'

import { MovieFrame } from '@entities/movie-frame'
import { RoomPlayers } from '@entities/room-player'
import { retryRoom, startRoom } from '@features/manage-room'
import { MovieCombobox } from '@features/search-movie'
import { RoundResult } from '@features/show-round-result'
import { getDifficultyOption } from '@shared/lib/game-difficulty'
import { getGameGenreOption } from '@shared/lib/game-genres'
import { Button } from '@shared/ui'

import { useRoomConsole } from '../model/useRoomConsole'

const { store, answer, completeSearch, isSearching, suggestions, canAnswer, actionLabel, submit, canContinue, continueRound } =
	useRoomConsole()
const room = computed(() => store.room)
const canStart = computed(() => (room.value?.players.filter((player) => player.connected).length ?? 0) >= 2)
const winnerNames = computed(() =>
	room.value?.players
		.filter((player) => room.value?.winnerIds.includes(player.id))
		.map((player) => player.nickname)
		.join(', ')
)
</script>

<template>
	<div v-if="room" class="room-console">
		<RoomPlayers
			:players="room.players"
			:host-id="room.hostId"
			:participant-id="store.participantId"
			:winner-ids="room.winnerIds"
			:finished="room.status === 'finished'"
			:waiting="room.status === 'waiting'"
			:round-result="room.roundResult"
		/>
		<section class="room-console__stage" aria-label="Игра">
			<template v-if="room.status === 'waiting'">
				<div class="room-console__welcome">
					<p class="eyebrow">Больше очков</p>
					<h2>Готовы к кино?</h2>
					<p>
						Фильмы: {{ room.settings.filmCount }} · {{ getDifficultyOption(room.settings.difficulty).label }} ·
						{{ getGameGenreOption(room.settings.genre).label }}
					</p>
					<div class="room-console__rules">
						<span><strong>1000</strong><span>на старте</span></span>
						<span><strong>+100 / −50</strong><span>за ответ</span></span>
						<span><strong>90 сек.</strong><span>на фильм</span></span>
					</div>
					<Button
						v-if="store.isHost"
						:disabled="store.busy || !canStart || store.connection !== 'connected'"
						@click="startRoom(room.id)"
					>
						Начать игру
					</Button>
					<p v-if="!canStart">Для старта нужен ещё один участник.</p>
					<p v-else-if="!store.isHost">Хост начнёт игру, когда компания будет готова.</p>
				</div>
			</template>
			<div v-else-if="room.status === 'loading'" class="room-console__state" role="status">
				<LoaderCircle :size="32" aria-hidden="true" />
				<h2>Готовим фильм {{ room.roundNumber }} из {{ room.settings.filmCount }}</h2>
				<p>Кадры будут одинаковыми для всей компании.</p>
			</div>
			<div v-else-if="room.status === 'error'" class="room-console__state">
				<h2>Фильм не загрузился</h2>
				<p role="alert">{{ room.error }}</p>
				<Button v-if="store.isHost" :disabled="store.busy" @click="retryRoom(room.id)">Повторить загрузку</Button>
				<p v-else>Хост может повторить загрузку.</p>
			</div>
			<div v-else-if="room.status === 'round-result' && room.result && room.roundResult" class="room-console__result">
				<div class="room-console__toolbar">
					<span
						>Фильм <strong>{{ room.roundNumber }} / {{ room.settings.filmCount }}</strong></span
					>
					<span v-if="room.roundResult.isLastRound">Последний фильм</span>
				</div>
				<RoundResult
					:result="room.result"
					:status="room.roundResult.outcome"
					action="continue"
					:action-disabled="!canContinue"
					@continue="continueRound"
				/>
				<div class="room-console__readiness" role="status" aria-live="polite">
					<p>Готовы: {{ room.roundResult.readyPlayerIds.length }} / {{ room.roundResult.requiredPlayerIds.length }}</p>
					<p>
						{{
							room.roundResult.isReady
								? 'Ждём остальных участников.'
								: room.roundResult.canContinue
									? 'Нажми «Далее», когда будешь готов.'
									: 'Ждём готовности участников.'
						}}
					</p>
				</div>
			</div>
			<div v-else-if="room.status === 'finished'" class="room-console__state">
				<Trophy :size="48" aria-hidden="true" />
				<p class="eyebrow">{{ room.winnerIds.length > 1 ? 'Ничья' : 'Победитель' }}</p>
				<h2>{{ winnerNames }}</h2>
				<p>Фильмов пройдено: {{ room.settings.filmCount }}. Итоговые очки — в таблице участников.</p>
			</div>
			<div v-else-if="room.status === 'closed'" class="room-console__state">
				<h2>Комната закрыта</h2>
				<p>Вернись в список лобби, чтобы начать новую игру.</p>
			</div>
			<template v-else-if="room.status === 'playing'">
				<div class="room-console__toolbar">
					<span
						>Фильм <strong>{{ room.roundNumber }} / {{ room.settings.filmCount }}</strong></span
					>
					<span class="room-console__timer"><Clock :size="16" aria-hidden="true" /> {{ store.remainingSeconds }} сек.</span>
				</div>
				<template v-if="canAnswer && room.currentFrame">
					<MovieFrame :frame="room.currentFrame" />
					<div class="room-console__progress" :aria-label="`Кадр ${room.currentFrame.index + 1} из 5`">
						<span v-for="index in 5" :key="index" :class="{ 'is-active': index <= room.currentFrame.index + 1 }"></span>
					</div>
					<form class="room-console__answer" @submit.prevent="submit">
						<label class="room-console__label" for="room-answer">Название фильма</label>
						<MovieCombobox
							v-model="answer"
							input-id="room-answer"
							:suggestions="suggestions"
							:attempted-movie-ids="room.attemptedMovieIds"
							:disabled="store.busy"
							:is-loading="isSearching"
							placeholder="Найди фильм по названию"
							@search="completeSearch"
						/>
						<Button type="submit" :disabled="store.busy">
							<SkipForward v-if="actionLabel !== 'Угадать'" :size="17" />
							<CheckCircle2 v-else :size="17" />
							<span>{{ actionLabel }}</span>
						</Button>
					</form>
				</template>
				<div v-else class="room-console__state" role="status">
					<CheckCircle2 v-if="store.me?.status === 'won'" :size="40" aria-hidden="true" />
					<h2>{{ store.me?.status === 'won' ? 'Угадано! +100' : 'Фильм завершён' }}</h2>
					<p>Ждём остальных. Правильный ответ появится после завершения фильма всеми.</p>
				</div>
			</template>
		</section>
	</div>
</template>

<style scoped src="./RoomConsole.css"></style>
