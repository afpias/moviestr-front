<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { cn } from '@shared/lib/utils'

interface SkeletonProps {
	class?: HTMLAttributes['class']
}

const props = defineProps<SkeletonProps>()
</script>

<template>
	<div :class="cn('animate-pulse rounded-md bg-[hsl(var(--muted))]', props.class)" />
</template>
