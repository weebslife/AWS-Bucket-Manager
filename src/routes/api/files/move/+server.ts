import { json, type RequestHandler } from '@sveltejs/kit';
import { s3Service, S3ServiceError } from '$lib/server/s3.service';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { sourceKeys, targetPrefix } = await request.json();

		if (!Array.isArray(sourceKeys) || sourceKeys.length === 0) {
			return json({ error: 'sourceKeys must be a non-empty array' }, { status: 400 });
		}

		const cleanTargetPrefix = s3Service.sanitizeKey(targetPrefix || '', true);
		let movedCount = 0;

		for (const srcKey of sourceKeys) {
			const isFolder = srcKey.endsWith('/');
			const cleanSrc = s3Service.sanitizeKey(srcKey, isFolder);

			if (isFolder) {
				const folderName = cleanSrc.replace(/\/$/, '').split('/').pop() || 'folder';
				const newTargetPrefix = `${cleanTargetPrefix}${folderName}/`;

				if (cleanSrc === newTargetPrefix) continue;

				await s3Service.movePrefix(cleanSrc, newTargetPrefix);
				movedCount++;
			} else {
				const filename = cleanSrc.split('/').pop() || 'file';
				const newTargetKey = `${cleanTargetPrefix}${filename}`;

				if (cleanSrc === newTargetKey) continue;

				await s3Service.moveObject(cleanSrc, newTargetKey);
				movedCount++;
			}
		}

		return json({ success: true, movedCount });
	} catch (error: any) {
		const status = error instanceof S3ServiceError ? error.statusCode : 500;
		return json({ error: error.message || 'Failed to move items' }, { status });
	}
};
