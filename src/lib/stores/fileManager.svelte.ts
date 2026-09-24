import type {
	S3Item,
	SortField,
	SortDirection,
	ViewMode,
	ClipboardState,
	UploadQueueItem
} from '$lib/types/s3';
import {
	fetchFiles,
	fetchFolderTree,
	createFolder as apiCreateFolder,
	renameItem as apiRenameItem,
	deleteItems as apiDeleteItems,
	copyItems as apiCopyItems,
	moveItems as apiMoveItems,
	duplicateItem as apiDuplicateItem,
	getPresignedUrl as apiGetPresignedUrl,
	getBatchPresignedUrls,
	fetchFolderFiles,
	getFolderObjectCount,
	uploadFileWithProgress
} from '$lib/api';
import {
	getPublicS3Url,
	formatLinks,
	copyTextToClipboard,
	type LinkFormat
} from '$lib/utils';
import { toastStore } from './toast.svelte';

export class FileManagerState {
	// Current folder path in S3 (e.g. "" or "images/wedding/")
	currentPrefix = $state<string>('');
	// File listing data
	items = $state<S3Item[]>([]);
	bucket = $state<string>('');
	region = $state<string>('');
	isLoading = $state<boolean>(false);
	isConfigured = $state<boolean>(true);
	error = $state<string | null>(null);

	// Selection state
	selectedKeys = $state<Set<string>>(new Set());
	lastSelectedKey = $state<string | null>(null);

	// Clipboard
	clipboard = $state<ClipboardState | null>(null);

	// View mode & preferences
	viewMode = $state<ViewMode>('grid');
	sortField = $state<SortField>('name');
	sortDirection = $state<SortDirection>('asc');
	searchQuery = $state<string>('');

	// Preview modal
	previewItem = $state<S3Item | null>(null);

	// Context menu
	contextMenu = $state<{
		x: number;
		y: number;
		item: S3Item | null;
		isFolder: boolean;
	} | null>(null);

	// Dialogs
	createFolderOpen = $state<boolean>(false);
	renameItem = $state<S3Item | null>(null);
	deleteItemsTarget = $state<S3Item[] | null>(null);
	deleteCount = $state<number>(0);
	isCountingDelete = $state<boolean>(false);
	configDialogOpen = $state<boolean>(false);

	// Upload queue
	uploadQueue = $state<UploadQueueItem[]>([]);
	isUploadQueueOpen = $state<boolean>(false);

	// Folder tree for sidebar navigation
	folderTree = $state<string[]>([]);

	// Link copy preferences & dialog state
	linkTypePreference = $state<'public' | 'presigned'>('public');
	linkFormatPreference = $state<LinkFormat>('plain');
	isCopyingLinks = $state<boolean>(false);
	linkCopiedFeedback = $state<boolean>(false);
	linksDialogOpen = $state<boolean>(false);
	linksDialogItems = $state<S3Item[]>([]);
	linksDialogTitle = $state<string>('');

	constructor() {
		if (typeof window !== 'undefined') {
			const savedMode = localStorage.getItem('s3_file_manager_view_mode') as ViewMode | null;
			if (savedMode === 'grid' || savedMode === 'list') {
				this.viewMode = savedMode;
			}

			const savedSortField = localStorage.getItem('s3_file_manager_sort_field') as SortField | null;
			if (savedSortField) this.sortField = savedSortField;

			const savedSortDir = localStorage.getItem('s3_file_manager_sort_dir') as SortDirection | null;
			if (savedSortDir) this.sortDirection = savedSortDir;

			const savedLinkType = localStorage.getItem('s3_link_type') as 'public' | 'presigned' | null;
			if (savedLinkType === 'public' || savedLinkType === 'presigned') {
				this.linkTypePreference = savedLinkType;
			}

			const savedLinkFormat = localStorage.getItem('s3_link_format') as LinkFormat | null;
			if (savedLinkFormat) {
				this.linkFormatPreference = savedLinkFormat;
			}
		}
	}

