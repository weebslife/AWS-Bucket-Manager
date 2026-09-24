<script lang="ts">
	import { fileManager } from '$lib/stores/fileManager.svelte';
	import { ChevronRight, HardDrive, Folder, ArrowUp } from '@lucide/svelte';

	let segments = $derived.by(() => {
		const prefix = fileManager.currentPrefix;
		if (!prefix) return [];
		const parts = prefix.split('/').filter(Boolean);
		let cumulative = '';
		return parts.map((name) => {
			cumulative += name + '/';
			return {
				name,
				prefix: cumulative
			};
		});
	});
</script>

<nav aria-label="Breadcrumb" class="flex items-center gap-1 text-xs text-zinc-600 min-w-0">
	<!-- Up one level button -->
	<button
		type="button"
		onclick={() => fileManager.navigateUp()}
		disabled={!fileManager.currentPrefix}
		title="Go to parent directory"
		class="p-1 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
	>
		<ArrowUp class="w-3.5 h-3.5" />
	</button>

	<!-- Root / Bucket Link -->
	<button
		type="button"
		onclick={() => fileManager.navigateTo('')}
		class="flex items-center gap-1.5 px-1.5 py-1 rounded font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors {fileManager.currentPrefix === '' ? 'text-blue-600 bg-blue-50/60 font-semibold' : ''}"
	>
		<HardDrive class="w-3.5 h-3.5 text-zinc-500" />
		<span>{fileManager.bucket || 'Root'}</span>
	</button>

	<!-- Path Segments -->
	{#each segments as seg, idx (seg.prefix)}
		<ChevronRight class="w-3 h-3 text-zinc-400 shrink-0" />
		<button
			type="button"
			onclick={() => fileManager.navigateTo(seg.prefix)}
			class="flex items-center gap-1 px-1.5 py-1 rounded max-w-[140px] truncate hover:bg-zinc-200/60 transition-colors {idx === segments.length - 1 ? 'font-semibold text-zinc-900 bg-zinc-200/40' : 'text-zinc-600 hover:text-zinc-900'}"
			title={seg.name}
		>
			<Folder class="w-3 h-3 text-amber-500 shrink-0" />
			<span class="truncate">{seg.name}</span>
		</button>
	{/each}
</nav>
