<script setup lang="ts">
import { Users } from '@lucide/vue'

import { LobbyCard } from '@entities/lobby'
import type { LobbySummary } from '@shared/types/multiplayer'

defineProps<{ rooms: LobbySummary[] }>()
const emit = defineEmits<{ join: [roomId: string] }>()
</script>

<template>
	<section class="lobby-browser">
		<div class="lobby-browser__heading">
			<h2>Публичные комнаты</h2>
			<span>{{ rooms.length }}</span>
		</div>
		<div v-if="rooms.length === 0" class="lobby-browser__empty">
			<Users :size="32" aria-hidden="true" />
			<h3>Пока тихо</h3>
			<p>Создай первое лобби и пригласи компанию.</p>
		</div>
		<div v-else class="lobby-browser__list">
			<LobbyCard v-for="lobby in rooms" :key="lobby.id" :lobby="lobby" @join="emit('join', $event)" />
		</div>
	</section>
</template>

<style scoped src="./LobbyBrowser.css"></style>
