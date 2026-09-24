# AWS S3 Bucket Manager

A fast, desktop-style web file manager and gallery for Amazon S3 and S3-compatible storage providers (Cloudflare R2, MinIO, Wasabi, LocalStack). Built with Svelte 5 (Runes), TypeScript, and Tailwind CSS.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Svelte 5](https://img.shields.io/badge/Svelte-5-orange.svg)](https://svelte.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8.svg)](https://tailwindcss.com)

---

## Features

### 📂 File & Folder Operations
- **Folder Navigation:** Sidebar folder tree, interactive breadcrumbs, and deep folder traversal.
- **Full File Management:** Create folders, rename, delete (single files or entire folder prefixes), and duplicate files.
- **Clipboard (Cut / Copy / Paste):** Move or copy items across folders via clipboard (`⌘C`, `⌘X`, `⌘V`) or drag-and-drop.
- **Drag & Drop:** Drag files directly into subfolder cards or drop zones.

### 🔗 1-Click Link Copy & Export
- **One-Click Folder Link Copy:** Copy every file link in the current folder with a single click (folders are automatically filtered out).
- **External Folder Copy:** Right-click any folder from parent directories to copy all file links inside it without opening the folder.
- **Selection Copy:** Select multiple files and copy only their links.
- **Link Types:**
  - **Direct Regional Public URLs:** Canonical S3 links (e.g., `https://bucket.s3.region.amazonaws.com/...`) or custom CDN domains.
  - **Presigned URLs:** Authenticated, temporary signed links generated in batch by the server (valid for 1 hour).
- **Multiple Formats:** Plain text (one link per line), Markdown (`![alt](url)`), JSON array, and HTML.
- **Link Customization Dialog:** Preview links and switch formats before copying.

### 🖼️ Media Preview (Lightbox)
- Built-in modal lightbox for image files (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.svg`, `.avif`).
- Displays image dimensions, file size, last modified date, and S3 object key.
- Navigate previous/next images using arrow keys (`←` / `→`) or click controls.
- Quick actions: Copy Direct URL, Copy Presigned URL, Download file, or Delete.

### 📤 Multi-file Upload Queue
- Upload multiple files via file picker or by dragging files onto the workspace.
- Floating upload queue panel with real-time percentage progress bars, animated indicators, and completion counters.
- Automatic file listing refresh upon batch completion.

### 🗂️ Dual View & Sorting
- Switch between **Grid View** (with image thumbnails) and **List View** (detailed table).
- Sort items by **Name**, **Size**, **Type**, or **Date Modified** (ascending / descending).
- Search files in real time.

---

## Tech Stack

- **Framework:** [SvelteKit](https://kit.svelte.dev) + [Svelte 5](https://svelte.dev) (Runes: `$state`, `$derived`, `$effect`)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com)
- **Icons:** [Lucide Svelte](https://lucide.dev)
- **AWS Integration:** [`@aws-sdk/client-s3`](https://github.com/aws/aws-sdk-js-v3) & [`@aws-sdk/s3-request-presigner`](https://github.com/aws/aws-sdk-js-v3)
- **Bundler:** [Vite](https://vitejs.dev)

---

## Getting Started

### 1. Prerequisites
- Node.js 18 or later
- An AWS account with an active S3 bucket (or S3-compatible service like MinIO / Cloudflare R2)

### 2. Clone and Install

```bash
git clone git@github.com:weebslife/aws-bucket-manager.git
cd aws-bucket-manager
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your S3 credentials:

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET=your-bucket-name

# Optional: S3-Compatible Providers (MinIO, Cloudflare R2, Wasabi, LocalStack)
# S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
# S3_FORCE_PATH_STYLE=false

# Optional: Custom CDN / Public Domain (CloudFront or custom domain)
# PUBLIC_S3_URL=https://cdn.example.com
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Build for Production

```bash
npm run build
npm run preview
```

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `⌘ / Ctrl + A` | Select all items in current folder |
| `⌘ / Ctrl + C` | Copy selected items to clipboard |
| `⌘ / Ctrl + X` | Cut selected items (for moving) |
| `⌘ / Ctrl + V` | Paste copied/cut items into current folder |
| `Delete` / `Backspace` | Delete selected item(s) |
| `Enter` | Open selected folder or open image preview |
| `Esc` | Close modal / clear selection |
| `←` / `→` | Previous / Next image in preview modal |

---

## License

This project is licensed under the [MIT License](LICENSE).
