import type {
	ListObjectsResponse,
	CreateFolderRequest,
	RenameRequest,
	CopyMoveRequest,
	DuplicateRequest,
	DeleteRequest,
	PresignedUrlResponse,
	BatchPresignedUrlResponse,
	S3Item
} from './types/s3';

export async function fetchFiles(prefix = ''): Promise<ListObjectsResponse> {
	const params = new URLSearchParams();
	if (prefix) params.set('prefix', prefix);

	const res = await fetch(`/api/files?${params.toString()}`);
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error || `Failed to fetch files (HTTP ${res.status})`);
	}
	return res.json();
}

export async function fetchFolderTree(): Promise<{ folders: string[]; configured: boolean }> {
	const res = await fetch('/api/files/tree');
	if (!res.ok) {
		return { folders: [], configured: false };
	}
	return res.json();
}

export async function createFolder(prefix: string, folderName: string): Promise<{ success: boolean; folderKey: string }> {
	const res = await fetch('/api/files/folder', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ prefix, folderName } as CreateFolderRequest)
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error || `Failed to create folder (HTTP ${res.status})`);
	}
	return res.json();
}

export async function renameItem(oldKey: string, newName: string, isFolder: boolean): Promise<{ success: boolean; newKey: string }> {
	const res = await fetch('/api/files/rename', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ oldKey, newName, isFolder } as RenameRequest)
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error || `Failed to rename item (HTTP ${res.status})`);
	}
	return res.json();
}

export async function deleteItems(keys: string[]): Promise<{ success: boolean; deletedCount: number }> {
	const res = await fetch('/api/files', {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ keys } as DeleteRequest)
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error || `Failed to delete items (HTTP ${res.status})`);
	}
	return res.json();
}

export async function copyItems(sourceKeys: string[], targetPrefix: string): Promise<{ success: boolean; copiedCount: number }> {
	const res = await fetch('/api/files/copy', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ sourceKeys, targetPrefix, operation: 'copy' } as CopyMoveRequest)
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error || `Failed to copy items (HTTP ${res.status})`);
	}
	return res.json();
}

export async function moveItems(sourceKeys: string[], targetPrefix: string): Promise<{ success: boolean; movedCount: number }> {
	const res = await fetch('/api/files/move', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ sourceKeys, targetPrefix, operation: 'move' } as CopyMoveRequest)
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error || `Failed to move items (HTTP ${res.status})`);
	}
	return res.json();
}

export async function duplicateItem(key: string): Promise<{ success: boolean; newKey: string }> {
	const res = await fetch('/api/files/duplicate', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ key } as DuplicateRequest)
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error || `Failed to duplicate item (HTTP ${res.status})`);
	}
	return res.json();
}

export async function getPresignedUrl(key: string, download = false, expiresIn = 3600): Promise<PresignedUrlResponse> {
	const params = new URLSearchParams({
		key,
		expiresIn: expiresIn.toString(),
		download: download.toString()
	});

	const res = await fetch(`/api/files/presigned-url?${params.toString()}`);
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error || `Failed to generate presigned URL (HTTP ${res.status})`);
	}
	return res.json();
}

export async function getBatchPresignedUrls(keys: string[], expiresIn = 3600): Promise<Record<string, string>> {
	if (keys.length === 0) return {};
	const res = await fetch('/api/files/presigned-url', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ keys, expiresIn })
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error || `Failed to generate batch presigned URLs (HTTP ${res.status})`);
	}
	const data: BatchPresignedUrlResponse = await res.json();
	return data.urls || {};
}

export async function fetchFolderFiles(prefix: string, recursive = false): Promise<S3Item[]> {
	const params = new URLSearchParams({ prefix });
	if (recursive) params.set('recursive', 'true');
	const res = await fetch(`/api/files?${params.toString()}`);
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error || `Failed to fetch files in folder (HTTP ${res.status})`);
	}
	const data: ListObjectsResponse = await res.json();
	// Return only file items
	return (data.items || []).filter((item) => item.type === 'file');
}

export async function getFolderObjectCount(prefix: string): Promise<number> {
	const params = new URLSearchParams({ prefix });
	const res = await fetch(`/api/files/count?${params.toString()}`);
	if (!res.ok) return 0;
	const data = await res.json();
	return data.count || 0;
}

export function uploadFileWithProgress(
	file: File,
	prefix: string,
	onProgress?: (percent: number) => void
): Promise<{ success: boolean; key: string }> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		const formData = new FormData();
		formData.append('prefix', prefix);
		formData.append('file', file);

		xhr.upload.addEventListener('progress', (e) => {
			if (onProgress) {
				if (e.lengthComputable && e.total > 0) {
					const pct = Math.round((e.loaded / e.total) * 100);
					onProgress(pct >= 100 ? 99 : pct);
				} else {
					onProgress(50);
				}
			}
		});

		xhr.addEventListener('load', () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				if (onProgress) onProgress(100);
				try {
					const data = JSON.parse(xhr.responseText);
					resolve({ success: true, key: data.uploadedKeys?.[0] || file.name });
				} catch {
					resolve({ success: true, key: file.name });
				}
			} else {
				try {
					const err = JSON.parse(xhr.responseText);
					reject(new Error(err.error || `Upload failed with status ${xhr.status}`));
				} catch {
					reject(new Error(`Upload failed with status ${xhr.status}`));
				}
			}
		});

		xhr.addEventListener('error', () => {
			reject(new Error('Network error during file upload'));
		});

		xhr.addEventListener('abort', () => {
			reject(new Error('Upload was aborted'));
		});

		xhr.open('POST', '/api/files/upload');
		xhr.send(formData);
	});
}
