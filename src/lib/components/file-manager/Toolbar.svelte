<script lang="ts">
	import { fileManager } from '$lib/stores/fileManager.svelte';
	import type { SortField } from '$lib/types/s3';
	import Breadcrumb from './Breadcrumb.svelte';
	import {
		LayoutGrid,
		List,
		Upload,
		FolderPlus,
		RotateCw,
		Search,
		X,
		ArrowUpDown,
		Copy,
		Scissors,
		ClipboardPaste,
		Trash2,
		CopyCheck,
		Files,
		Link2,
		ChevronDown,
		Check,
		Globe,
		ShieldCheck,
		FileText,
		Code,
		Maximize2
	} from '@lucide/svelte';

	let fileInputRef = $state<HTMLInputElement | null>(null);
	let isCopyMenuOpen = $state(false);
	let copyMenuRef = $state<HTMLDivElement | null>(null);

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

	const sortOptions: { label: string; field: SortField }[] = [
		{ label: 'Name', field: 'name' },
		{ label: 'Size', field: 'size' },
		{ label: 'Type', field: 'type' },
		{ label: 'Date Modified', field: 'lastModified' }
	];
</script>

<svelte:window
	onclick={(e) => {
		if (isCopyMenuOpen && copyMenuRef && !copyMenuRef.contains(e.target as Node)) {
			isCopyMenuOpen = false;
		}
	}}
/>

