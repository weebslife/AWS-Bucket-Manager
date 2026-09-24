<script lang="ts">
	import { fileManager } from '$lib/stores/fileManager.svelte';
	import { Upload, FolderPlus, FolderSearch, FileSpreadsheet } from '@lucide/svelte';

	let fileInputRef = $state<HTMLInputElement | null>(null);

	function triggerUpload() {
		fileInputRef?.click();
	}

	function handleFileSelected(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			fileManager.enqueueUploads(target.files);
			target.value = '';
		}
	}
</script>

<div class="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
	{#if fileManager.searchQuery}
		<!-- Search empty state -->
		<div class="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-3">
			<FolderSearch class="w-6 h-6" />
		</div>
		<h3 class="text-sm font-semibold text-zinc-800">No matching files found</h3>
		<p class="text-xs text-zinc-500 mt-1 max-w-sm">
			No files or folders match <span class="font-medium text-zinc-700">"{fileManager.searchQuery}"</span> in this location.
		</p>
		<button
			type="button"
			onclick={() => (fileManager.searchQuery = '')}
			class="mt-4 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
		>
			Clear search filter
		</button>
	{:else}
		<!-- Folder empty state -->
		<div class="w-14 h-14 rounded-2xl bg-zinc-100/90 border border-zinc-200/80 flex items-center justify-center text-zinc-400 mb-3">
			<FileSpreadsheet class="w-7 h-7 text-zinc-400" />
		</div>
		<h3 class="text-sm font-semibold text-zinc-800">This folder is empty</h3>
		<p class="text-xs text-zinc-500 mt-1 max-w-sm">
			Drag and drop images or files here, or use the buttons below to get started.
		</p>

		<div class="flex items-center gap-2 mt-5">
			<button
				type="button"
				onclick={() => (fileManager.createFolderOpen = true)}
				class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-50 border border-zinc-200/80 rounded-md shadow-xs transition-colors"
			>
				<FolderPlus class="w-3.5 h-3.5 text-amber-500" />
				<span>New Folder</span>
			</button>
			<button
				type="button"
				onclick={triggerUpload}
				class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition-colors"
			>
				<Upload class="w-3.5 h-3.5" />
				<span>Upload Files</span>
			</button>
		</div>

		<input
			type="file"
			multiple
			bind:this={fileInputRef}
			onchange={handleFileSelected}
			class="hidden"
		/>
	{/if}
</div>
