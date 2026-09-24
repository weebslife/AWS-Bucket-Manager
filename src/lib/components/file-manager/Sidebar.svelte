<script lang="ts">
	import { fileManager } from '$lib/stores/fileManager.svelte';
	import { formatBytes } from '$lib/utils';
	import {
		Folder,
		HardDrive,
		Cloud,
		Settings,
		Plus,
		ChevronRight,
		CheckCircle2,
		AlertCircle,
		Layers
	} from '@lucide/svelte';

	let rootIsActive = $derived(fileManager.currentPrefix === '');

	let selectedSize = $derived.by(() => {
		return fileManager.selectedItems.reduce((acc, i) => acc + i.size, 0);
	});
</script>

<aside class="w-60 shrink-0 bg-zinc-100/80 border-r border-zinc-200/80 flex flex-col h-full select-none">
	<!-- App Brand Header -->
	<div class="h-12 px-4 border-b border-zinc-200/80 flex items-center justify-between">
		<div class="flex items-center gap-2">
			<div class="w-7 h-7 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
				<Cloud class="w-4 h-4" />
			</div>
			<div>
				<h1 class="text-xs font-semibold text-zinc-900 tracking-tight leading-none">S3 Manager</h1>
				<span class="text-[10px] text-zinc-500 font-mono">Desktop Edition</span>
			</div>
		</div>

		<!-- Status indicator -->
		<div
			class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium {fileManager.isConfigured
				? 'text-emerald-700 bg-emerald-100/60'
				: 'text-rose-700 bg-rose-100/60'}"
			title={fileManager.isConfigured ? 'AWS S3 Connected' : 'Configuration Missing'}
		>
			<span class="w-1.5 h-1.5 rounded-full {fileManager.isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}"></span>
			<span>{fileManager.isConfigured ? 'Live' : 'Setup'}</span>
		</div>
	</div>

	<!-- Bucket Info Card -->
	<div class="p-3 mx-2 mt-2 rounded-lg bg-white/70 border border-zinc-200/70 shadow-xs">
		<div class="flex items-center gap-2 mb-1.5">
			<HardDrive class="w-3.5 h-3.5 text-zinc-500 shrink-0" />
			<span class="text-xs font-semibold text-zinc-800 truncate" title={fileManager.bucket || 'S3 Bucket'}>
				{fileManager.bucket || 'No Bucket Configured'}
			</span>
		</div>
		<div class="flex items-center justify-between text-[10px] text-zinc-500">
			<span>Region</span>
			<span class="font-mono bg-zinc-100 px-1 py-0.5 rounded border border-zinc-200">{fileManager.region || 'us-east-1'}</span>
		</div>
	</div>

	<!-- Navigation Section -->
	<div class="flex-1 overflow-y-auto px-2 py-3 space-y-4">
		<!-- Main Navigation -->
		<div>
			<div class="px-2 mb-1 flex items-center justify-between">
				<span class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Favorites</span>
			</div>

			<button
				type="button"
				onclick={() => fileManager.navigateTo('')}
				class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left {rootIsActive
					? 'bg-blue-600 text-white shadow-xs'
					: 'text-zinc-700 hover:bg-zinc-200/70'}"
			>
				<Layers class="w-3.5 h-3.5 {rootIsActive ? 'text-white' : 'text-zinc-500'}" />
				<span class="flex-1 truncate">All Files</span>
				<span class="text-[10px] opacity-75 font-mono">
					{fileManager.currentPrefix === '' ? fileManager.items.length : ''}
				</span>
			</button>
		</div>

		<!-- Folders Directory -->
		<div>
			<div class="px-2 mb-1.5 flex items-center justify-between">
				<span class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Folders</span>
				<button
					type="button"
					onclick={() => (fileManager.createFolderOpen = true)}
					title="New Folder"
					class="p-0.5 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/80 transition-colors"
				>
					<Plus class="w-3.5 h-3.5" />
				</button>
			</div>

			<div class="space-y-0.5">
				{#if fileManager.folderTree.length === 0}
					<div class="px-2.5 py-2 text-[11px] text-zinc-400 italic">No root folders</div>
				{:else}
					{#each fileManager.folderTree as folderPrefix (folderPrefix)}
						{@const isSelected = fileManager.currentPrefix === folderPrefix}
						{@const folderName = folderPrefix.replace(/\/$/, '').split('/').pop() || folderPrefix}
						<button
							type="button"
							onclick={() => fileManager.navigateTo(folderPrefix)}
							class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left {isSelected
								? 'bg-blue-600 text-white shadow-xs'
								: 'text-zinc-700 hover:bg-zinc-200/70'}"
						>
							<Folder class="w-3.5 h-3.5 {isSelected ? 'text-white' : 'text-amber-500'}" />
							<span class="flex-1 truncate">{folderName}</span>
							<ChevronRight class="w-3 h-3 opacity-40" />
						</button>
					{/each}
				{/if}
			</div>
		</div>
	</div>

	<!-- Storage / Selection Summary -->
	{#if fileManager.selectedKeys.size > 0}
		<div class="px-3 py-2.5 mx-2 mb-2 bg-blue-50 border border-blue-200/70 rounded-lg text-xs text-blue-900">
			<div class="font-medium flex items-center justify-between">
				<span>Selected</span>
				<span class="font-mono font-semibold">{fileManager.selectedKeys.size}</span>
			</div>
			<div class="text-[11px] text-blue-700 mt-0.5">
				{formatBytes(selectedSize)}
			</div>
		</div>
	{/if}

	<!-- Sidebar Footer -->
	<div class="p-2 border-t border-zinc-200/80 flex items-center justify-between">
		<button
			type="button"
			onclick={() => (fileManager.configDialogOpen = true)}
			class="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors w-full"
		>
			<Settings class="w-3.5 h-3.5 text-zinc-500" />
			<span>Configuration</span>
		</button>
	</div>
</aside>
