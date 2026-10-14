<script setup lang="ts">
import { ref } from 'vue'

import { Button, Input } from '@shared/ui'

defineProps<{ busy: boolean; roomId?: string }>()
const emit = defineEmits<{ join: [roomId: string, nickname: string, password: string] }>()
const code = ref('')
const nickname = ref('')
const password = ref('')
</script>

<template>
	<form class="join-lobby" @submit.prevent="emit('join', roomId ?? code, nickname, password)">
		<h2>Присоединиться</h2>
		<template v-if="!roomId">
			<label for="join-code">Код комнаты</label>
			<Input id="join-code" v-model="code" required maxlength="32" autocomplete="off" placeholder="Вставь код лобби" />
		</template>
		<label for="guest-nickname">Твой никнейм</label>
		<Input
			id="guest-nickname"
			v-model="nickname"
			required
			minlength="2"
			maxlength="24"
			autocomplete="nickname"
			placeholder="Как тебя зовут?"
		/>
		<label for="join-password">Пароль <span>если нужен</span></label>
		<Input
			id="join-password"
			v-model="password"
			type="password"
			maxlength="64"
			autocomplete="current-password"
			placeholder="Пароль комнаты"
		/>
		<Button :disabled="busy" type="submit">{{ busy ? 'Подключаемся…' : 'Войти в комнату' }}</Button>
	</form>
</template>

<style scoped src="./JoinLobbyForm.css"></style>