	setViewMode(mode: ViewMode) {
		this.viewMode = mode;
		if (typeof window !== 'undefined') {
			localStorage.setItem('s3_file_manager_view_mode', mode);
		}
	}

	setSort(field: SortField) {
		if (this.sortField === field) {
			this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			this.sortField = field;
			this.sortDirection = 'asc';
		}
		if (typeof window !== 'undefined') {
			localStorage.setItem('s3_file_manager_sort_field', this.sortField);
			localStorage.setItem('s3_file_manager_sort_dir', this.sortDirection);
		}
	}

	// Filtered & sorted items
	get processedItems(): S3Item[] {
		let list = [...this.items];

		// Search filtering
		if (this.searchQuery.trim()) {
			const q = this.searchQuery.trim().toLowerCase();
			list = list.filter((item) => item.name.toLowerCase().includes(q) || item.key.toLowerCase().includes(q));
		}

		// Folders always appear first, then sorted
		list.sort((a, b) => {
			if (a.type !== b.type) {
				return a.type === 'folder' ? -1 : 1;
			}

			let compare = 0;
			switch (this.sortField) {
				case 'name':
					compare = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
					break;
				case 'size':
					compare = a.size - b.size;
					break;
				case 'type':
					const extA = a.extension || '';
					const extB = b.extension || '';
					compare = extA.localeCompare(extB);
					break;
				case 'lastModified':
					const timeA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
					const timeB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
					compare = timeA - timeB;
					break;
			}

			return this.sortDirection === 'asc' ? compare : -compare;
		});

		return list;
	}

	// Load files in current prefix
	async loadFiles(prefix = this.currentPrefix) {
		this.isLoading = true;
		this.error = null;
		this.currentPrefix = prefix;

		try {
			const res = await fetchFiles(prefix);
			this.items = res.items;
			this.bucket = res.bucket;
			this.region = res.region;
			this.isConfigured = res.configured;
			if (!res.configured && res.error) {
				this.error = res.error;
			}
			// Clear selections that are not in current prefix
			this.selectedKeys = new Set();
			this.lastSelectedKey = null;
		} catch (err: any) {
			this.error = err.message || 'Failed to load files';
			toastStore.error('Error listing objects', err.message);
		} finally {
			this.isLoading = false;
		}

		// Also refresh folder tree in background
		this.refreshFolderTree();
	}

	async refreshFolderTree() {
		try {
			const { folders, configured } = await fetchFolderTree();
			this.folderTree = folders;
			if (configured !== undefined) this.isConfigured = configured;
		} catch {
			// silently ignore folder tree refresh errors
		}
	}

	// Navigation
	navigateTo(prefix: string) {
		this.currentPrefix = prefix;
		this.searchQuery = '';
		this.loadFiles(prefix);
	}

	navigateUp() {
		if (!this.currentPrefix) return;
		const trimmed = this.currentPrefix.replace(/\/$/, '');
		const lastSlash = trimmed.lastIndexOf('/');
		const parentPrefix = lastSlash !== -1 ? trimmed.substring(0, lastSlash + 1) : '';
		this.navigateTo(parentPrefix);
	}

	// Selection helpers
	selectItem(item: S3Item, multi = false, shift = false) {
		const newSet = new Set(multi ? this.selectedKeys : []);

		if (shift && this.lastSelectedKey) {
			const items = this.processedItems;
			const lastIdx = items.findIndex((i) => i.key === this.lastSelectedKey);
			const currentIdx = items.findIndex((i) => i.key === item.key);

			if (lastIdx !== -1 && currentIdx !== -1) {
				const start = Math.min(lastIdx, currentIdx);
				const end = Math.max(lastIdx, currentIdx);
				for (let i = start; i <= end; i++) {
					newSet.add(items[i].key);
				}
			} else {
				newSet.add(item.key);
			}
		} else if (multi) {
			if (newSet.has(item.key)) {
				newSet.delete(item.key);
			} else {
				newSet.add(item.key);
			}
		} else {
			newSet.add(item.key);
		}

		this.selectedKeys = newSet;
		this.lastSelectedKey = item.key;
	}

