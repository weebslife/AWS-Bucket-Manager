import { json, type RequestHandler } from '@sveltejs/kit';
import { s3Service, S3ServiceError } from '$lib/server/s3.service';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { prefix = '', folderName } = await request.json();

		if (!folderName || typeof folderName !== 'string' || !folderName.trim()) {
			return json({ error: 'Folder name is required' }, { status: 400 });
		}

		const folderKey = await s3Service.createFolder(prefix, folderName);
		return json({ success: true, folderKey });
	} catch (error: any) {
		const status = error instanceof S3ServiceError ? error.statusCode : 500;
		return json({ error: error.message || 'Failed to create folder' }, { status });
	}
};
