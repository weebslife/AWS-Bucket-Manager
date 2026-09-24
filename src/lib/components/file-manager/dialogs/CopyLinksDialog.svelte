<script lang="ts">
	import { fileManager } from '$lib/stores/fileManager.svelte';
	import { getPublicS3Url, formatLinks, copyTextToClipboard, type LinkFormat } from '$lib/utils';
	import { getBatchPresignedUrls } from '$lib/api';
	import { toastStore } from '$lib/stores/toast.svelte';
	import {
		X,
		Copy,
		Check,
		Link2,
		ShieldCheck,
		Globe,
		FileText,
		Code,
		Loader2
	} from '@lucide/svelte';

	let linkType = $state<'public' | 'presigned'>(fileManager.linkTypePreference);
	let format = $state<LinkFormat>(fileManager.linkFormatPreference);
	let presignedMap = $state<Record<string, string>>({});
	let isLoadingPresigned = $state(false);
	let copied = $state(false);

	let items = $derived(fileManager.linksDialogItems);

	// Load presigned URLs when switching to presigned mode
	$effect(() => {
		if (linkType === 'presigned' && fileManager.linksDialogOpen && items.length > 0) {
			const missingKeys = items.filter((i) => !presignedMap[i.key]).map((i) => i.key);
			if (missingKeys.length > 0) {
				isLoadingPresigned = true;
				getBatchPresignedUrls(missingKeys, 3600)
					.then((urls) => {
						presignedMap = { ...presignedMap, ...urls };
					})
					.catch((err) => {
						toastStore.error('Failed to get presigned URLs', err.message);
					})
					.finally(() => {
						isLoadingPresigned = false;
					});
			}
		}
	});

	let formattedText = $derived.by(() => {
		const entries = items.map((item) => {
			let url = '';
			if (linkType === 'presigned') {
				url = presignedMap[item.key] || 'Loading presigned URL...';
			} else {
				url = item.publicUrl || getPublicS3Url(fileManager.bucket, fileManager.region, item.key);
			}
			return { name: item.name, url };
		});
		return formatLinks(entries, format);
	});

	async function handleCopy() {
		const success = await copyTextToClipboard(formattedText);
		if (success) {
			copied = true;
			toastStore.success(`Copied ${items.length} link${items.length > 1 ? 's' : ''} to clipboard!`);
			setTimeout(() => {
				copied = false;
			}, 2000);
		} else {
			toastStore.error('Failed to copy to clipboard');
		}
	}

	function close() {
		fileManager.linksDialogOpen = false;
		copied = false;
	}

	function handleLinkTypeChange(type: 'public' | 'presigned') {
		linkType = type;
		fileManager.setLinkTypePreference(type);
	}

	function handleFormatChange(fmt: LinkFormat) {
		format = fmt;
		fileManager.setLinkFormatPreference(fmt);
	}
</script>

