<script lang="ts">
	import { onMount } from 'svelte';
	import { fileManager } from '$lib/stores/fileManager.svelte';
	import Sidebar from './Sidebar.svelte';
	import Toolbar from './Toolbar.svelte';
	import FileGrid from './FileGrid.svelte';
	import FileList from './FileList.svelte';
	import ContextMenu from './ContextMenu.svelte';
	import PreviewModal from './PreviewModal.svelte';
	import UploadQueue from './UploadQueue.svelte';
	import Toaster from './Toaster.svelte';
	import CreateFolderDialog from './dialogs/CreateFolderDialog.svelte';
	import RenameDialog from './dialogs/RenameDialog.svelte';
	import DeleteConfirmationDialog from './dialogs/DeleteConfirmationDialog.svelte';
	import AwsConfigDialog from './dialogs/AwsConfigDialog.svelte';
	import CopyLinksDialog from './dialogs/CopyLinksDialog.svelte';
	import { AlertCircle, Key, RefreshCw } from '@lucide/svelte';

	onMount(() => {
		fileManager.loadFiles();
	});

	// Global Keyboard Shortcuts handler
	function handleGlobalKeyDown(e: KeyboardEvent) {
		// Do not interfere with text inputs, textareas, or contenteditables
		const target = e.target as HTMLElement;
		if (
			target &&
			(target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.isContentEditable)
		) {
			return;
		}

		const isCmd = e.metaKey || e.ctrlKey;

		// Cmd/Ctrl + A -> Select all
		if (isCmd && (e.key === 'a' || e.key === 'A')) {
			e.preventDefault();
			fileManager.selectAll();
			return;
		}

		// Cmd/Ctrl + C -> Copy
		if (isCmd && (e.key === 'c' || e.key === 'C')) {
			e.preventDefault();
			fileManager.copySelection();
			return;
		}

		// Cmd/Ctrl + X -> Cut
		if (isCmd && (e.key === 'x' || e.key === 'X')) {
			e.preventDefault();
			fileManager.cutSelection();
			return;
		}

		// Cmd/Ctrl + V -> Paste
		if (isCmd && (e.key === 'v' || e.key === 'V')) {
			e.preventDefault();
			fileManager.pasteClipboard();
			return;
		}

		// Delete / Backspace -> Delete
		if (e.key === 'Delete' || e.key === 'Backspace') {
			if (fileManager.selectedKeys.size > 0 && !fileManager.previewItem) {
				e.preventDefault();
				fileManager.confirmDelete(fileManager.selectedItems);
				return;
			}
		}

		// Escape -> Close modal / context menu / clear selection
		if (e.key === 'Escape') {
			if (fileManager.contextMenu) {
				fileManager.contextMenu = null;
			} else if (fileManager.previewItem) {
				fileManager.previewItem = null;
			} else if (fileManager.createFolderOpen) {
				fileManager.createFolderOpen = false;
			} else if (fileManager.renameItem) {
				fileManager.renameItem = null;
			} else if (fileManager.deleteItemsTarget) {
				fileManager.deleteItemsTarget = null;
			} else if (fileManager.configDialogOpen) {
				fileManager.configDialogOpen = false;
			} else if (fileManager.linksDialogOpen) {
				fileManager.linksDialogOpen = false;
			} else {
				fileManager.clearSelection();
			}
			return;
		}

		// Enter -> Open selected item if exactly 1 is selected
		if (e.key === 'Enter') {
			if (fileManager.selectedItems.length === 1 && !fileManager.previewItem) {
				const item = fileManager.selectedItems[0];
				if (item.type === 'folder') {
					fileManager.navigateTo(item.key);
				} else if (item.isImage) {
					fileManager.previewItem = item;
				}
			}
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeyDown} />

<div class="h-screen w-screen flex overflow-hidden bg-white text-zinc-900 select-none">
	<!-- Left Sidebar -->
	<Sidebar />

	<!-- Main Content Area -->
	<main class="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-zinc-50/50">
		<!-- Top Toolbar -->
		<Toolbar />

		<!-- Error or Unconfigured Alert Banner -->
		{#if !fileManager.isConfigured}
			<div class="m-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900 shadow-xs shrink-0">
				<div class="flex items-center gap-2.5">
					<Key class="w-4 h-4 text-amber-600 shrink-0" />
					<div>
						<span class="font-semibold">AWS S3 credentials not configured.</span>
						<span class="text-amber-800 ml-1">
							Set <code>AWS_ACCESS_KEY_ID</code>, <code>AWS_SECRET_ACCESS_KEY</code>, and <code>S3_BUCKET</code> in <code>.env</code>.
						</span>
					</div>
				</div>
				<button
					type="button"
					onclick={() => (fileManager.configDialogOpen = true)}
					class="px-2.5 py-1 font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors shrink-0"
				>
					View Setup
				</button>
			</div>
		{:else if fileManager.error}
			<div class="m-3 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-xs text-rose-900 shadow-xs shrink-0">
				<div class="flex items-center gap-2.5">
					<AlertCircle class="w-4 h-4 text-rose-600 shrink-0" />
					<div class="truncate">
						<span class="font-semibold">S3 Error:</span>
						<span class="text-rose-800 ml-1">{fileManager.error}</span>
					</div>
				</div>
				<button
					type="button"
					onclick={() => fileManager.loadFiles()}
					class="flex items-center gap-1 px-2.5 py-1 font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors shrink-0"
				>
					<RefreshCw class="w-3 h-3" />
					<span>Retry</span>
				</button>
			</div>
		{/if}

		<!-- Files / Folders Area -->
		<div class="flex-1 flex flex-col min-h-0 relative">
			{#if fileManager.viewMode === 'grid'}
				<FileGrid />
			{:else}
				<FileList />
			{/if}
		</div>
	</main>

	<!-- Context Menu -->
	<ContextMenu />

	<!-- Image Preview Modal -->
	<PreviewModal />

	<!-- Floating Upload Queue -->
	<UploadQueue />

	<!-- Dialogs -->
	<CreateFolderDialog />
	<RenameDialog />
	<DeleteConfirmationDialog />
	<AwsConfigDialog />
	<CopyLinksDialog />

	<!-- Toast Notifications Container -->
	<Toaster />
</div>
