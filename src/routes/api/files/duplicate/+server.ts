import { json, type RequestHandler } from '@sveltejs/kit';
import { s3Service, S3ServiceError } from '$lib/server/s3.service';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { key } = await request.json();

		if (!key || typeof key !== 'string') {
			return json({ error: 'Valid key is required' }, { status: 400 });
		}

		const cleanKey = s3Service.sanitizeKey(key);
		if (cleanKey.endsWith('/')) {
			return json({ error: 'Duplicate is not supported for folder prefixes' }, { status: 400 });
		}

		const targetKey = await s3Service.duplicateObject(cleanKey);
		return json({ success: true, newKey: targetKey });
	} catch (error: any) {
		const status = error instanceof S3ServiceError ? error.statusCode : 500;
		return json({ error: error.message || 'Failed to duplicate item' }, { status });
	}
};
