export function base64_arraybuffer(data: BufferSource): Promise<string>;
export function base64url_arraybuffer(data: BufferSource): Promise<string>;
export function base64_to_base64url(original: string): string;
export function base64url_to_base64(original: string): string;
export function plutohash_arraybuffer(data: BufferSource): Promise<string>;
export function plutohash_str(s: string): Promise<string>;
export function debounced_promises(async_function: any): () => Promise<void>;
export function blob_url_to_data_url(blob_url: string): Promise<string>;
