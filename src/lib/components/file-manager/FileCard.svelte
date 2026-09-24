<script lang="ts">
	import type { S3Item } from '$lib/types/s3';
	import { fileManager } from '$lib/stores/fileManager.svelte';
	import { formatBytes } from '$lib/utils';
	import {
		Folder,
		FileText,
		FileCode,
		FileArchive,
		FileAudio,
		FileVideo,
		File,
		Image as ImageIcon,
		MoreVertical
	} from '@lucide/svelte';

	let { item } = $props<{ item: S3Item }>();

	let isSelected = $derived(fileManager.selectedKeys.has(item.key));
	let isDragOver = $state(false);
	let imgError = $state(false);

	function handleClick(e: MouseEvent) {
		const isMulti = e.metaKey || e.ctrlKey;
		const isShift = e.shiftKey;
		fileManager.selectItem(item, isMulti, isShift);
	}

	function handleDblClick() {
		if (item.type === 'folder') {
			fileManager.navigateTo(item.key);
		} else if (item.isImage) {
			fileManager.previewItem = item;
		}
	}

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		fileManager.contextMenu = {
			x: e.clientX,
			y: e.clientY,
			item,
			isFolder: item.type === 'folder'
		};
	}

	// Drag operations
	function handleDragStart(e: DragEvent) {
		if (!e.dataTransfer) return;
		const keysToDrag = fileManager.selectedKeys.has(item.key)
			? Array.from(fileManager.selectedKeys)
			: [item.key];
		e.dataTransfer.setData('application/json', JSON.stringify({ keys: keysToDrag }));
		e.dataTransfer.effectAllowed = 'move';
	}

	function handleDragOver(e: DragEvent) {
		if (item.type !== 'folder') return;
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		isDragOver = true;
	}

	function handleDragLeave() {
		isDragOver = false;
	}

	async function handleDrop(e: DragEvent) {
		if (item.type !== 'folder') return;
		e.preventDefault();
		isDragOver = false;

		const data = e.dataTransfer?.getData('application/json');
		if (data) {
			try {
				const { keys } = JSON.parse(data);
				if (Array.isArray(keys) && keys.length > 0) {
					// Prevent moving folder into itself
					const filtered = keys.filter((k: string) => k !== item.key);
					if (filtered.length > 0) {
						await fileManager.moveToFolder(filtered, item.key);
					}
				}
			} catch (err) {
				console.error('Error handling drop:', err);
			}
		}
	}

	function getFileIcon(ext?: string) {
		if (!ext) return File;
		const codeExts = ['ts', 'js', 'json', 'html', 'css', 'svelte', 'py', 'sh', 'yaml', 'yml'];
		const archiveExts = ['zip', 'tar', 'gz', 'rar', '7z'];
		const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
		const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'm4a'];
		const docExts = ['pdf', 'doc', 'docx', 'txt', 'md', 'csv'];

		if (codeExts.includes(ext)) return FileCode;
		if (archiveExts.includes(ext)) return FileArchive;
		if (videoExts.includes(ext)) return FileVideo;
		if (audioExts.includes(ext)) return FileAudio;
		if (docExts.includes(ext)) return FileText;
		return File;
	}

	let IconComponent = $derived(getFileIcon(item.extension));
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	role="button"
	tabindex="0"
	draggable="true"
	ondragstart={handleDragStart}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	onclick={handleClick}
	ondblclick={handleDblClick}
	oncontextmenu={handleContextMenu}
	onkeydown={(e) => {
		if (e.key === 'Enter') handleDblClick();
	}}
	class="group relative flex flex-col rounded-lg border text-left cursor-pointer transition-all duration-150 select-none overflow-hidden
	{isSelected
		? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/70 shadow-sm'
		: isDragOver
		? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/80 scale-102'
		: 'border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-xs'}"
>
	<!-- Thumbnail / Preview Area -->
	<div class="relative w-full aspect-square bg-zinc-100/80 flex items-center justify-center overflow-hidden">
		{#if item.type === 'folder'}
			<div class="flex flex-col items-center justify-center gap-1.5 p-4 text-zinc-400 group-hover:text-amber-500 transition-colors">
				<Folder class="w-14 h-14 text-amber-500/90 fill-amber-400/20" />
			</div>
		{:else if item.isImage && item.thumbnailUrl && !imgError}
			<img
				src={item.thumbnailUrl}
				alt={item.name}
				loading="lazy"
				onerror={() => (imgError = true)}
				class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
			/>
		{:else if item.isImage}
			<div class="flex flex-col items-center justify-center text-zinc-400">
				<ImageIcon class="w-10 h-10 text-zinc-300" />
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center p-4">
				<IconComponent class="w-12 h-12 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
				{#if item.extension}
					<span class="mt-1 text-[10px] font-mono uppercase font-bold text-zinc-400 bg-zinc-200/80 px-1 py-0.5 rounded">
						{item.extension}
					</span>
				{/if}
			</div>
		{/if}

		<!-- More Actions Button (Hover Trigger) -->
		<button
			type="button"
			onclick={handleContextMenu}
			title="More options"
			class="absolute top-1.5 right-1.5 p-1 rounded-md bg-white/90 shadow-xs border border-zinc-200/70 text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-zinc-900 hover:bg-white transition-opacity"
		>
			<MoreVertical class="w-3.5 h-3.5" />
		</button>
	</div>

	<!-- Info Section -->
	<div class="p-2.5 flex flex-col justify-between border-t border-zinc-100 bg-white/50">
		<span class="text-xs font-medium text-zinc-800 truncate" title={item.name}>
			{item.name}
		</span>
		<div class="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
			<span>{item.type === 'folder' ? 'Folder' : formatBytes(item.size)}</span>
			{#if item.extension && item.type === 'file'}
				<span class="font-mono uppercase text-[10px] text-zinc-400">{item.extension}</span>
			{/if}
		</div>
	</div>
</div>
