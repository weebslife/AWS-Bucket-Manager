<script lang="ts">
	import { fileManager } from '$lib/stores/fileManager.svelte';
	import { AlertTriangle, Trash2, X, Loader2 } from '@lucide/svelte';

	let targetItems = $derived(fileManager.deleteItemsTarget);
	let isFolder = $derived(targetItems?.length === 1 && targetItems[0].type === 'folder');
	let isDeleting = $state(false);

	function close() {
		if (isDeleting) return;
		fileManager.deleteItemsTarget = null;
	}

	async function handleDelete() {
		isDeleting = true;
		try {
			await fileManager.executeDelete();
		} finally {
			isDeleting = false;
		}
	}
</script>

{#if targetItems && targetItems.length > 0}
	<div
		class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100 select-none"
		role="dialog"
		aria-modal="true"
	>
		<div class="w-full max-w-md bg-white rounded-xl border border-zinc-200 shadow-2xl p-5 animate-in zoom-in-95 duration-100">
			<!-- Header -->
			<div class="flex items-start gap-3">
				<div class="p-2.5 rounded-full bg-rose-100 text-rose-600 shrink-0">
					<AlertTriangle class="w-5 h-5" />
				</div>
				<div class="flex-1">
					<h3 class="text-sm font-semibold text-zinc-900 leading-tight">
						{#if isFolder}
							Delete folder "{targetItems[0].name}"?
						{:else if targetItems.length === 1}
							Delete "{targetItems[0].name}"?
						{:else}
							Delete {targetItems.length} selected items?
						{/if}
					</h3>

					<!-- Safety Warning -->
					<div class="mt-2 text-xs text-zinc-600 space-y-1.5">
						{#if isFolder}
							<div class="p-2.5 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-900">
								{#if fileManager.isCountingDelete}
									<div class="flex items-center gap-1.5 text-xs">
										<Loader2 class="w-3.5 h-3.5 animate-spin text-rose-600" />
										<span>Counting objects inside folder...</span>
									</div>
								{:else}
									<p class="font-semibold">
										This will permanently delete all {fileManager.deleteCount} object{fileManager.deleteCount === 1 ? '' : 's'} inside this folder.
									</p>
								{/if}
							</div>
						{/if}
						<p class="text-zinc-500">
							This action cannot be undone. Amazon S3 will permanently remove {targetItems.length === 1 ? 'this object' : 'these objects'}.
						</p>
					</div>
				</div>

				<button
					type="button"
					onclick={close}
					disabled={isDeleting}
					class="p-1 rounded-md text-zinc-400 hover:text-zinc-600 transition-colors"
				>
					<X class="w-4 h-4" />
				</button>
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-zinc-100">
				<button
					type="button"
					onclick={close}
					disabled={isDeleting}
					class="px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={handleDelete}
					disabled={isDeleting || fileManager.isCountingDelete}
					class="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-xs transition-colors"
				>
					{#if isDeleting}
						<Loader2 class="w-3.5 h-3.5 animate-spin" />
						<span>Deleting...</span>
					{:else}
						<Trash2 class="w-3.5 h-3.5" />
						<span>Delete Permanently</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