<header class="h-12 border-b border-zinc-200/80 bg-white/80 backdrop-blur-sm px-4 flex items-center justify-between gap-4 select-none shrink-0 z-10">
	<!-- Left: Breadcrumb Navigation -->
	<div class="flex items-center min-w-0 flex-1">
		<Breadcrumb />
	</div>

	<!-- Center/Right: Search, Selection Actions, View Controls -->
	<div class="flex items-center gap-2 shrink-0">
		<!-- Search input -->
		<div class="relative w-44 sm:w-56">
			<Search class="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
			<input
				type="text"
				placeholder="Search files..."
				bind:value={fileManager.searchQuery}
				class="w-full h-8 pl-8 pr-7 text-xs bg-zinc-100 hover:bg-zinc-200/50 focus:bg-white rounded-md border border-zinc-200/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-zinc-400"
			/>
			{#if fileManager.searchQuery}
				<button
					type="button"
					onclick={() => (fileManager.searchQuery = '')}
					class="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 rounded"
				>
					<X class="w-3 h-3" />
				</button>
			{/if}
		</div>

		<!-- Selection Action Bar (Appears when items are selected) -->
		{#if fileManager.selectedKeys.size > 0}
			<div class="flex items-center gap-1 pl-2 border-l border-zinc-200">
				<!-- Copy Links of selected files -->
				{#if fileManager.selectedFileCount > 0}
					<button
						type="button"
						onclick={() => fileManager.copySelectedLinks()}
						title="Copy links of {fileManager.selectedFileCount} selected file{fileManager.selectedFileCount > 1 ? 's' : ''}"
						class="flex items-center gap-1 px-2 py-1 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors text-xs font-medium"
					>
						<Link2 class="w-3.5 h-3.5" />
						<span>Copy Links ({fileManager.selectedFileCount})</span>
					</button>
				{/if}

				<button
					type="button"
					onclick={() => fileManager.copySelection()}
					title="Copy (⌘C)"
					class="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
				>
					<Copy class="w-3.5 h-3.5" />
				</button>
				<button
					type="button"
					onclick={() => fileManager.cutSelection()}
					title="Cut (⌘X)"
					class="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
				>
					<Scissors class="w-3.5 h-3.5" />
				</button>
				{#if fileManager.selectedItems.length === 1 && fileManager.selectedItems[0].type === 'file'}
					<button
						type="button"
						onclick={() => fileManager.duplicate(fileManager.selectedItems[0])}
						title="Duplicate"
						class="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
					>
						<Files class="w-3.5 h-3.5" />
					</button>
				{/if}
				<button
					type="button"
					onclick={() => fileManager.confirmDelete(fileManager.selectedItems)}
					title="Delete selected (Delete)"
					class="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
				>
					<Trash2 class="w-3.5 h-3.5" />
				</button>
				<button
					type="button"
					onclick={() => fileManager.clearSelection()}
					class="text-[11px] text-zinc-500 hover:text-zinc-800 px-1 py-0.5 rounded hover:bg-zinc-100"
				>
					Clear
				</button>
			</div>
		{/if}

		<!-- Paste action if clipboard active -->
		{#if fileManager.clipboard && fileManager.clipboard.items.length > 0}
			<button
				type="button"
				onclick={() => fileManager.pasteClipboard()}
				class="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
				title="Paste into current folder (⌘V)"
			>
				<ClipboardPaste class="w-3.5 h-3.5" />
				<span>Paste ({fileManager.clipboard.items.length})</span>
			</button>
		{/if}

		<div class="h-4 w-px bg-zinc-200"></div>

		<!-- Sort dropdown -->
		<div class="flex items-center bg-zinc-100 rounded-md p-0.5 border border-zinc-200/80">
			<select
				value={fileManager.sortField}
				onchange={(e) => fileManager.setSort((e.target as HTMLSelectElement).value as SortField)}
				class="bg-transparent text-xs text-zinc-700 font-medium px-2 py-1 outline-none cursor-pointer"
			>
				{#each sortOptions as opt}
					<option value={opt.field}>{opt.label}</option>
				{/each}
			</select>
			<button
				type="button"
				onclick={() => fileManager.setSort(fileManager.sortField)}
				title="Toggle sort direction ({fileManager.sortDirection.toUpperCase()})"
				class="p-1 text-zinc-500 hover:text-zinc-800 rounded hover:bg-zinc-200/60 transition-colors"
			>
				<ArrowUpDown class="w-3.5 h-3.5" />
			</button>
		</div>

		<!-- View Switcher (Grid / List) -->
		<div class="flex items-center bg-zinc-100 rounded-md p-0.5 border border-zinc-200/80">
			<button
				type="button"
				onclick={() => fileManager.setViewMode('grid')}
				class="p-1.5 rounded transition-colors {fileManager.viewMode === 'grid'
					? 'bg-white text-zinc-900 shadow-xs font-medium'
					: 'text-zinc-500 hover:text-zinc-800'}"
				title="Grid view"
			>
				<LayoutGrid class="w-3.5 h-3.5" />
			</button>
			<button
				type="button"
				onclick={() => fileManager.setViewMode('list')}
				class="p-1.5 rounded transition-colors {fileManager.viewMode === 'list'
					? 'bg-white text-zinc-900 shadow-xs font-medium'
					: 'text-zinc-500 hover:text-zinc-800'}"
				title="List view"
			>
				<List class="w-3.5 h-3.5" />
			</button>
		</div>

		<!-- Refresh Button -->
		<button
			type="button"
			onclick={() => fileManager.loadFiles()}
			disabled={fileManager.isLoading}
			class="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-md transition-colors disabled:opacity-50"
			title="Refresh files"
		>
			<RotateCw class="w-3.5 h-3.5 {fileManager.isLoading ? 'animate-spin text-blue-600' : ''}" />
		</button>

		<div class="h-4 w-px bg-zinc-200"></div>

		<!-- Copy All Links Button & Dropdown -->
		<div class="relative flex items-center">
			<button
				type="button"
				onclick={() => fileManager.copyAllCurrentFolderLinks()}
				disabled={fileManager.currentFileCount === 0 || fileManager.isCopyingLinks}
				title="Copy all {fileManager.currentFileCount} file links in this folder (1-click)"
				class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-l-md border transition-all disabled:opacity-50 disabled:cursor-not-allowed
				{fileManager.linkCopiedFeedback
					? 'bg-emerald-600 text-white border-emerald-600'
					: 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-200/80 shadow-xs'}"
			>
				{#if fileManager.linkCopiedFeedback}
					<Check class="w-3.5 h-3.5 text-white" />
					<span>Copied!</span>
				{:else if fileManager.isCopyingLinks}
					<RotateCw class="w-3.5 h-3.5 animate-spin text-blue-600" />
					<span>Copying...</span>
				{:else}
					<Link2 class="w-3.5 h-3.5 text-blue-600" />
					<span>Copy All Links</span>
					{#if fileManager.currentFileCount > 0}
						<span class="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[10px] font-mono font-bold">
							{fileManager.currentFileCount}
						</span>
					{/if}
				{/if}
			</button>

			<button
				type="button"
				onclick={(e) => {
					e.stopPropagation();
					isCopyMenuOpen = !isCopyMenuOpen;
				}}
				disabled={fileManager.currentFileCount === 0}
				title="Link options & formats"
				class="px-1.5 py-1 text-xs font-medium rounded-r-md border-y border-r transition-all disabled:opacity-50 disabled:cursor-not-allowed -ml-px
				{fileManager.linkCopiedFeedback
					? 'bg-emerald-600 text-white border-emerald-600'
					: 'bg-white hover:bg-zinc-50 text-zinc-500 hover:text-zinc-800 border-zinc-200/80 shadow-xs'}"
			>
				<ChevronDown class="w-3 h-3" />
			</button>

			<!-- Dropdown Menu -->
			{#if isCopyMenuOpen}
				<div
					bind:this={copyMenuRef}
					class="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-lg border border-zinc-200 shadow-xl py-1.5 text-xs text-zinc-700 z-50 animate-in fade-in zoom-in-95 duration-100"
				>
					<div class="px-3 py-1 text-[11px] font-semibold text-zinc-400 border-b border-zinc-100 mb-1 flex items-center justify-between">
						<span>COPY {fileManager.currentFileCount} FILE LINKS</span>
					</div>

					<button
						type="button"
						onclick={() => {
							fileManager.copyAllCurrentFolderLinks('public', 'plain');
							isCopyMenuOpen = false;
						}}
						class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-zinc-100 text-left transition-colors"
					>
						<div class="flex items-center gap-2">
							<Globe class="w-3.5 h-3.5 text-blue-500" />
							<div>
								<div class="font-medium text-zinc-800">Direct Public URLs</div>
								<div class="text-[10px] text-zinc-400">1 link per line (Clean)</div>
							</div>
						</div>
					</button>

					<button
						type="button"
						onclick={() => {
							fileManager.copyAllCurrentFolderLinks('presigned', 'plain');
							isCopyMenuOpen = false;
						}}
						class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-zinc-100 text-left transition-colors"
					>
						<div class="flex items-center gap-2">
							<ShieldCheck class="w-3.5 h-3.5 text-amber-500" />
							<div>
								<div class="font-medium text-zinc-800">Presigned URLs</div>
								<div class="text-[10px] text-zinc-400">Signed temporary links (1 hr)</div>
							</div>
						</div>
					</button>

					<div class="h-px bg-zinc-100 my-1"></div>

					<button
						type="button"
						onclick={() => {
							fileManager.copyAllCurrentFolderLinks(fileManager.linkTypePreference, 'markdown');
							isCopyMenuOpen = false;
						}}
						class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-100 text-left transition-colors"
					>
						<FileText class="w-3.5 h-3.5 text-zinc-500" />
						<span>Copy as Markdown</span>
					</button>

					<button
						type="button"
						onclick={() => {
							fileManager.copyAllCurrentFolderLinks(fileManager.linkTypePreference, 'json');
							isCopyMenuOpen = false;
						}}
						class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-100 text-left transition-colors"
					>
						<Code class="w-3.5 h-3.5 text-zinc-500" />
						<span>Copy as JSON Array</span>
					</button>

					<div class="h-px bg-zinc-100 my-1"></div>

					<button
						type="button"
						onclick={() => {
							fileManager.openLinksDialog(fileManager.processedItems, 'Copy All File Links');
							isCopyMenuOpen = false;
						}}
						class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 text-blue-600 text-left transition-colors font-medium"
					>
						<Maximize2 class="w-3.5 h-3.5" />
						<span>Preview & Customize Links...</span>
					</button>
				</div>
			{/if}
		</div>

		<!-- Primary Action Buttons -->
		<button
			type="button"
			onclick={() => (fileManager.createFolderOpen = true)}
			class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-50 border border-zinc-200/80 rounded-md shadow-xs transition-colors"
		>
			<FolderPlus class="w-3.5 h-3.5 text-amber-500" />
			<span>New Folder</span>
		</button>

		<button
			type="button"
			onclick={triggerUpload}
			class="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition-colors"
		>
			<Upload class="w-3.5 h-3.5" />
			<span>Upload</span>
		</button>

		<!-- Hidden file picker -->
		<input
			type="file"
			multiple
			bind:this={fileInputRef}
			onchange={handleFileSelected}
			class="hidden"
		/>
	</div>
</header>
