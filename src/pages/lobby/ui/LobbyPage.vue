<script setup lang="ts">
import { CreateLobbyForm } from '@features/create-lobby'
import { JoinLobbyForm } from '@features/join-lobby'
import { DifficultySelector } from '@features/select-difficulty'
import { GenreSelector } from '@features/select-genre'
import { LobbyBrowser } from '@widgets/lobby-browser'

import { useLobbyPage } from '../model/useLobbyPage'

const { store, create, join, openRoom } = useLobbyPage()
</script>

<template>
	<section class="lobby-page">
		<header class="lobby-page__header">
			<p class="eyebrow">Мультиплеер</p>
			<h1>Кино в компании</h1>
			<p>Одинаковые фильмы. Свои догадки. Побеждает тот, у кого больше очков.</p>
		</header>
		<p v-if="store.initializing || store.connection !== 'connected'" role="status">
			{{ store.initializing ? 'Загружаем комнаты…' : 'Подключаемся к серверу…' }}
		</p>
		<p v-if="store.error" class="lobby-page__error" role="alert">{{ store.error }}</p>
		<div class="lobby-page__layout">
			<div class="lobby-page__browse">
				<LobbyBrowser :rooms="store.rooms" @join="openRoom" />
				<JoinLobbyForm :busy="store.busy || store.initializing" @join="join" />
			</div>
			<CreateLobbyForm :busy="store.busy || store.initializing" @create="create">
				<template #settings="{ settings, busy }">
					<div class="lobby-page__field">
						<p>Сложность</p>
						<DifficultySelector v-model="settings.difficulty" :readonly="busy" />
					</div>
					<div class="lobby-page__field">
						<p>Жанр</p>
						<GenreSelector v-model="settings.genre" :disabled="busy" />
					</div>
				</template>
			</CreateLobbyForm>
		</div>
	</section>
</template>

<style scoped src="./LobbyPage.css"></style>
