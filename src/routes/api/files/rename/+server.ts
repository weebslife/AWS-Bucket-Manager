import { json, type RequestHandler } from '@sveltejs/kit';
import { s3Service, S3ServiceError } from '$lib/server/s3.service';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { oldKey, newName, isFolder } = await request.json();

		if (!oldKey || !newName || typeof newName !== 'string' || !newName.trim()) {
			return json({ error: 'Valid oldKey and newName are required' }, { status: 400 });
		}

		const cleanOldKey = s3Service.sanitizeKey(oldKey, isFolder);
		const cleanNewName = newName.trim().replace(/[\/\\]/g, '');

		if (!cleanNewName) {
			return json({ error: 'New name cannot be empty or contain slashes' }, { status: 400 });
		}

		if (isFolder) {
			// e.g., 'images/wedding/' -> parent is 'images/', new prefix is 'images/ceremony/'
			const trimmed = cleanOldKey.replace(/\/$/, '');
			const lastSlash = trimmed.lastIndexOf('/');
			const parentPrefix = lastSlash !== -1 ? trimmed.substring(0, lastSlash + 1) : '';
			const newPrefix = `${parentPrefix}${cleanNewName}/`;

			if (cleanOldKey === newPrefix) {
				return json({ success: true, newKey: cleanOldKey });
			}

			await s3Service.movePrefix(cleanOldKey, newPrefix);
			return json({ success: true, newKey: newPrefix });
		} else {
			// File rename
			const lastSlash = cleanOldKey.lastIndexOf('/');
			const parentPrefix = lastSlash !== -1 ? cleanOldKey.substring(0, lastSlash + 1) : '';
			const newKey = `${parentPrefix}${cleanNewName}`;

			if (cleanOldKey === newKey) {
				return json({ success: true, newKey: cleanOldKey });
			}

			await s3Service.moveObject(cleanOldKey, newKey);
			return json({ success: true, newKey });
		}
	} catch (error: any) {
		const status = error instanceof S3ServiceError ? error.statusCode : 500;
		return json({ error: error.message || 'Failed to rename item' }, { status });
	}
};
