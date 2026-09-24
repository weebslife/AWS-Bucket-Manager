<script lang="ts">
	import { fileManager } from '$lib/stores/fileManager.svelte';
	import {
		Eye,
		FolderOpen,
		Copy,
		Scissors,
		Files,
		Edit3,
		Link2,
		Globe,
		ShieldCheck,
		Download,
		Trash2
	} from '@lucide/svelte';

	let menuRef = $state<HTMLDivElement | null>(null);

	let menu = $derived(fileManager.contextMenu);

	// Ensure menu stays within window bounds
	let stylePos = $derived.by(() => {
		if (!menu) return '';
		const width = 220;
		const height = 320;
		const padding = 10;

		let x = menu.x;
		let y = menu.y;

		if (typeof window !== 'undefined') {
			if (x + width > window.innerWidth - padding) {
				x = window.innerWidth - width - padding;
			}
			if (y + height > window.innerHeight - padding) {
				y = window.innerHeight - height - padding;
			}
		}

		return `left: ${x}px; top: ${y}px;`;
	});

	function close() {
		fileManager.contextMenu = null;
	}

	function handlePreview() {
		if (menu?.item && menu.item.type === 'file') {
			fileManager.previewItem = menu.item;
		}
		close();
	}

	function handleOpen() {
		if (menu?.item && menu.item.type === 'folder') {
			fileManager.navigateTo(menu.item.key);
		}
		close();
	}

	function handleCopyFolderLinks() {
		if (menu?.item && menu.item.type === 'folder') {
			fileManager.copyFolderLinks(menu.item.key, menu.item.name);
		}
		close();
	}

	function handleCopy() {
		if (menu?.item) {
			if (!fileManager.selectedKeys.has(menu.item.key)) {
				fileManager.selectItem(menu.item);
			}
			fileManager.copySelection();
		}
		close();
	}

	function handleCut() {
		if (menu?.item) {
			if (!fileManager.selectedKeys.has(menu.item.key)) {
				fileManager.selectItem(menu.item);
			}
			fileManager.cutSelection();
		}
		close();
	}

	function handleDuplicate() {
		if (menu?.item && menu.item.type === 'file') {
			fileManager.duplicate(menu.item);
		}
		close();
	}

	function handleRename() {
		if (menu?.item) {
			fileManager.renameItem = menu.item;
		}
		close();
	}

	function handleCopyPublicUrl() {
		if (menu?.item && menu.item.type === 'file') {
			fileManager.copyPublicUrl(menu.item);
		}
		close();
	}

	function handleCopyPresignedUrl() {
		if (menu?.item && menu.item.type === 'file') {
			fileManager.copyPresignedUrl(menu.item);
		}
		close();
	}

	function handleDownload() {
		if (menu?.item && menu.item.type === 'file') {
			fileManager.downloadItem(menu.item);
		}
		close();
	}

	function handleDelete() {
		if (menu?.item) {
			const items = fileManager.selectedKeys.has(menu.item.key)
				? fileManager.selectedItems
				: [menu.item];
			fileManager.confirmDelete(items);
		}
		close();
	}
</script>

<svelte:window
	onclick={(e) => {
		if (menu && menuRef && !menuRef.contains(e.target as Node)) {
			close();
		}
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape' && menu) {
			close();
		}
	}}
/>

