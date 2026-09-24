export type S3ItemType = 'file' | 'folder';

export interface S3Item {
	key: string;
	name: string;
	type: S3ItemType;
	prefix: string;
	size: number;
	lastModified?: string;
	etag?: string;
	extension?: string;
	isImage: boolean;
	thumbnailUrl?: string;
	contentType?: string;
	publicUrl?: string;
}

export interface S3Breadcrumb {
	name: string;
	prefix: string;
}

export interface ListObjectsResponse {
	items: S3Item[];
	prefix: string;
	bucket: string;
	region: string;
	isTruncated: boolean;
	nextContinuationToken?: string;
	totalCount: number;
	configured: boolean;
	error?: string;
}

export type SortField = 'name' | 'size' | 'type' | 'lastModified';
export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list';

export interface ClipboardState {
	items: S3Item[];
	operation: 'copy' | 'cut';
}

export interface UploadQueueItem {
	id: string;
	name: string;
	size: number;
	progress: number;
	status: 'pending' | 'uploading' | 'completed' | 'error';
	error?: string;
	targetKey: string;
}

export interface CreateFolderRequest {
	prefix: string;
	folderName: string;
}

export interface RenameRequest {
	oldKey: string;
	newName: string;
	isFolder: boolean;
}

export interface DeleteRequest {
	keys: string[];
}

export interface CopyMoveRequest {
	sourceKeys: string[];
	targetPrefix: string;
	operation: 'copy' | 'move';
}

export interface DuplicateRequest {
	key: string;
}

export interface PresignedUrlResponse {
	url: string;
	key: string;
	expiresIn: number;
}

export interface BatchPresignedUrlRequest {
	keys: string[];
	expiresIn?: number;
}

export interface BatchPresignedUrlResponse {
	urls: Record<string, string>;
	expiresIn: number;
}