	selectAll() {
		this.selectedKeys = new Set(this.processedItems.map((i) => i.key));
	}

	clearSelection() {
		this.selectedKeys = new Set();
		this.lastSelectedKey = null;
	}

	get selectedItems(): S3Item[] {
		return this.items.filter((i) => this.selectedKeys.has(i.key));
	}

	// Clipboard actions
	copySelection() {
		const selected = this.selectedItems;
		if (selected.length === 0) return;
		this.clipboard = {
			items: selected,
			operation: 'copy'
		};
		toastStore.info(`Copied ${selected.length} item${selected.length > 1 ? 's' : ''}`);
	}

	cutSelection() {
		const selected = this.selectedItems;
		if (selected.length === 0) return;
		this.clipboard = {
			items: selected,
			operation: 'cut'
		};
		toastStore.info(`Cut ${selected.length} item${selected.length > 1 ? 's' : ''}`);
	}

	async pasteClipboard() {
		if (!this.clipboard || this.clipboard.items.length === 0) return;
		const { items, operation } = this.clipboard;
		const targetPrefix = this.currentPrefix;
		const keys = items.map((i) => i.key);

		try {
			if (operation === 'copy') {
				const res = await apiCopyItems(keys, targetPrefix);
				toastStore.success(`Copied ${res.copiedCount} item${res.copiedCount > 1 ? 's' : ''}`);
			} else {
				const res = await apiMoveItems(keys, targetPrefix);
				toastStore.success(`Moved ${res.movedCount} item${res.movedCount > 1 ? 's' : ''}`);
				this.clipboard = null; // Clear cut clipboard
			}
			await this.loadFiles();
		} catch (err: any) {
			toastStore.error(`Failed to ${operation} items`, err.message);
		}
	}

	// Duplicate
	async duplicate(item: S3Item) {
		if (item.type === 'folder') {
			toastStore.warning('Duplicating folders is not supported');
			return;
		}
		try {
			const res = await apiDuplicateItem(item.key);
			toastStore.success(`Duplicated to ${res.newKey.split('/').pop()}`);
			await this.loadFiles();
		} catch (err: any) {
			toastStore.error('Failed to duplicate item', err.message);
		}
	}

	// Move item(s) to target folder
	async moveToFolder(sourceKeys: string[], targetPrefix: string) {
		try {
			const res = await apiMoveItems(sourceKeys, targetPrefix);
			const folderName = targetPrefix.replace(/\/$/, '').split('/').pop() || 'folder';
			toastStore.success(`Moved ${res.movedCount} item${res.movedCount > 1 ? 's' : ''} to ${folderName}`);
			await this.loadFiles();
		} catch (err: any) {
			toastStore.error('Move failed', err.message);
		}
	}

	// Delete confirmation setup
	async confirmDelete(items: S3Item[]) {
		if (items.length === 0) return;
		this.deleteItemsTarget = items;
		this.deleteCount = 0;
		this.isCountingDelete = true;

		// Check if any folder is in the items
		const folders = items.filter((i) => i.type === 'folder');
		if (folders.length > 0) {
			let total = items.filter((i) => i.type === 'file').length;
			for (const f of folders) {
				const c = await getFolderObjectCount(f.key);
				total += c;
			}
			this.deleteCount = total;
		} else {
			this.deleteCount = items.length;
		}
		this.isCountingDelete = false;
	}

	async executeDelete() {
		if (!this.deleteItemsTarget || this.deleteItemsTarget.length === 0) return;
		const keys = this.deleteItemsTarget.map((i) => i.key);
		try {
			const res = await apiDeleteItems(keys);
			toastStore.success(`Deleted ${res.deletedCount} object${res.deletedCount > 1 ? 's' : ''}`);
			this.deleteItemsTarget = null;
			this.clearSelection();
			await this.loadFiles();
		} catch (err: any) {
			toastStore.error('Delete failed', err.message);
		}
	}

