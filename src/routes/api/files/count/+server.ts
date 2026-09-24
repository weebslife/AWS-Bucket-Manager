import { json, type RequestHandler } from '@sveltejs/kit';
import { s3Service, S3ServiceError } from '$lib/server/s3.service';

export const GET: RequestHandler = async ({ url }) => {
	const prefix = url.searchParams.get('prefix');

	if (!prefix) {
		return json({ error: 'Prefix is required' }, { status: 400 });
	}

	try {
		const count = await s3Service.countObjectsInPrefix(prefix);
		return json({ prefix, count });
	} catch (error: any) {
		const status = error instanceof S3ServiceError ? error.statusCode : 500;
		return json({ error: error.message || 'Failed to count objects' }, { status });
	}
};
