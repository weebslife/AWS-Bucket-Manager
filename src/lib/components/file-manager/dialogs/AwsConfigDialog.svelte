<script lang="ts">
	import { fileManager } from '$lib/stores/fileManager.svelte';
	import { Settings, X, CheckCircle2, AlertCircle, ShieldCheck, Key, HardDrive, Globe } from '@lucide/svelte';

	function close() {
		fileManager.configDialogOpen = false;
	}
</script>

{#if fileManager.configDialogOpen}
	<div
		class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100 select-none"
		role="dialog"
		aria-modal="true"
	>
		<div class="w-full max-w-lg bg-white rounded-xl border border-zinc-200 shadow-2xl p-6 animate-in zoom-in-95 duration-100">
			<!-- Header -->
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-2.5">
					<div class="p-2 rounded-lg bg-zinc-100 text-zinc-700">
						<Settings class="w-5 h-5" />
					</div>
					<div>
						<h3 class="text-sm font-semibold text-zinc-900">AWS S3 Configuration</h3>
						<p class="text-xs text-zinc-500">Security & server connection status</p>
					</div>
				</div>
				<button
					type="button"
					onclick={close}
					class="p-1 rounded-md text-zinc-400 hover:text-zinc-600 transition-colors"
				>
					<X class="w-4 h-4" />
				</button>
			</div>

			<!-- Current Status -->
			<div class="p-3.5 rounded-lg border mb-4 {fileManager.isConfigured ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-amber-50/70 border-amber-200 text-amber-900'}">
				<div class="flex items-center gap-2 font-medium text-xs">
					{#if fileManager.isConfigured}
						<CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
						<span>AWS S3 credentials and bucket are configured</span>
					{:else}
						<AlertCircle class="w-4 h-4 text-amber-600 shrink-0" />
						<span>AWS S3 configuration needed in .env</span>
					{/if}
				</div>
				<p class="text-[11px] mt-1 opacity-80">
					{#if fileManager.isConfigured}
						All credentials remain securely on the SvelteKit backend server. Browser communicates only via authenticated server API endpoints.
					{:else}
						Add your AWS credentials to the <code>.env</code> file in the project root and restart the development server.
					{/if}
				</p>
			</div>

			<!-- Active Settings Details -->
			<div class="space-y-2 mb-5 text-xs">
				<div class="flex items-center justify-between py-2 border-b border-zinc-100">
					<div class="flex items-center gap-2 text-zinc-600">
						<HardDrive class="w-3.5 h-3.5 text-zinc-400" />
						<span>S3 Bucket</span>
					</div>
					<span class="font-mono text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
						{fileManager.bucket || 'S3_BUCKET not set'}
					</span>
				</div>

				<div class="flex items-center justify-between py-2 border-b border-zinc-100">
					<div class="flex items-center gap-2 text-zinc-600">
						<Globe class="w-3.5 h-3.5 text-zinc-400" />
						<span>AWS Region</span>
					</div>
					<span class="font-mono text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
						{fileManager.region || 'AWS_REGION'}
					</span>
				</div>

				<div class="flex items-center justify-between py-2 border-b border-zinc-100">
					<div class="flex items-center gap-2 text-zinc-600">
						<ShieldCheck class="w-3.5 h-3.5 text-emerald-600" />
						<span>Security Model</span>
					</div>
					<span class="text-zinc-700 font-medium">Server-side isolated SDK</span>
				</div>
			</div>

			<!-- .env instruction codeblock -->
			<div class="mb-5">
				<span class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
					Environment Variables Template (.env)
				</span>
				<pre class="p-3 bg-zinc-900 text-zinc-200 rounded-lg text-[11px] font-mono leading-relaxed overflow-x-auto select-text">AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=my-app-assets</pre>
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-end">
				<button
					type="button"
					onclick={close}
					class="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
				>
					Done
				</button>
			</div>
		</div>
	</div>
{/if}
