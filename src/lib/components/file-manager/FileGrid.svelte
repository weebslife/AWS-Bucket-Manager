<script lang="ts">
	import { fileManager } from '$lib/stores/fileManager.svelte';
	import FileCard from './FileCard.svelte';
	import EmptyState from './EmptyState.svelte';
	import { UploadCloud } from '@lucide/svelte';

	let isDragOverArea = $state(false);

	function handleAreaDragOver(e: DragEvent) {
		// Only show area drop overlay if dragging native files from desktop
		if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
			e.preventDefault();
			e.dataTransfer.dropEffect = 'copy';
			isDragOverArea = true;
		}
	}

	function handleAreaDragLeave(e: DragEvent) {
		// Verify if leaving outside target
		if (e.currentTarget === e.target) {
			isDragOverArea = false;
		}
	}

	function handleAreaDrop(e: DragEvent) {
		if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			e.preventDefault();
			isDragOverArea = false;
			fileManager.enqueueUploads(e.dataTransfer.files);
		}
	}

	function handleContainerClick(e: MouseEvent) {
		// Click on empty whitespace clears selection
		if (e.target === e.currentTarget) {
			fileManager.clearSelection();
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	ondragover={handleAreaDragOver}
	ondragleave={handleAreaDragLeave}
	ondrop={handleAreaDrop}
	onclick={handleContainerClick}
	class="relative flex-1 overflow-y-auto p-4 select-none min-h-0"
>
	<!-- Drag and drop upload overlay -->
	{#if isDragOverArea}
		<div class="absolute inset-2 z-30 rounded-xl border-2 border-dashed border-blue-500 bg-blue-50/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
			<UploadCloud class="w-12 h-12 text-blue-600 animate-bounce" />
			<div class="text-sm font-semibold text-blue-900">Drop files to upload</div>
			<div class="text-xs text-blue-600 font-mono">
				Target: {fileManager.currentPrefix || 'Root /'}
			</div>
		</div>
	{/if}

	{#if fileManager.processedItems.length === 0}
		<EmptyState />
	{:else}
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
			{#each fileManager.processedItems as item (item.key)}
				<FileCard {item} />
			{/each}
		</div>
	{/if}
</div>
