import { json, type RequestHandler } from '@sveltejs/kit';
import { s3Service, S3ServiceError } from '$lib/server/s3.service';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { sourceKeys, targetPrefix } = await request.json();

		if (!Array.isArray(sourceKeys) || sourceKeys.length === 0) {
			return json({ error: 'sourceKeys must be a non-empty array' }, { status: 400 });
		}

		const cleanTargetPrefix = s3Service.sanitizeKey(targetPrefix || '', true);
		let copiedCount = 0;

		for (const srcKey of sourceKeys) {
			const cleanSrc = s3Service.sanitizeKey(srcKey, srcKey.endsWith('/'));

			if (cleanSrc.endsWith('/')) {
				// Copy folder prefix
				const folderName = cleanSrc.replace(/\/$/, '').split('/').pop() || 'folder';
				const newFolderPrefix = `${cleanTargetPrefix}${folderName}/`;
				// List all items in source prefix and copy each
				const { items } = await s3Service.listObjects(cleanSrc);
				// Also create the folder marker
				await s3Service.createFolder(cleanTargetPrefix, folderName);

				// Recursive copy is handled through prefix objects
				// We can copy all objects under cleanSrc to newFolderPrefix
				// Let's implement recursive copy
				let token: string | undefined = undefined;
				do {
					const response = await s3Service.listObjects(cleanSrc, token);
					for (const item of response.items) {
						if (item.type === 'file') {
							const relativePath = item.key.substring(cleanSrc.length);
							await s3Service.copyObject(item.key, `${newFolderPrefix}${relativePath}`);
							copiedCount++;
						}
					}
					token = response.nextContinuationToken;
				} while (token);
			} else {
				// Single file copy
				const filename = cleanSrc.split('/').pop() || 'file';
				let targetKey = `${cleanTargetPrefix}${filename}`;

				// If copying into the exact same folder, create a duplicate copy name
				if (targetKey === cleanSrc) {
					targetKey = await s3Service.duplicateObject(cleanSrc);
				} else {
					await s3Service.copyObject(cleanSrc, targetKey);
				}
				copiedCount++;
			}
		}

		return json({ success: true, copiedCount });
	} catch (error: any) {
		const status = error instanceof S3ServiceError ? error.statusCode : 500;
		return json({ error: error.message || 'Failed to copy items' }, { status });
	}
};
