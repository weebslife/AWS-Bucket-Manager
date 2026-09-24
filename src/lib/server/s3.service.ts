import {
	S3Client,
	ListObjectsV2Command,
	PutObjectCommand,
	DeleteObjectCommand,
	DeleteObjectsCommand,
	CopyObjectCommand,
	HeadObjectCommand,
	GetObjectCommand,
	type _Object,
	type CommonPrefix,
	type ListObjectsV2CommandOutput
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '$env/dynamic/private';
import type { S3Item, ListObjectsResponse } from '$lib/types/s3';
import { isImageFile, getFileExtension } from '$lib/utils';

export class S3ServiceError extends Error {
	constructor(
		message: string,
		public statusCode: number = 500,
		public code?: string
	) {
		super(message);
		this.name = 'S3ServiceError';
	}
}

class S3Service {
	private client: S3Client | null = null;
	private currentBucket: string = '';
	private currentRegion: string = '';

	private getClient(): { client: S3Client; bucket: string; region: string } {
		const region = env.AWS_REGION || process.env.AWS_REGION || 'us-east-1';
		const accessKeyId = env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '';
		const secretAccessKey = env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '';
		const bucket = env.S3_BUCKET || process.env.S3_BUCKET || '';
		const endpoint = env.S3_ENDPOINT || process.env.S3_ENDPOINT || undefined;
		const forcePathStyle = (env.S3_FORCE_PATH_STYLE || process.env.S3_FORCE_PATH_STYLE) === 'true';

		if (!bucket || !accessKeyId || !secretAccessKey) {
			throw new S3ServiceError(
				'AWS credentials or S3 bucket not configured. Please set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET in .env.',
				400,
				'NOT_CONFIGURED'
			);
		}

		if (!this.client || this.currentBucket !== bucket || this.currentRegion !== region) {
			this.client = new S3Client({
				region,
				credentials: {
					accessKeyId,
					secretAccessKey
				},
				endpoint: endpoint || undefined,
				forcePathStyle
			});
			this.currentBucket = bucket;
			this.currentRegion = region;
		}

		return { client: this.client, bucket, region };
	}

	public isConfigured(): boolean {
		try {
			const accessKeyId = env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
			const secretAccessKey = env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
			const bucket = env.S3_BUCKET || process.env.S3_BUCKET;
			return Boolean(accessKeyId && secretAccessKey && bucket);
		} catch {
			return false;
		}
	}

	public sanitizeKey(key: string, isPrefix: boolean = false): string {
		let clean = key.trim().replace(/\\/g, '/');
		// Remove leading slashes
		clean = clean.replace(/^\/+/, '');
		// Normalize multiple slashes
		clean = clean.replace(/\/+/g, '/');
		// Prevent path traversal
		clean = clean
			.split('/')
			.filter((part) => part !== '.' && part !== '..')
			.join('/');

		if (isPrefix && clean && !clean.endsWith('/')) {
			clean += '/';
		}
		return clean;
	}

	private handleAwsError(error: any, actionDescription: string): never {
		console.error(`S3 Error during ${actionDescription}:`, error);

		if (error instanceof S3ServiceError) {
			throw error;
		}

		const code = error.name || error.Code || error.$metadata?.httpStatusCode;

		if (code === 'AccessDenied' || error.name === 'AccessDeniedException') {
			throw new S3ServiceError('Access denied: Check your AWS credentials and IAM permissions for this S3 bucket.', 403, 'AccessDenied');
		}
		if (code === 'NoSuchBucket') {
			throw new S3ServiceError(`S3 bucket '${this.currentBucket}' does not exist or you do not have permission to access it.`, 404, 'NoSuchBucket');
		}
		if (code === 'NoSuchKey' || code === 404) {
			throw new S3ServiceError('The requested file or folder was not found in S3.', 404, 'NoSuchKey');
		}
		if (error.name === 'TimeoutError' || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
			throw new S3ServiceError('Network connection to AWS S3 failed. Please check your internet connection and S3 region endpoint.', 503, 'NetworkError');
		}

		const message = error.message || 'An unexpected error occurred while communicating with AWS S3.';
		throw new S3ServiceError(`${actionDescription} failed: ${message}`, 500, code);
	}

	/**
	 * List objects and folders at the given prefix with Delimiter '/'
	 */
	public async listObjects(prefix = '', continuationToken?: string): Promise<ListObjectsResponse> {
		const isCfg = this.isConfigured();
		if (!isCfg) {
			return {
				items: [],
				prefix: '',
				bucket: '',
				region: '',
				isTruncated: false,
				totalCount: 0,
				configured: false,
				error: 'AWS credentials not configured. Please add AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET to your .env file.'
			};
		}

		const { client, bucket, region } = this.getClient();
		const cleanPrefix = this.sanitizeKey(prefix, true);

		try {
			const command = new ListObjectsV2Command({
				Bucket: bucket,
				Prefix: cleanPrefix,
				Delimiter: '/',
				ContinuationToken: continuationToken
			});

			const response = await client.send(command);
			const items: S3Item[] = [];

			// 1. Process folders (CommonPrefixes)
			if (response.CommonPrefixes) {
				for (const cp of response.CommonPrefixes) {
					if (!cp.Prefix) continue;
					const folderKey = cp.Prefix;
					// Get folder name from prefix (e.g., 'images/wedding/' -> 'wedding')
					const parts = folderKey.replace(/\/$/, '').split('/');
					const name = parts[parts.length - 1] || folderKey;

					items.push({
						key: folderKey,
						name,
						type: 'folder',
						prefix: cleanPrefix,
						size: 0,
						isImage: false
					});
				}
			}

			// 2. Process files (Contents)
			if (response.Contents) {
				for (const obj of response.Contents) {
					if (!obj.Key) continue;
					// Skip if it's the folder placeholder for the current prefix
					if (obj.Key === cleanPrefix) continue;
					// Skip any trailing slash keys that are empty folder placeholders matching common prefixes
					if (obj.Key.endsWith('/')) continue;

					const key = obj.Key;
					const name = key.substring(cleanPrefix.length);
					// If the file is inside a subfolder, delimiter should prevent this, but double check
					if (name.includes('/')) continue;

					const isImg = isImageFile(name);
					const ext = getFileExtension(name);

					let thumbnailUrl: string | undefined;
					if (isImg) {
						try {
							thumbnailUrl = await this.generatePresignedGetUrl(key, 3600);
						} catch {
							thumbnailUrl = undefined;
						}
					}

					items.push({
						key,
						name,
						type: 'file',
						prefix: cleanPrefix,
						size: obj.Size ?? 0,
						lastModified: obj.LastModified?.toISOString(),
						etag: obj.ETag?.replace(/"/g, ''),
						extension: ext,
						isImage: isImg,
						thumbnailUrl,
						publicUrl: this.getPublicUrl(key)
					});
				}
			}

			return {
				items,
				prefix: cleanPrefix,
				bucket,
				region,
				isTruncated: !!response.IsTruncated,
				nextContinuationToken: response.NextContinuationToken,
				totalCount: items.length,
				configured: true
			};
		} catch (error) {
			this.handleAwsError(error, `Listing items in '${cleanPrefix || 'root'}'`);
		}
	}

	/**
	 * List all folders recursively or at root to build folder tree in sidebar
	 */
	public async listFolderTree(maxDepth = 3): Promise<string[]> {
		if (!this.isConfigured()) return [];
		const { client, bucket } = this.getClient();
		const folders = new Set<string>();

		try {
			// List top level folders
			const command = new ListObjectsV2Command({
				Bucket: bucket,
				Delimiter: '/'
			});
			const response = await client.send(command);
			if (response.CommonPrefixes) {
				for (const cp of response.CommonPrefixes) {
					if (cp.Prefix) folders.add(cp.Prefix);
				}
			}
			return Array.from(folders).sort();
		} catch (error) {
			console.warn('Failed to load folder tree:', error);
			return [];
		}
	}

	/**
	 * Create a folder (represented in S3 as an empty object with trailing slash)
	 */
	public async createFolder(prefix: string, folderName: string): Promise<string> {
		const { client, bucket } = this.getClient();
		const cleanPrefix = this.sanitizeKey(prefix, true);
		const cleanFolderName = folderName.trim().replace(/[\/\\]/g, '');

		if (!cleanFolderName) {
			throw new S3ServiceError('Folder name cannot be empty or contain slashes', 400);
		}

		const folderKey = `${cleanPrefix}${cleanFolderName}/`;

		try {
			const command = new PutObjectCommand({
				Bucket: bucket,
				Key: folderKey,
				Body: new Uint8Array(0),
				ContentType: 'application/x-directory'
			});
			await client.send(command);
			return folderKey;
		} catch (error) {
			this.handleAwsError(error, `Creating folder '${folderName}'`);
		}
	}

	/**
	 * Upload an object directly
	 */
	public async uploadObject(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void> {
		const { client, bucket } = this.getClient();
		const cleanKey = this.sanitizeKey(key);

		try {
			const command = new PutObjectCommand({
				Bucket: bucket,
				Key: cleanKey,
				Body: body,
				ContentType: contentType || 'application/octet-stream'
			});
			await client.send(command);
		} catch (error) {
			this.handleAwsError(error, `Uploading file '${cleanKey}'`);
		}
	}

	/**
	 * Delete a single object
	 */
	public async deleteObject(key: string): Promise<void> {
		const { client, bucket } = this.getClient();
		const cleanKey = this.sanitizeKey(key);

		try {
			const command = new DeleteObjectCommand({
				Bucket: bucket,
				Key: cleanKey
			});
			await client.send(command);
		} catch (error) {
			this.handleAwsError(error, `Deleting file '${cleanKey}'`);
		}
	}

	/**
	 * Count objects under a prefix (for delete safety confirmation dialog)
	 */
	public async countObjectsInPrefix(prefix: string): Promise<number> {
		if (!this.isConfigured()) return 0;
		const { client, bucket } = this.getClient();
		const cleanPrefix = this.sanitizeKey(prefix, true);

		try {
			let total = 0;
			let token: string | undefined = undefined;

			do {
				const command: ListObjectsV2Command = new ListObjectsV2Command({
					Bucket: bucket,
					Prefix: cleanPrefix,
					ContinuationToken: token
				});
				const response = await client.send(command);
				total += (response.Contents?.length || 0);
				token = response.NextContinuationToken;
			} while (token);

			return total;
		} catch {
			return 0;
		}
	}

	/**
	 * Delete all objects under a prefix (deleting a folder)
	 */
	public async deletePrefix(prefix: string): Promise<{ deletedCount: number }> {
		const { client, bucket } = this.getClient();
		const cleanPrefix = this.sanitizeKey(prefix, true);

		try {
			let deletedCount = 0;
			let token: string | undefined = undefined;

			do {
				const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
					Bucket: bucket,
					Prefix: cleanPrefix,
					ContinuationToken: token
				});
				const listResponse: ListObjectsV2CommandOutput = await client.send(listCommand);

				if (listResponse.Contents && listResponse.Contents.length > 0) {
					const deleteObjects = listResponse.Contents.map((obj) => ({ Key: obj.Key! }));
					const deleteCommand = new DeleteObjectsCommand({
						Bucket: bucket,
						Delete: {
							Objects: deleteObjects,
							Quiet: true
						}
					});
					await client.send(deleteCommand);
					deletedCount += deleteObjects.length;
				}

				token = listResponse.NextContinuationToken;
			} while (token);

			return { deletedCount };
		} catch (error) {
			this.handleAwsError(error, `Deleting folder prefix '${cleanPrefix}'`);
		}
	}

	/**
	 * Copy an object
	 */
	public async copyObject(sourceKey: string, targetKey: string): Promise<void> {
		const { client, bucket } = this.getClient();
		const cleanSource = this.sanitizeKey(sourceKey);
		const cleanTarget = this.sanitizeKey(targetKey);

		if (cleanSource === cleanTarget) {
			throw new S3ServiceError('Source and target keys cannot be identical', 400);
		}

		try {
			// S3 CopySource requires URI encoding and bucket name: "bucket/key"
			const copySource = `${bucket}/${encodeURIComponent(cleanSource).replace(/%2F/g, '/')}`;
			const command = new CopyObjectCommand({
				Bucket: bucket,
				CopySource: copySource,
				Key: cleanTarget
			});
			await client.send(command);
		} catch (error) {
			this.handleAwsError(error, `Copying '${cleanSource}' to '${cleanTarget}'`);
		}
	}

	/**
	 * Move an object (CopyObject -> verify -> DeleteObject)
	 * Never deletes original if copy fails.
	 */
	public async moveObject(sourceKey: string, targetKey: string): Promise<void> {
		const { client, bucket } = this.getClient();
		const cleanSource = this.sanitizeKey(sourceKey);
		const cleanTarget = this.sanitizeKey(targetKey);

		if (cleanSource === cleanTarget) return;

		// 1. Copy object
		await this.copyObject(cleanSource, cleanTarget);

		// 2. Verify target exists
		try {
			const headCommand = new HeadObjectCommand({
				Bucket: bucket,
				Key: cleanTarget
			});
			await client.send(headCommand);
		} catch (verifyError) {
			throw new S3ServiceError(
				`Failed to verify copied object at '${cleanTarget}'. Original file '${cleanSource}' was NOT deleted.`,
				500,
				'VERIFY_FAILED'
			);
		}

		// 3. Delete original only after verification succeeds
		await this.deleteObject(cleanSource);
	}

	/**
	 * Move an entire folder prefix (recursive copy each item -> verify -> delete originals)
	 */
	public async movePrefix(sourcePrefix: string, targetPrefix: string): Promise<number> {
		const { client, bucket } = this.getClient();
		const cleanSource = this.sanitizeKey(sourcePrefix, true);
		const cleanTarget = this.sanitizeKey(targetPrefix, true);

		if (cleanSource === cleanTarget) return 0;
		if (cleanTarget.startsWith(cleanSource)) {
			throw new S3ServiceError('Cannot move a folder into itself or its own subfolder', 400);
		}

		try {
			let token: string | undefined = undefined;
			const objectsToMove: string[] = [];

			do {
				const listCmd: ListObjectsV2Command = new ListObjectsV2Command({
					Bucket: bucket,
					Prefix: cleanSource,
					ContinuationToken: token
				});
				const res: ListObjectsV2CommandOutput = await client.send(listCmd);
				if (res.Contents) {
					for (const obj of res.Contents) {
						if (obj.Key) objectsToMove.push(obj.Key);
					}
				}
				token = res.NextContinuationToken;
			} while (token);

			// Copy each object
			for (const objKey of objectsToMove) {
				const relativePath = objKey.substring(cleanSource.length);
				const newTargetKey = `${cleanTarget}${relativePath}`;
				await this.copyObject(objKey, newTargetKey);
			}

			// Delete all originals
			if (objectsToMove.length > 0) {
				// Delete in chunks of 1000 (S3 limit)
				for (let i = 0; i < objectsToMove.length; i += 1000) {
					const chunk = objectsToMove.slice(i, i + 1000).map((k) => ({ Key: k }));
					const delCmd = new DeleteObjectsCommand({
						Bucket: bucket,
						Delete: { Objects: chunk, Quiet: true }
					});
					await client.send(delCmd);
				}
			}

			return objectsToMove.length;
		} catch (error) {
			this.handleAwsError(error, `Moving folder '${cleanSource}' to '${cleanTarget}'`);
		}
	}

	/**
	 * Duplicate a file (e.g. photo.jpg -> photo-copy.jpg, or photo-copy-2.jpg)
	 */
	public async duplicateObject(key: string): Promise<string> {
		const cleanKey = this.sanitizeKey(key);
		if (cleanKey.endsWith('/')) {
			throw new S3ServiceError('Duplicate is only supported for files', 400);
		}

		const parts = cleanKey.split('/');
		const filename = parts.pop()!;
		const prefix = parts.length > 0 ? parts.join('/') + '/' : '';

		const dotIndex = filename.lastIndexOf('.');
		const baseName = dotIndex !== -1 ? filename.substring(0, dotIndex) : filename;
		const ext = dotIndex !== -1 ? filename.substring(dotIndex) : '';

		// Find unused target key
		let targetKey = `${prefix}${baseName}-copy${ext}`;
		let counter = 2;

		while (await this.objectExists(targetKey)) {
			targetKey = `${prefix}${baseName}-copy-${counter}${ext}`;
			counter++;
			if (counter > 50) {
				throw new S3ServiceError('Could not find available filename for duplication', 400);
			}
		}

		await this.copyObject(cleanKey, targetKey);
		return targetKey;
	}

	/**
	 * Check if an object exists in S3
	 */
	public async objectExists(key: string): Promise<boolean> {
		const { client, bucket } = this.getClient();
		try {
			const command = new HeadObjectCommand({
				Bucket: bucket,
				Key: this.sanitizeKey(key)
			});
			await client.send(command);
			return true;
		} catch (error: any) {
			if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
				return false;
			}
			return false;
		}
	}

	/**
	 * Get object metadata
	 */
	public async getObjectMetadata(key: string) {
		const { client, bucket } = this.getClient();
		const cleanKey = this.sanitizeKey(key);

		try {
			const command = new HeadObjectCommand({
				Bucket: bucket,
				Key: cleanKey
			});
			const response = await client.send(command);
			return {
				key: cleanKey,
				contentType: response.ContentType,
				contentLength: response.ContentLength,
				lastModified: response.LastModified?.toISOString(),
				etag: response.ETag?.replace(/"/g, ''),
				metadata: response.Metadata
			};
		} catch (error) {
			this.handleAwsError(error, `Getting metadata for '${cleanKey}'`);
		}
	}

	/**
	 * Generate a presigned GET URL (for download, preview, or thumbnail)
	 */
	public async generatePresignedGetUrl(key: string, expiresIn = 3600, download = false): Promise<string> {
		const { client, bucket } = this.getClient();
		const cleanKey = this.sanitizeKey(key);

		try {
			const filename = cleanKey.split('/').pop() || 'download';
			const command = new GetObjectCommand({
				Bucket: bucket,
				Key: cleanKey,
				ResponseContentDisposition: download ? `attachment; filename="${encodeURIComponent(filename)}"` : undefined
			});
			return await getSignedUrl(client, command, { expiresIn });
		} catch (error) {
			this.handleAwsError(error, `Generating presigned URL for '${cleanKey}'`);
		}
	}

	/**
	 * Generate a presigned PUT URL (for direct client-to-S3 upload if needed)
	 */
	public async generatePresignedPutUrl(key: string, contentType: string, expiresIn = 300): Promise<string> {
		const { client, bucket } = this.getClient();
		const cleanKey = this.sanitizeKey(key);

		try {
			const command = new PutObjectCommand({
				Bucket: bucket,
				Key: cleanKey,
				ContentType: contentType || 'application/octet-stream'
			});
			return await getSignedUrl(client, command, { expiresIn });
		} catch (error) {
			this.handleAwsError(error, `Generating upload URL for '${cleanKey}'`);
		}
	}

	/**
	 * Get the public direct URL for an S3 object
	 */
	public getPublicUrl(key: string): string {
		const { bucket, region } = this.getClient();
		const cleanKey = this.sanitizeKey(key);
		const customPublicUrl = env.PUBLIC_S3_URL || process.env.PUBLIC_S3_URL || env.CDN_URL || process.env.CDN_URL;
		const endpoint = env.S3_ENDPOINT || process.env.S3_ENDPOINT;
		const forcePathStyle = (env.S3_FORCE_PATH_STYLE || process.env.S3_FORCE_PATH_STYLE) === 'true';

		const encodedKey = cleanKey
			.split('/')
			.map((segment) => encodeURIComponent(segment))
			.join('/');

		if (customPublicUrl) {
			return `${customPublicUrl.replace(/\/+$/, '')}/${encodedKey}`;
		}

		if (endpoint) {
			const baseUrl = endpoint.replace(/\/+$/, '');
			if (forcePathStyle) {
				return `${baseUrl}/${bucket}/${encodedKey}`;
			}
			return `${baseUrl}/${encodedKey}`;
		}

		const targetRegion = region || 'us-east-1';
		return `https://${bucket}.s3.${targetRegion}.amazonaws.com/${encodedKey}`;
	}

	/**
	 * Generate presigned GET URLs in batch for multiple keys
	 */
	public async generatePresignedGetUrls(keys: string[], expiresIn = 3600): Promise<Record<string, string>> {
		const result: Record<string, string> = {};
		await Promise.all(
			keys.map(async (key) => {
				try {
					const url = await this.generatePresignedGetUrl(key, expiresIn, false);
					if (url) {
						result[key] = url;
					}
				} catch (err) {
					console.error(`Failed to generate presigned URL for ${key}:`, err);
				}
			})
		);
		return result;
	}

	/**
	 * List all files under a prefix (can list recursively or direct)
	 */
	public async listFilesUnderPrefix(prefix: string, recursive = true): Promise<S3Item[]> {
		if (!this.isConfigured()) return [];
		const { client, bucket } = this.getClient();
		const cleanPrefix = this.sanitizeKey(prefix, true);
		const items: S3Item[] = [];

		try {
			let token: string | undefined = undefined;
			do {
				const command: ListObjectsV2Command = new ListObjectsV2Command({
					Bucket: bucket,
					Prefix: cleanPrefix,
					Delimiter: recursive ? undefined : '/',
					ContinuationToken: token
				});
				const response: ListObjectsV2CommandOutput = await client.send(command);

				if (response.Contents) {
					for (const obj of response.Contents) {
						if (!obj.Key || obj.Key === cleanPrefix || obj.Key.endsWith('/')) continue;
						const key = obj.Key;
						const name = key.substring(cleanPrefix.length);
						if (!recursive && name.includes('/')) continue;

						const ext = getFileExtension(name);
						const isImg = isImageFile(name);

						items.push({
							key,
							name: name.split('/').pop() || name,
							type: 'file',
							prefix: cleanPrefix,
							size: obj.Size ?? 0,
							lastModified: obj.LastModified?.toISOString(),
							etag: obj.ETag?.replace(/"/g, ''),
							extension: ext,
							isImage: isImg,
							publicUrl: this.getPublicUrl(key)
						});
					}
				}
				token = response.NextContinuationToken;
			} while (token);

			return items;
		} catch (error) {
			console.warn(`Failed to list files under prefix '${cleanPrefix}':`, error);
			return [];
		}
	}
}

export const s3Service = new S3Service();

