<script lang="ts">
	import { fileManager } from '$lib/stores/fileManager.svelte';
	import type { SortField } from '$lib/types/s3';
	import FileRow from './FileRow.svelte';
	import EmptyState from './EmptyState.svelte';
	import { ArrowUp, ArrowDown, UploadCloud } from '@lucide/svelte';

	let isDragOverArea = $state(false);

	function handleSort(field: SortField) {
		fileManager.setSort(field);
	}

	function handleAreaDragOver(e: DragEvent) {
		if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
			e.preventDefault();
			e.dataTransfer.dropEffect = 'copy';
			isDragOverArea = true;
		}
	}

	function handleAreaDragLeave(e: DragEvent) {
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
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	ondragover={handleAreaDragOver}
	ondragleave={handleAreaDragLeave}
	ondrop={handleAreaDrop}
	class="relative flex-1 overflow-y-auto select-none min-h-0 bg-white"
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
		<table class="w-full text-left border-collapse">
			<thead class="sticky top-0 bg-zinc-50/95 backdrop-blur-xs border-b border-zinc-200 text-[11px] font-semibold text-zinc-500 z-10">
				<tr>
					<th
						onclick={() => handleSort('name')}
						class="py-2 px-3 cursor-pointer hover:text-zinc-900 transition-colors"
					>
						<div class="flex items-center gap-1">
							<span>Name</span>
							{#if fileManager.sortField === 'name'}
								{#if fileManager.sortDirection === 'asc'}
									<ArrowUp class="w-3 h-3 text-blue-600" />
								{:else}
									<ArrowDown class="w-3 h-3 text-blue-600" />
								{/if}
							{/if}
						</div>
					</th>

					<th
						onclick={() => handleSort('type')}
						class="py-2 px-3 cursor-pointer hover:text-zinc-900 transition-colors w-24"
					>
						<div class="flex items-center gap-1">
							<span>Type</span>
							{#if fileManager.sortField === 'type'}
								{#if fileManager.sortDirection === 'asc'}
									<ArrowUp class="w-3 h-3 text-blue-600" />
								{:else}
									<ArrowDown class="w-3 h-3 text-blue-600" />
								{/if}
							{/if}
						</div>
					</th>

					<th
						onclick={() => handleSort('size')}
						class="py-2 px-3 cursor-pointer hover:text-zinc-900 transition-colors w-28"
					>
						<div class="flex items-center gap-1">
							<span>Size</span>
							{#if fileManager.sortField === 'size'}
								{#if fileManager.sortDirection === 'asc'}
									<ArrowUp class="w-3 h-3 text-blue-600" />
								{:else}
									<ArrowDown class="w-3 h-3 text-blue-600" />
								{/if}
							{/if}
						</div>
					</th>

					<th
						onclick={() => handleSort('lastModified')}
						class="py-2 px-3 cursor-pointer hover:text-zinc-900 transition-colors w-40"
					>
						<div class="flex items-center gap-1">
							<span>Date Modified</span>
							{#if fileManager.sortField === 'lastModified'}
								{#if fileManager.sortDirection === 'asc'}
									<ArrowUp class="w-3 h-3 text-blue-600" />
								{:else}
									<ArrowDown class="w-3 h-3 text-blue-600" />
								{/if}
							{/if}
						</div>
					</th>

					<th class="py-2 px-3 w-10 text-right"></th>
				</tr>
			</thead>
			<tbody>
				{#each fileManager.processedItems as item (item.key)}
					<FileRow {item} />
				{/each}
			</tbody>
		</table>
	{/if}
</div>
