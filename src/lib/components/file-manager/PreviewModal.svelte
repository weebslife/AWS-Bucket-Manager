<script lang="ts">
	import { fileManager } from '$lib/stores/fileManager.svelte';
	import type { S3Item } from '$lib/types/s3';
	import { formatBytes, formatDate } from '$lib/utils';
	import {
		X,
		ChevronLeft,
		ChevronRight,
		Download,
		Link2,
		Trash2,
		Maximize2,
		Info,
		Calendar,
		HardDrive
	} from '@lucide/svelte';

	let imageDimensions = $state<{ width: number; height: number } | null>(null);

	// All image items in current folder for next/previous navigation
	let imageItems = $derived.by(() => {
		return fileManager.processedItems.filter((i) => i.isImage);
	});

	let currentIndex = $derived.by(() => {
		if (!fileManager.previewItem) return -1;
		return imageItems.findIndex((i) => i.key === fileManager.previewItem?.key);
	});

	let hasPrev = $derived(currentIndex > 0);
	let hasNext = $derived(currentIndex >= 0 && currentIndex < imageItems.length - 1);

	function prev() {
		if (hasPrev) {
			fileManager.previewItem = imageItems[currentIndex - 1];
			imageDimensions = null;
		}
	}

	function next() {
		if (hasNext) {
			fileManager.previewItem = imageItems[currentIndex + 1];
			imageDimensions = null;
		}
	}

	function close() {
		fileManager.previewItem = null;
		imageDimensions = null;
	}

	function handleImageLoad(e: Event) {
		const img = e.target as HTMLImageElement;
		imageDimensions = {
			width: img.naturalWidth,
			height: img.naturalHeight
		};
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (!fileManager.previewItem) return;
		if (e.key === 'Escape') close();
		if (e.key === 'ArrowLeft') prev();
		if (e.key === 'ArrowRight') next();
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if fileManager.previewItem}
	{@const item = fileManager.previewItem}
	<div
		class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150 select-none"
		role="dialog"
		aria-modal="true"
	>
		<!-- Modal Container -->
		<div class="relative w-full max-w-5xl h-[85vh] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
			<!-- Header -->
			<div class="h-14 px-5 border-b border-zinc-800/80 flex items-center justify-between shrink-0 bg-zinc-950/60">
				<div class="flex items-center gap-3 min-w-0 pr-4">
					<div class="min-w-0">
						<h2 class="text-sm font-semibold text-white truncate max-w-md" title={item.name}>
							{item.name}
						</h2>
						<div class="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
							<span>{formatBytes(item.size)}</span>
							{#if imageDimensions}
								<span>•</span>
								<span>{imageDimensions.width} × {imageDimensions.height} px</span>
							{/if}
						</div>
					</div>
				</div>

				<!-- Header Actions -->
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={() => fileManager.copyPublicUrl(item)}
						class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
						title="Copy Direct Public URL"
					>
						<Link2 class="w-3.5 h-3.5" />
						<span>Copy URL</span>
					</button>

					<button
						type="button"
						onclick={() => fileManager.downloadItem(item)}
						class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
						title="Download file"
					>
						<Download class="w-3.5 h-3.5" />
						<span>Download</span>
					</button>

					<button
						type="button"
						onclick={() => {
							const toDel = item;
							close();
							fileManager.confirmDelete([toDel]);
						}}
						class="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 transition-colors"
						title="Delete image"
					>
						<Trash2 class="w-4 h-4" />
					</button>

					<div class="h-4 w-px bg-zinc-800 mx-1"></div>

					<button
						type="button"
						onclick={close}
						class="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
						title="Close (Esc)"
					>
						<X class="w-4 h-4" />
					</button>
				</div>
			</div>

			<!-- Main Preview Body -->
			<div class="relative flex-1 flex items-center justify-center bg-zinc-950 p-6 overflow-hidden">
				<!-- Previous Button -->
				{#if hasPrev}
					<button
						type="button"
						onclick={prev}
						class="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 shadow-lg backdrop-blur-xs transition-all"
						title="Previous image (←)"
					>
						<ChevronLeft class="w-5 h-5" />
					</button>
				{/if}

				<!-- Large Image View -->
				{#if item.thumbnailUrl}
					<img
						src={item.thumbnailUrl}
						alt={item.name}
						onload={handleImageLoad}
						class="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-all duration-200 select-none"
					/>
				{:else}
					<div class="text-zinc-500 text-sm">Image preview unavailable</div>
				{/if}

				<!-- Next Button -->
				{#if hasNext}
					<button
						type="button"
						onclick={next}
						class="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 shadow-lg backdrop-blur-xs transition-all"
						title="Next image (→)"
					>
						<ChevronRight class="w-5 h-5" />
					</button>
				{/if}
			</div>

			<!-- Footer with metadata and counter -->
			<div class="h-10 px-5 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 shrink-0 bg-zinc-950/80">
				<div class="flex items-center gap-4">
					<span class="truncate max-w-sm font-mono text-[11px] opacity-75">Key: {item.key}</span>
					{#if item.lastModified}
						<span class="text-[11px] opacity-75">• Modified: {formatDate(item.lastModified)}</span>
					{/if}
				</div>

				{#if imageItems.length > 0}
					<div class="font-mono text-[11px]">
						{currentIndex + 1} of {imageItems.length}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
