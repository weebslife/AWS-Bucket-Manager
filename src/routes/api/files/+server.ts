import { json, type RequestHandler } from '@sveltejs/kit';
import { s3Service, S3ServiceError } from '$lib/server/s3.service';

export const GET: RequestHandler = async ({ url }) => {
	const prefix = url.searchParams.get('prefix') || '';
	const continuationToken = url.searchParams.get('continuationToken') || undefined;
	const recursive = url.searchParams.get('recursive') === 'true';

	try {
		if (recursive) {
			const items = await s3Service.listFilesUnderPrefix(prefix, true);
			return json({
				items,
				prefix,
				bucket: '',
				region: '',
				isTruncated: false,
				totalCount: items.length,
				configured: true
			});
		}

		const result = await s3Service.listObjects(prefix, continuationToken);
		return json(result);
	} catch (error: any) {
		const status = error instanceof S3ServiceError ? error.statusCode : 500;
		return json(
			{
				items: [],
				prefix,
				bucket: '',
				region: '',
				isTruncated: false,
				totalCount: 0,
				configured: s3Service.isConfigured(),
				error: error.message || 'Failed to list S3 objects'
			},
			{ status }
		);
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const keys: string[] = body.keys || [];

		if (!Array.isArray(keys) || keys.length === 0) {
			return json({ error: 'No keys provided for deletion' }, { status: 400 });
		}

		let deletedCount = 0;
		for (const key of keys) {
			if (key.endsWith('/')) {
				// Folder prefix deletion
				const result = await s3Service.deletePrefix(key);
				deletedCount += result.deletedCount;
			} else {
				// Single file deletion
				await s3Service.deleteObject(key);
				deletedCount += 1;
			}
		}

		return json({ success: true, deletedCount });
	} catch (error: any) {
		const status = error instanceof S3ServiceError ? error.statusCode : 500;
		return json({ error: error.message || 'Failed to delete items' }, { status });
	}
};
