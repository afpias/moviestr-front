<script setup lang="ts">
import { computed } from 'vue'

import { Crown, Trophy } from '@lucide/vue'

import type { RoomPlayer } from '@shared/types/multiplayer'

const props = defineProps<{
	players: RoomPlayer[]
	hostId: string
	participantId: string
	winnerIds: string[]
	finished: boolean
	waiting: boolean
}>()
const rankedPlayers = computed(() =>
	props.finished ? [...props.players].sort((first, second) => second.score - first.score) : props.players
)

function playerLabel(player: RoomPlayer): string {
	if (player.left) {
		return 'Вышел'
	}
	if (!player.connected) {
		return 'Нет соединения'
	}
	if (props.finished) {
		return props.winnerIds.includes(player.id) ? 'Победитель' : 'Матч завершён'
	}
	if (props.waiting) {
		return 'В комнате'
	}
	if (player.status === 'won') {
		return 'Угадал · +100'
	}
	if (player.status === 'lost') {
		return 'Не угадал'
	}
	return player.lastAnswer === 'incorrect' ? 'Ошибка · −50 · пробует ещё' : 'Думает'
}
</script>

<template>
	<section class="room-players" aria-label="Участники и очки">
		<div class="room-players__heading">
			<h2>{{ finished ? 'Итоговый рейтинг' : 'Участники' }}</h2>
			<span>Игроки: {{ players.length }}</span>
		</div>
		<ul>
			<li
				v-for="player in rankedPlayers"
				:key="player.id"
				:class="{ 'is-me': player.id === participantId, 'is-winner': winnerIds.includes(player.id) }"
			>
				<span class="room-players__avatar" aria-hidden="true">{{ player.nickname.slice(0, 1).toLocaleUpperCase('ru-RU') }}</span>
				<div class="room-players__name">
					<strong>{{ player.nickname }} <span v-if="player.id === participantId">(ты)</span></strong>
					<p>{{ playerLabel(player) }}</p>
				</div>
				<Crown v-if="player.id === hostId && !finished" :size="15" aria-label="Хост" />
				<Trophy v-if="winnerIds.includes(player.id)" :size="18" aria-label="Победитель" />
				<strong class="room-players__score">{{ player.score }}</strong>
			</li>
		</ul>
	</section>
</template>

<style scoped src="./RoomPlayers.css"></style>
