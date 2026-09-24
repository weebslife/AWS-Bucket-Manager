export interface Toast {
	id: string;
	title: string;
	message?: string;
	type?: 'info' | 'success' | 'error' | 'warning';
	duration?: number;
}

class ToastStore {
	toasts = $state<Toast[]>([]);

	add(toast: Omit<Toast, 'id'>) {
		const id = Math.random().toString(36).substring(2, 9);
		const duration = toast.duration ?? (toast.type === 'error' ? 6000 : 3500);
		const newToast: Toast = { ...toast, id };

		this.toasts.push(newToast);

		if (duration > 0) {
			setTimeout(() => {
				this.remove(id);
			}, duration);
		}
		return id;
	}

	success(title: string, message?: string) {
		return this.add({ title, message, type: 'success' });
	}

	error(title: string, message?: string) {
		return this.add({ title, message, type: 'error' });
	}

	info(title: string, message?: string) {
		return this.add({ title, message, type: 'info' });
	}

	warning(title: string, message?: string) {
		return this.add({ title, message, type: 'warning' });
	}

	remove(id: string) {
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}

	clear() {
		this.toasts = [];
	}
}

export const toastStore = new ToastStore();
