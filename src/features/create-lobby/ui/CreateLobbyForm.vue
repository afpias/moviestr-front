<script setup lang="ts">
import type { LobbySettings } from '@shared/types/multiplayer'
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui'

import { useCreateLobby } from '../model/useCreateLobby'

defineProps<{ busy: boolean }>()
const emit = defineEmits<{ create: [settings: LobbySettings, nickname: string, password: string] }>()
const { nickname, password, settings } = useCreateLobby()

function setCapacity(value: unknown): void {
	const capacity = Number(value)
	if (Number.isInteger(capacity) && capacity >= 2 && capacity <= 4) {
		settings.capacity = capacity
	}
}

function setVisibility(value: unknown): void {
	if (value === 'public' || value === 'private') {
		settings.visibility = value
	}
}
</script>

<template>
	<form class="create-lobby" @submit.prevent="emit('create', { ...settings }, nickname, password)">
		<div class="create-lobby__heading">
			<p class="eyebrow">Твоя компания</p>
			<h2>Создать лобби</h2>
		</div>
		<label for="host-nickname">Твой никнейм</label>
		<Input
			id="host-nickname"
			v-model="nickname"
			required
			minlength="2"
			maxlength="24"
			autocomplete="nickname"
			placeholder="Как тебя зовут?"
		/>
		<label for="lobby-name">Название комнаты</label>
		<Input id="lobby-name" v-model="settings.name" required minlength="2" maxlength="60" placeholder="Вечер кино" />
		<div class="create-lobby__row">
			<div>
				<label for="lobby-capacity">Участники</label>
				<Select :model-value="String(settings.capacity)" @update:model-value="setCapacity">
					<SelectTrigger id="lobby-capacity"><SelectValue /></SelectTrigger>
					<SelectContent>
						<SelectItem v-for="capacity in [2, 3, 4]" :key="capacity" :value="String(capacity)">
							<span>{{ capacity }} игрока</span>
						</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div>
				<label for="film-count">Фильмы</label>
				<Input id="film-count" v-model="settings.filmCount" type="number" min="1" max="50" step="1" required />
			</div>
		</div>
		<label for="lobby-visibility">Доступ</label>
		<Select :model-value="settings.visibility" @update:model-value="setVisibility">
			<SelectTrigger id="lobby-visibility"><SelectValue /></SelectTrigger>
			<SelectContent>
				<SelectItem value="public">Публичное лобби</SelectItem>
				<SelectItem value="private">Только по коду или ссылке</SelectItem>
			</SelectContent>
		</Select>
		<label for="lobby-password">Пароль <span>необязательно</span></label>
		<Input
			id="lobby-password"
			v-model="password"
			type="password"
			maxlength="64"
			autocomplete="new-password"
			placeholder="Без пароля"
		/>
		<slot name="settings" :settings="settings" :busy="busy" />
		<p class="create-lobby__rules">Больше очков · 1000 на старте · +100 / −50 · 90 секунд на фильм</p>
		<Button type="submit" :disabled="busy">{{ busy ? 'Создаём…' : 'Создать комнату' }}</Button>
	</form>
</template>

<style scoped src="./CreateLobbyForm.css"></style>
