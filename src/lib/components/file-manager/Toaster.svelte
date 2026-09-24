<script lang="ts">
	import { toastStore } from '$lib/stores/toast.svelte';
	import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from '@lucide/svelte';
</script>

<div
	class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none"
	aria-live="polite"
>
	{#each toastStore.toasts as toast (toast.id)}
		<div
			class="pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-lg backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-3
			{toast.type === 'success'
				? 'bg-emerald-950/90 text-emerald-50 border-emerald-800/80 shadow-emerald-950/20'
				: toast.type === 'error'
				? 'bg-rose-950/90 text-rose-50 border-rose-800/80 shadow-rose-950/20'
				: toast.type === 'warning'
				? 'bg-amber-950/90 text-amber-50 border-amber-800/80 shadow-amber-950/20'
				: 'bg-zinc-900/90 text-zinc-100 border-zinc-700/80 shadow-zinc-950/20'}"
		>
			<div class="mt-0.5 shrink-0">
				{#if toast.type === 'success'}
					<CheckCircle2 class="w-4 h-4 text-emerald-400" />
				{:else if toast.type === 'error'}
					<AlertCircle class="w-4 h-4 text-rose-400" />
				{:else if toast.type === 'warning'}
					<AlertTriangle class="w-4 h-4 text-amber-400" />
				{:else}
					<Info class="w-4 h-4 text-blue-400" />
				{/if}
			</div>

			<div class="flex-1 min-w-0 pr-1">
				<p class="text-xs font-semibold leading-tight">{toast.title}</p>
				{#if toast.message}
					<p class="text-xs mt-0.5 opacity-90 leading-normal break-words">{toast.message}</p>
				{/if}
			</div>

			<button
				type="button"
				onclick={() => toastStore.remove(toast.id)}
				class="shrink-0 p-0.5 rounded text-current opacity-70 hover:opacity-100 hover:bg-white/10 transition-colors"
				aria-label="Dismiss notification"
			>
				<X class="w-3.5 h-3.5" />
			</button>
		</div>
	{/each}
</div>
