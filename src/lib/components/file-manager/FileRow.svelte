<script lang="ts">
	import type { S3Item } from '$lib/types/s3';
	import { fileManager } from '$lib/stores/fileManager.svelte';
	import { formatBytes, formatDate } from '$lib/utils';
	import {
		Folder,
		FileText,
		FileCode,
		FileArchive,
		FileAudio,
		FileVideo,
		File,
		Image as ImageIcon,
		MoreHorizontal
	} from '@lucide/svelte';

	let { item } = $props<{ item: S3Item }>();

	let isSelected = $derived(fileManager.selectedKeys.has(item.key));
	let isDragOver = $state(false);

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
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
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
<tr
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
	class="group border-b border-zinc-100 text-xs transition-colors cursor-pointer select-none
	{isSelected
		? 'bg-blue-50/80 text-blue-950 font-medium'
		: isDragOver
		? 'bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500'
		: 'hover:bg-zinc-50/80 text-zinc-700'}"
>
	<!-- Name column with icon/thumbnail -->
	<td class="py-2 px-3 flex items-center gap-2.5 min-w-0 max-w-sm">
		{#if item.type === 'folder'}
			<Folder class="w-4 h-4 text-amber-500 shrink-0 fill-amber-400/20" />
		{:else if item.isImage}
			{#if item.thumbnailUrl}
				<img
					src={item.thumbnailUrl}
					alt={item.name}
					class="w-5 h-5 rounded-xs object-cover border border-zinc-200 shrink-0"
				/>
			{:else}
				<ImageIcon class="w-4 h-4 text-blue-500 shrink-0" />
			{/if}
		{:else}
			<IconComponent class="w-4 h-4 text-zinc-400 shrink-0" />
		{/if}

		<span class="truncate font-medium text-zinc-900 group-hover:text-blue-600 transition-colors" title={item.name}>
			{item.name}
		</span>
	</td>

	<!-- Type column -->
	<td class="py-2 px-3 text-zinc-500 font-mono text-[11px] uppercase">
		{#if item.type === 'folder'}
			<span class="text-zinc-400">Folder</span>
		{:else}
			<span>{item.extension || 'File'}</span>
		{/if}
	</td>

	<!-- Size column -->
	<td class="py-2 px-3 text-zinc-500 font-mono text-[11px] whitespace-nowrap">
		{item.type === 'folder' ? '—' : formatBytes(item.size)}
	</td>

	<!-- Last modified column -->
	<td class="py-2 px-3 text-zinc-500 text-[11px] whitespace-nowrap">
		{formatDate(item.lastModified)}
	</td>

	<!-- Actions column -->
	<td class="py-2 px-3 text-right">
		<button
			type="button"
			onclick={handleContextMenu}
			title="More options"
			class="p-1 rounded text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-zinc-800 hover:bg-zinc-200/60 transition-all"
		>
			<MoreHorizontal class="w-3.5 h-3.5" />
		</button>
	</td>
</tr>
