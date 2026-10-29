<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { Copy, LogOut } from '@lucide/vue'

import { JoinLobbyForm } from '@features/join-lobby'
import { Button, Input } from '@shared/ui'
import { RoomConsole } from '@widgets/room-console'

import { useRoomPage } from '../model/useRoomPage'

const { store, roomId, inviteUrl, copied, join, leave, copyInvite } = useRoomPage()
</script>

<template>
	<section class="room-page">
		<header class="room-page__header">
			<div>
				<p class="eyebrow">Мультиплеер · Больше очков</p>
				<h1>{{ store.room?.settings.name ?? store.preview?.settings.name ?? 'Комната' }}</h1>
			</div>
			<Button v-if="store.me && store.room?.status !== 'closed'" variant="ghost" :disabled="store.busy" @click="leave">
				<LogOut :size="17" /><span>Выйти</span>
			</Button>
			<RouterLink v-else to="/lobby" class="room-page__back">К списку лобби</RouterLink>
		</header>
		<p v-if="store.error" class="room-page__error" role="alert">{{ store.error }}</p>
		<p v-if="store.sessionChanged" role="status">Гостевая сессия изменилась. Для участия войдите в комнату заново.</p>
		<p v-if="store.initializing" role="status">Подключаемся к комнате…</p>
		<p v-else-if="store.room && store.connection !== 'connected'" role="status">Восстанавливаем соединение с сервером…</p>
		<template v-if="store.room && store.me">
			<div v-if="store.room.status === 'waiting'" class="room-page__invite">
				<label for="room-link">Приглашение · код {{ roomId }}</label>
				<div>
					<Input id="room-link" :model-value="inviteUrl" readonly />
					<Button variant="secondary" @click="copyInvite">
						<Copy :size="16" /><span>{{ copied ? 'Скопировано' : 'Копировать' }}</span>
					</Button>
				</div>
				<p>Отправь приглашение друзьям. Для отдельного игрока нужен свой браузер или устройство.</p>
			</div>
			<RoomConsole />
		</template>
		<JoinLobbyForm
			v-else-if="store.preview?.status === 'waiting'"
			class="room-page__join"
			:room-id="roomId"
			:busy="store.busy || store.initializing"
			@join="join"
		/>
		<div v-else-if="!store.initializing && (store.notFound || !store.error)" class="room-page__empty">
			<h2>{{ store.room ? 'Комната недоступна для входа' : 'Комната не найдена' }}</h2>
			<p>
				{{ store.room ? 'Матч уже начался или лобби закрыто.' : 'Проверь код или подключение к серверу.' }}
			</p>
			<RouterLink to="/lobby">Вернуться в лобби</RouterLink>
		</div>
		<Button v-else-if="store.error && !store.initializing" @click="store.connect(roomId)">Повторить подключение</Button>
	</section>
</template>

<style scoped src="./RoomPage.css"></style>
