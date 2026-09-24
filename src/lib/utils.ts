import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 1): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(dateString?: string): string {
	if (!dateString) return '-';
	const d = new Date(dateString);
	if (isNaN(d.getTime())) return '-';
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(d);
}

export function getFileExtension(filename: string): string {
	const parts = filename.split('.');
	if (parts.length <= 1) return '';
	return parts.pop()?.toLowerCase() || '';
}

export function isImageFile(filename: string): boolean {
	const ext = getFileExtension(filename);
	return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'avif', 'ico'].includes(ext);
}

export type LinkFormat = 'plain' | 'markdown' | 'json' | 'html';

export function getPublicS3Url(bucket: string, region: string, key: string): string {
	const clean = key.trim().replace(/^\/+/, '');
	const encodedKey = clean
		.split('/')
		.map((seg) => encodeURIComponent(seg))
		.join('/');
	const targetRegion = region || 'us-east-1';
	return `https://${bucket}.s3.${targetRegion}.amazonaws.com/${encodedKey}`;
}

export function formatLinks(
	items: { name: string; url: string }[],
	format: LinkFormat = 'plain'
): string {
	switch (format) {
		case 'markdown':
			return items
				.map((item) => {
					const isImg = isImageFile(item.name);
					return isImg ? `![${item.name}](${item.url})` : `[${item.name}](${item.url})`;
				})
				.join('\n');
		case 'json':
			return JSON.stringify(
				items.map((i) => i.url),
				null,
				2
			);
		case 'html':
			return items
				.map((item) => {
					const isImg = isImageFile(item.name);
					return isImg
						? `<img src="${item.url}" alt="${item.name}" />`
						: `<a href="${item.url}" target="_blank">${item.name}</a>`;
				})
				.join('\n');
		case 'plain':
		default:
			return items.map((i) => i.url).join('\n');
	}
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
	if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch (e) {
			console.warn('navigator.clipboard failed, using fallback', e);
		}
	}

	if (typeof document !== 'undefined') {
		try {
			const textarea = document.createElement('textarea');
			textarea.value = text;
			textarea.style.position = 'fixed';
			textarea.style.left = '-9999px';
			textarea.style.top = '-9999px';
			textarea.setAttribute('readonly', '');
			document.body.appendChild(textarea);
			textarea.select();
			const success = document.execCommand('copy');
			document.body.removeChild(textarea);
			return success;
		} catch {
			return false;
		}
	}
	return false;
}
