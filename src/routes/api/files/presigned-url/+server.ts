import { json, type RequestHandler } from '@sveltejs/kit';
import { s3Service, S3ServiceError } from '$lib/server/s3.service';

export const GET: RequestHandler = async ({ url }) => {
	const key = url.searchParams.get('key');
	const download = url.searchParams.get('download') === 'true';
	const expiresInParam = url.searchParams.get('expiresIn');
	const expiresIn = expiresInParam ? parseInt(expiresInParam, 10) : 3600;

	if (!key) {
		return json({ error: 'Object key is required' }, { status: 400 });
	}

	try {
		const presignedUrl = await s3Service.generatePresignedGetUrl(key, expiresIn, download);
		return json({
			url: presignedUrl,
			key,
			expiresIn,
			download
		});
	} catch (error: any) {
		const status = error instanceof S3ServiceError ? error.statusCode : 500;
		return json({ error: error.message || 'Failed to generate presigned URL' }, { status });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json().catch(() => ({}));
		const { keys, expiresIn = 3600 } = body;

		if (!Array.isArray(keys) || keys.length === 0) {
			return json({ error: 'Array of object keys is required' }, { status: 400 });
		}

		const targetKeys = keys.slice(0, 500);
		const urls = await s3Service.generatePresignedGetUrls(targetKeys, expiresIn);

		return json({
			urls,
			expiresIn
		});
	} catch (error: any) {
		const status = error instanceof S3ServiceError ? error.statusCode : 500;
		return json({ error: error.message || 'Failed to generate batch presigned URLs' }, { status });
	}
};

