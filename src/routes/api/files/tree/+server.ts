import { json, type RequestHandler } from '@sveltejs/kit';
import { s3Service } from '$lib/server/s3.service';

export const GET: RequestHandler = async () => {
	try {
		const folders = await s3Service.listFolderTree();
		return json({ folders, configured: s3Service.isConfigured() });
	} catch (error: any) {
		return json({ folders: [], configured: s3Service.isConfigured(), error: error.message });
	}
};