{#if fileManager.linksDialogOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
		onclick={(e) => {
			if (e.target === e.currentTarget) close();
		}}
	>
		<div class="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
			<!-- Header -->
			<div class="px-5 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/80">
				<div class="flex items-center gap-2.5">
					<div class="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600">
						<Link2 class="w-4 h-4" />
					</div>
					<div>
						<h3 class="text-sm font-semibold text-zinc-900">
							{fileManager.linksDialogTitle || 'Copy File Links'}
						</h3>
						<p class="text-xs text-zinc-500">
							{items.length} file{items.length > 1 ? 's' : ''} selected
						</p>
					</div>
				</div>
				<button
					type="button"
					onclick={close}
					class="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200/60 transition-colors"
				>
					<X class="w-4 h-4" />
				</button>
			</div>

			<!-- Options Toolbar -->
			<div class="p-4 bg-zinc-50/50 border-b border-zinc-200 space-y-3">
				<!-- URL Type selector -->
				<div class="flex items-center justify-between gap-4">
					<span class="text-xs font-medium text-zinc-700">URL Type:</span>
					<div class="flex items-center gap-1 bg-zinc-200/70 p-0.5 rounded-lg text-xs">
						<button
							type="button"
							onclick={() => handleLinkTypeChange('public')}
							class="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all {linkType === 'public'
								? 'bg-white text-zinc-900 shadow-xs'
								: 'text-zinc-600 hover:text-zinc-900'}"
						>
							<Globe class="w-3.5 h-3.5 text-blue-500" />
							<span>Direct Public URL</span>
						</button>
						<button
							type="button"
							onclick={() => handleLinkTypeChange('presigned')}
							class="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all {linkType === 'presigned'
								? 'bg-white text-zinc-900 shadow-xs'
								: 'text-zinc-600 hover:text-zinc-900'}"
						>
							<ShieldCheck class="w-3.5 h-3.5 text-amber-500" />
							<span>Presigned URL (1h)</span>
						</button>
					</div>
				</div>

				<!-- Format selector -->
				<div class="flex items-center justify-between gap-4">
					<span class="text-xs font-medium text-zinc-700">Format:</span>
					<div class="flex items-center gap-1 bg-zinc-200/70 p-0.5 rounded-lg text-xs">
						<button
							type="button"
							onclick={() => handleFormatChange('plain')}
							class="px-2.5 py-1 rounded-md font-medium transition-all {format === 'plain'
								? 'bg-white text-zinc-900 shadow-xs'
								: 'text-zinc-600 hover:text-zinc-900'}"
						>
							Plain URLs
						</button>
						<button
							type="button"
							onclick={() => handleFormatChange('markdown')}
							class="px-2.5 py-1 rounded-md font-medium transition-all {format === 'markdown'
								? 'bg-white text-zinc-900 shadow-xs'
								: 'text-zinc-600 hover:text-zinc-900'}"
						>
							Markdown
						</button>
						<button
							type="button"
							onclick={() => handleFormatChange('html')}
							class="px-2.5 py-1 rounded-md font-medium transition-all {format === 'html'
								? 'bg-white text-zinc-900 shadow-xs'
								: 'text-zinc-600 hover:text-zinc-900'}"
						>
							HTML
						</button>
						<button
							type="button"
							onclick={() => handleFormatChange('json')}
							class="px-2.5 py-1 rounded-md font-medium transition-all {format === 'json'
								? 'bg-white text-zinc-900 shadow-xs'
								: 'text-zinc-600 hover:text-zinc-900'}"
						>
							JSON
						</button>
					</div>
				</div>
			</div>

			<!-- Live Preview Textarea -->
			<div class="p-4 flex-1 flex flex-col min-h-0 bg-white">
				<div class="flex items-center justify-between mb-2">
					<label for="link-preview" class="text-xs font-medium text-zinc-600 flex items-center gap-1.5">
						<span>Preview</span>
						{#if isLoadingPresigned}
							<span class="text-[11px] text-amber-600 flex items-center gap-1">
								<Loader2 class="w-3 h-3 animate-spin" />
								Generating signed URLs...
							</span>
						{/if}
					</label>
					<span class="text-[11px] text-zinc-400 font-mono">
						{items.length} line{items.length > 1 ? 's' : ''}
					</span>
				</div>

				<textarea
					id="link-preview"
					readonly
					value={formattedText}
					class="w-full h-48 p-3 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-800 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none selection:bg-blue-100"
					onclick={(e) => (e.target as HTMLTextAreaElement).select()}
				></textarea>
			</div>

			<!-- Footer -->
			<div class="px-5 py-3 border-t border-zinc-200 bg-zinc-50/80 flex items-center justify-between">
				<div class="text-[11px] text-zinc-500">
					{#if linkType === 'public'}
						Public direct links accessible anywhere if bucket is public
					{:else}
						Temporary signed links valid for 1 hour
					{/if}
				</div>

				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={close}
						class="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-md transition-colors"
					>
						Close
					</button>

					<button
						type="button"
						onclick={handleCopy}
						disabled={isLoadingPresigned}
						class="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition-colors disabled:opacity-50"
					>
						{#if copied}
							<Check class="w-3.5 h-3.5 text-white" />
							<span>Copied!</span>
						{:else}
							<Copy class="w-3.5 h-3.5" />
							<span>Copy to Clipboard</span>
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
