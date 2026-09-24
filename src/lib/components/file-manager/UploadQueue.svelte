<script lang="ts">
	import { fileManager } from '$lib/stores/fileManager.svelte';
	import { formatBytes } from '$lib/utils';
	import {
		ChevronDown,
		ChevronUp,
		X,
		CheckCircle2,
		AlertCircle,
		Loader2,
		UploadCloud
	} from '@lucide/svelte';

	let isMinimized = $state(false);

	let activeUploadCount = $derived(
		fileManager.uploadQueue.filter((u) => u.status === 'uploading' || u.status === 'pending').length
	);

	let completedCount = $derived(
		fileManager.uploadQueue.filter((u) => u.status === 'completed').length
	);

	let errorCount = $derived(
		fileManager.uploadQueue.filter((u) => u.status === 'error').length
	);
</script>

{#if fileManager.uploadQueue.length > 0 && fileManager.isUploadQueueOpen}
	<div
		class="fixed bottom-4 right-4 z-40 w-80 sm:w-96 bg-white rounded-xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col transition-all duration-200 select-none animate-in slide-in-from-bottom-5"
	>
		<!-- Header -->
		<div class="h-11 px-4 bg-zinc-900 text-white flex items-center justify-between shrink-0">
			<div class="flex items-center gap-2">
				<UploadCloud class="w-4 h-4 text-blue-400" />
				<span class="text-xs font-semibold">
					{#if activeUploadCount > 0}
						Uploading {activeUploadCount} file{activeUploadCount > 1 ? 's' : ''}...
					{:else}
						Uploads Complete ({completedCount}/{fileManager.uploadQueue.length})
					{/if}
				</span>
			</div>

			<div class="flex items-center gap-1">
				<button
					type="button"
					onclick={() => (isMinimized = !isMinimized)}
					class="p-1 rounded text-zinc-400 hover:text-white transition-colors"
					title={isMinimized ? 'Expand' : 'Minimize'}
				>
					{#if isMinimized}
						<ChevronUp class="w-4 h-4" />
					{:else}
						<ChevronDown class="w-4 h-4" />
					{/if}
				</button>
				<button
					type="button"
					onclick={() => fileManager.clearCompletedUploads()}
					class="p-1 rounded text-zinc-400 hover:text-white transition-colors"
					title="Close upload panel"
				>
					<X class="w-4 h-4" />
				</button>
			</div>
		</div>

		<!-- Body: Items List -->
		{#if !isMinimized}
			<div class="max-h-64 overflow-y-auto divide-y divide-zinc-100 bg-white">
				{#each fileManager.uploadQueue as item (item.id)}
					<div class="p-3 text-xs flex flex-col gap-1.5">
						<div class="flex items-center justify-between gap-2">
							<span class="font-medium text-zinc-800 truncate" title={item.name}>
								{item.name}
							</span>

							<!-- Status icon -->
							<div class="shrink-0">
								{#if item.status === 'completed'}
									<CheckCircle2 class="w-4 h-4 text-emerald-500" />
								{:else if item.status === 'error'}
									<AlertCircle class="w-4 h-4 text-rose-500" />
								{:else if item.status === 'uploading'}
									<Loader2 class="w-4 h-4 text-blue-500 animate-spin" />
								{:else}
									<span class="text-[10px] text-zinc-400">Waiting...</span>
								{/if}
							</div>
						</div>

						<div class="flex items-center justify-between text-[11px] text-zinc-400">
							<span>{formatBytes(item.size)}</span>
							{#if item.status === 'uploading'}
								<span class="font-mono text-blue-600 font-medium">{item.progress}%</span>
							{:else if item.status === 'error'}
								<span class="text-rose-600 truncate max-w-[180px]">{item.error}</span>
							{:else if item.status === 'completed'}
								<span class="text-emerald-600 font-medium">Finished (100%)</span>
							{:else}
								<span class="text-zinc-400">Pending</span>
							{/if}
						</div>

						<!-- Progress Bar -->
						{#if item.status === 'uploading' || item.status === 'completed'}
							<div class="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-0.5">
								<div
									class="h-full transition-all duration-200 rounded-full {item.status === 'completed'
										? 'bg-emerald-500'
										: 'bg-blue-600'}"
									style="width: {item.progress}%;"
								></div>
							</div>
						{:else if item.status === 'error'}
							<div class="w-full h-1.5 bg-rose-100 rounded-full overflow-hidden mt-0.5">
								<div class="h-full bg-rose-500 rounded-full" style="width: 100%;"></div>
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Footer summary -->
			<div class="p-2.5 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
				<span>{fileManager.uploadQueue.length} total items</span>
				{#if completedCount > 0}
					<button
						type="button"
						onclick={() => fileManager.clearCompletedUploads()}
						class="text-blue-600 hover:text-blue-700 font-medium"
					>
						Clear finished
					</button>
				{/if}
			</div>
		{/if}
	</div>
{/if}