	// Create Folder
	async createFolder(name: string) {
		try {
			await apiCreateFolder(this.currentPrefix, name);
			toastStore.success(`Folder '${name}' created`);
			this.createFolderOpen = false;
			await this.loadFiles();
		} catch (err: any) {
			toastStore.error('Create folder failed', err.message);
		}
	}

	// Rename Item
	async executeRename(newName: string) {
		if (!this.renameItem) return;
		try {
			await apiRenameItem(this.renameItem.key, newName, this.renameItem.type === 'folder');
			toastStore.success(`Renamed to '${newName}'`);
			this.renameItem = null;
			await this.loadFiles();
		} catch (err: any) {
			toastStore.error('Rename failed', err.message);
		}
	}

	setLinkTypePreference(type: 'public' | 'presigned') {
		this.linkTypePreference = type;
		if (typeof window !== 'undefined') {
			localStorage.setItem('s3_link_type', type);
		}
	}

	setLinkFormatPreference(format: LinkFormat) {
		this.linkFormatPreference = format;
		if (typeof window !== 'undefined') {
			localStorage.setItem('s3_link_format', format);
		}
	}

	get currentFileCount(): number {
		return this.processedItems.filter((i) => i.type === 'file').length;
	}

	get selectedFileCount(): number {
		return this.selectedItems.filter((i) => i.type === 'file').length;
	}

	// Copy Links for a set of items (only includes files, never folders)
	async copyItemsLinks(
		items: S3Item[],
		options?: {
			linkType?: 'public' | 'presigned';
			format?: LinkFormat;
			label?: string;
		}
	) {
		const fileItems = items.filter((i) => i.type === 'file');
		if (fileItems.length === 0) {
			toastStore.warning('No files found to copy', 'Folders do not have direct file links.');
			return;
		}

		const linkType = options?.linkType || this.linkTypePreference;
		const format = options?.format || this.linkFormatPreference;
		this.isCopyingLinks = true;

		try {
			let formattedEntries: { name: string; url: string }[] = [];

			if (linkType === 'presigned') {
				const keys = fileItems.map((i) => i.key);
				const presignedMap = await getBatchPresignedUrls(keys, 3600);
				formattedEntries = fileItems.map((item) => ({
					name: item.name,
					url: presignedMap[item.key] || item.publicUrl || getPublicS3Url(this.bucket, this.region, item.key)
				}));
			} else {
				formattedEntries = fileItems.map((item) => ({
					name: item.name,
					url: item.publicUrl || getPublicS3Url(this.bucket, this.region, item.key)
				}));
			}

			const formattedText = formatLinks(formattedEntries, format);
			const success = await copyTextToClipboard(formattedText);

			if (success) {
				this.linkCopiedFeedback = true;
				setTimeout(() => {
					this.linkCopiedFeedback = false;
				}, 2000);

				const countStr = `${fileItems.length} file link${fileItems.length > 1 ? 's' : ''}`;
				const labelStr = options?.label ? ` from ${options.label}` : '';
				toastStore.success(`Copied ${countStr}${labelStr}!`, linkType === 'presigned' ? 'Presigned URLs (valid 1 hr)' : 'Direct S3 URLs');
			} else {
				toastStore.error('Clipboard copy failed', 'Unable to write to clipboard');
			}
		} catch (err: any) {
			toastStore.error('Failed to copy links', err.message);
		} finally {
			this.isCopyingLinks = false;
		}
	}

	async copyAllCurrentFolderLinks(linkType?: 'public' | 'presigned', format?: LinkFormat) {
		const folderName = this.currentPrefix
			? this.currentPrefix.replace(/\/$/, '').split('/').pop() || 'current folder'
			: 'all files';
		await this.copyItemsLinks(this.processedItems, {
			linkType,
			format,
			label: `"${folderName}"`
		});
	}

	async copySelectedLinks(linkType?: 'public' | 'presigned', format?: LinkFormat) {
		await this.copyItemsLinks(this.selectedItems, {
			linkType,
			format,
			label: 'selection'
		});
	}

