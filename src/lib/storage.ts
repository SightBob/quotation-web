const ASSET_BUCKET = "assets";

export function assetUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/${ASSET_BUCKET}/${path}` : null;
}

export { ASSET_BUCKET };