{#if menu && menu.item}
	<div
		bind:this={menuRef}
		style={stylePos}
		class="fixed z-50 w-52 bg-white/95 backdrop-blur-md rounded-lg border border-zinc-200 shadow-xl py-1 text-xs text-zinc-700 select-none animate-in fade-in zoom-in-95 duration-100"
		role="menu"
		tabindex="-1"
	>
		<!-- Header with Item Name -->
		<div class="px-2.5 py-1 text-[11px] font-semibold text-zinc-400 truncate border-b border-zinc-100 mb-1">
			{menu.item.name}
		</div>

		{#if menu.isFolder}
			<!-- Folder Actions -->
			<button
				type="button"
				onclick={handleOpen}
				class="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-blue-600 hover:text-white rounded-sm text-left transition-colors"
			>
				<FolderOpen class="w-3.5 h-3.5" />
				<span>Open Folder</span>
			</button>

			<button
				type="button"
				onclick={handleCopyFolderLinks}
				class="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-blue-600 hover:text-white rounded-sm text-left transition-colors font-medium text-blue-600"
			>
				<Link2 class="w-3.5 h-3.5" />
				<span>Copy All File Links</span>
			</button>
		{:else}
			<!-- File Actions -->
			{#if menu.item.isImage}
				<button
					type="button"
					onclick={handlePreview}
					class="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-blue-600 hover:text-white rounded-sm text-left transition-colors font-medium"
				>
					<Eye class="w-3.5 h-3.5" />
					<span>Preview</span>
				</button>
			{/if}
		{/if}

		<div class="h-px bg-zinc-100 my-1"></div>

		<!-- Common Operations -->
		<button
			type="button"
			onclick={handleCopy}
			class="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-blue-600 hover:text-white rounded-sm text-left transition-colors"
		>
			<Copy class="w-3.5 h-3.5" />
			<span>Copy</span>
			<span class="ml-auto text-[10px] opacity-60">⌘C</span>
		</button>

		<button
			type="button"
			onclick={handleCut}
			class="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-blue-600 hover:text-white rounded-sm text-left transition-colors"
		>
			<Scissors class="w-3.5 h-3.5" />
			<span>Cut</span>
			<span class="ml-auto text-[10px] opacity-60">⌘X</span>
		</button>

		{#if !menu.isFolder}
			<button
				type="button"
				onclick={handleDuplicate}
				class="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-blue-600 hover:text-white rounded-sm text-left transition-colors"
			>
				<Files class="w-3.5 h-3.5" />
				<span>Duplicate</span>
			</button>
		{/if}

		<button
			type="button"
			onclick={handleRename}
			class="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-blue-600 hover:text-white rounded-sm text-left transition-colors"
		>
			<Edit3 class="w-3.5 h-3.5" />
			<span>Rename</span>
		</button>

		{#if !menu.isFolder}
			<div class="h-px bg-zinc-100 my-1"></div>

			<button
				type="button"
				onclick={handleCopyPublicUrl}
				class="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-blue-600 hover:text-white rounded-sm text-left transition-colors font-medium text-blue-600"
			>
				<Globe class="w-3.5 h-3.5" />
				<span>Copy Direct Public URL</span>
			</button>

			<button
				type="button"
				onclick={handleCopyPresignedUrl}
				class="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-blue-600 hover:text-white rounded-sm text-left transition-colors"
			>
				<ShieldCheck class="w-3.5 h-3.5" />
				<span>Copy Presigned URL (1h)</span>
			</button>

			<button
				type="button"
				onclick={handleDownload}
				class="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-blue-600 hover:text-white rounded-sm text-left transition-colors"
			>
				<Download class="w-3.5 h-3.5" />
				<span>Download</span>
			</button>
		{/if}

		{#if fileManager.selectedFileCount > 1}
			<div class="h-px bg-zinc-100 my-1"></div>
			<button
				type="button"
				onclick={() => {
					fileManager.copySelectedLinks();
					close();
				}}
				class="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-blue-600 hover:text-white rounded-sm text-left transition-colors font-medium text-blue-600"
			>
				<Link2 class="w-3.5 h-3.5" />
				<span>Copy Selected Links ({fileManager.selectedFileCount})</span>
			</button>
		{/if}

		<div class="h-px bg-zinc-100 my-1"></div>

		<button
			type="button"
			onclick={handleDelete}
			class="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-rose-600 hover:text-white text-rose-600 rounded-sm text-left transition-colors"
		>
			<Trash2 class="w-3.5 h-3.5" />
			<span>Delete</span>
			<span class="ml-auto text-[10px] opacity-60">Del</span>
		</button>
	</div>
{/if}
