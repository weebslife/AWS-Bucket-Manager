<script lang="ts">
	import { fileManager } from '$lib/stores/fileManager.svelte';
	import { FolderPlus, X } from '@lucide/svelte';

	let folderName = $state('');
	let inputRef = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (fileManager.createFolderOpen) {
			folderName = '';
			setTimeout(() => inputRef?.focus(), 50);
		}
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		const trimmed = folderName.trim();
		if (!trimmed) return;
		fileManager.createFolder(trimmed);
	}

	function close() {
		fileManager.createFolderOpen = false;
	}
</script>

{#if fileManager.createFolderOpen}
	<div
		class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100 select-none"
		role="dialog"
		aria-modal="true"
	>
		<div class="w-full max-w-sm bg-white rounded-xl border border-zinc-200 shadow-2xl p-5 animate-in zoom-in-95 duration-100">
			<!-- Header -->
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-2">
					<div class="p-2 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
						<FolderPlus class="w-4 h-4" />
					</div>
					<div>
						<h3 class="text-sm font-semibold text-zinc-900">New Folder</h3>
						<p class="text-[11px] text-zinc-500">In: {fileManager.currentPrefix || 'Root'}</p>
					</div>
				</div>
				<button
					type="button"
					onclick={close}
					class="p-1 rounded-md text-zinc-400 hover:text-zinc-600 transition-colors"
				>
					<X class="w-4 h-4" />
				</button>
			</div>

			<!-- Form -->
			<form onsubmit={handleSubmit} class="space-y-4">
				<div>
					<label for="folder-name-input" class="block text-xs font-medium text-zinc-700 mb-1">
						Folder Name
					</label>
					<input
						id="folder-name-input"
						type="text"
						bind:value={folderName}
						bind:this={inputRef}
						placeholder="e.g. Wedding, Products, 2026..."
						class="w-full h-9 px-3 text-xs bg-zinc-50 focus:bg-white rounded-lg border border-zinc-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-zinc-400"
					/>
				</div>

				<div class="flex items-center justify-end gap-2 pt-1">
					<button
						type="button"
						onclick={close}
						class="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!folderName.trim()}
						class="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-xs transition-colors"
					>
						Create Folder
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
