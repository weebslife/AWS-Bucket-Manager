import { json, type RequestHandler } from '@sveltejs/kit';
import { s3Service, S3ServiceError } from '$lib/server/s3.service';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const prefix = (formData.get('prefix') as string) || '';
		const files = formData.getAll('files') as File[];

		if (!files || files.length === 0) {
			// Check single file field name 'file'
			const singleFile = formData.get('file') as File | null;
			if (singleFile) {
				files.push(singleFile);
			}
		}

		if (files.length === 0) {
			return json({ error: 'No files provided for upload' }, { status: 400 });
		}

		const cleanPrefix = s3Service.sanitizeKey(prefix, true);
		const uploadedKeys: string[] = [];

		for (const file of files) {
			if (!(file instanceof File)) continue;
			const filename = file.name;
			const targetKey = `${cleanPrefix}${filename}`;
			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			await s3Service.uploadObject(targetKey, buffer, file.type || 'application/octet-stream');
			uploadedKeys.push(targetKey);
		}

		return json({
			success: true,
			uploadedKeys,
			count: uploadedKeys.length
		});
	} catch (error: any) {
		const status = error instanceof S3ServiceError ? error.statusCode : 500;
		return json({ error: error.message || 'Failed to upload files' }, { status });
	}
};