	async copyFolderLinks(folderKey: string, folderName?: string, linkType?: 'public' | 'presigned', format?: LinkFormat) {
		const name = folderName || folderKey.replace(/\/$/, '').split('/').pop() || folderKey;
		this.isCopyingLinks = true;
		try {
			let files = await fetchFolderFiles(folderKey, false);
			if (files.length === 0) {
				files = await fetchFolderFiles(folderKey, true);
			}

			if (files.length === 0) {
				toastStore.info(`No files in "${name}"`, 'This folder is empty or only contains other folders.');
				return;
			}

			await this.copyItemsLinks(files, {
				linkType,
				format,
				label: `"${name}"`
			});
		} catch (err: any) {
			toastStore.error(`Failed to copy folder links for "${name}"`, err.message);
		} finally {
			this.isCopyingLinks = false;
		}
	}

	async copyPublicUrl(item: S3Item) {
		if (item.type !== 'file') return;
		const url = item.publicUrl || getPublicS3Url(this.bucket, this.region, item.key);
		const success = await copyTextToClipboard(url);
		if (success) {
			toastStore.success('Direct S3 URL copied to clipboard');
		} else {
			toastStore.error('Failed to copy URL');
		}
	}

	openLinksDialog(items: S3Item[], title = 'Copy File Links') {
		const files = items.filter((i) => i.type === 'file');
		if (files.length === 0) {
			toastStore.warning('No files to copy', 'Folders do not have direct file links.');
			return;
		}
		this.linksDialogItems = files;
		this.linksDialogTitle = title;
		this.linksDialogOpen = true;
	}

	// Presigned URL
	async copyPresignedUrl(item: S3Item) {
		try {
			const res = await apiGetPresignedUrl(item.key, false, 3600);
			const success = await copyTextToClipboard(res.url);
			if (success) {
				toastStore.success('Presigned URL copied to clipboard (valid 1 hour)');
			} else {
				toastStore.error('Clipboard copy failed');
			}
		} catch (err: any) {
			toastStore.error('Failed to generate presigned URL', err.message);
		}
	}

	async downloadItem(item: S3Item) {
		try {
			const res = await apiGetPresignedUrl(item.key, true, 60);
			const a = document.createElement('a');
			a.href = res.url;
			a.download = item.name;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		} catch (err: any) {
			toastStore.error('Failed to initiate download', err.message);
		}
	}

	updateUploadItem(id: string, updates: Partial<UploadQueueItem>) {
		const index = this.uploadQueue.findIndex((u) => u.id === id);
		if (index !== -1) {
			this.uploadQueue[index] = { ...this.uploadQueue[index], ...updates };
		}
	}

	// Upload queue management
	async enqueueUploads(files: FileList | File[]) {
		const newEntries: { id: string; file: File }[] = [];
		const currentPref = this.currentPrefix;

		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			const id = Math.random().toString(36).substring(2, 9);
			const queueItem: UploadQueueItem = {
				id,
				name: file.name,
				size: file.size,
				progress: 0,
				status: 'pending',
				targetKey: `${currentPref}${file.name}`
			};
			newEntries.push({ id, file });
			this.uploadQueue.push(queueItem);
		}

		this.isUploadQueueOpen = true;

		// Process uploads sequentially
		for (const { id, file } of newEntries) {
			this.updateUploadItem(id, { status: 'uploading', progress: 0 });

			try {
				await uploadFileWithProgress(file, currentPref, (pct) => {
					this.updateUploadItem(id, { progress: Math.min(pct, 99) });
				});
				this.updateUploadItem(id, { status: 'completed', progress: 100 });
			} catch (err: any) {
				this.updateUploadItem(id, { status: 'error', error: err.message || 'Upload failed' });
				toastStore.error(`Upload failed: ${file.name}`, err.message);
			}
		}

		// Refresh file list after batch upload completes
		await this.loadFiles();
	}

	clearCompletedUploads() {
		this.uploadQueue = this.uploadQueue.filter((u) => u.status !== 'completed');
		if (this.uploadQueue.length === 0) {
			this.isUploadQueueOpen = false;
		}
	}
}

export const fileManager = new FileManagerState();
