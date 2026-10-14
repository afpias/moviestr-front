<script setup lang="ts">
import { LockKeyhole, Users } from '@lucide/vue'

import { getDifficultyOption } from '@shared/lib/game-difficulty'
import { getGameGenreOption } from '@shared/lib/game-genres'
import type { LobbySummary } from '@shared/types/multiplayer'
import { Button } from '@shared/ui'

defineProps<{ lobby: LobbySummary }>()
const emit = defineEmits<{ join: [roomId: string] }>()
</script>

<template>
	<article class="lobby-card">
		<div class="lobby-card__title">
			<h3>{{ lobby.settings.name }}</h3>
			<LockKeyhole v-if="lobby.hasPassword" :size="16" aria-label="Вход по паролю" />
		</div>
		<p>
			{{ getDifficultyOption(lobby.settings.difficulty).label }} · {{ getGameGenreOption(lobby.settings.genre).label }} · Фильмы:
			{{ lobby.settings.filmCount }}
		</p>
		<div class="lobby-card__footer">
			<span><Users :size="16" aria-hidden="true" /> {{ lobby.playerCount }} / {{ lobby.settings.capacity }}</span>
			<Button :disabled="lobby.playerCount >= lobby.settings.capacity" variant="secondary" @click="emit('join', lobby.id)">
				{{ lobby.playerCount >= lobby.settings.capacity ? 'Нет мест' : 'Присоединиться' }}
			</Button>
		</div>
	</article>
</template>

<style scoped src="./LobbyCard.css"></style>
