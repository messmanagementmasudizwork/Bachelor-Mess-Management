import { getRequiredClient } from "@/lib/supabase/client";

export type StorageBucket = "avatars" | "mess-logos" | "receipts" | "media";

export interface UploadResult {
  path: string;
  url: string;
}

export const storageService = {
  /**
   * Upload a file to a Supabase Storage bucket.
   * Returns the storage path and the public/signed URL.
   */
  async upload(
    bucket: StorageBucket,
    folder: string,
    file: File,
    fileNameOverride?: string
  ): Promise<UploadResult> {
    const supabase = getRequiredClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const fileName = fileNameOverride ?? `${Date.now()}.${ext}`;
    const path = `${folder}/${fileName}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) throw new Error(error.message);

    const isPublic = bucket === "avatars" || bucket === "mess-logos";

    if (isPublic) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return { path, url: data.publicUrl };
    }

    const { data, error: signErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60); // 1 hour
    if (signErr) throw new Error(signErr.message);
    return { path, url: data.signedUrl };
  },

  /**
   * Delete a file from storage by path.
   */
  async remove(bucket: StorageBucket, path: string): Promise<void> {
    const supabase = getRequiredClient();
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw new Error(error.message);
  },

  /**
   * Get a fresh signed URL for a private file.
   */
  async getSignedUrl(bucket: StorageBucket, path: string, expiresIn = 3600): Promise<string> {
    const supabase = getRequiredClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  },

  /**
   * Get a public URL (only for public buckets).
   */
  getPublicUrl(bucket: StorageBucket, path: string): string {
    const supabase = getRequiredClient();
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * Upload profile avatar — deletes ALL existing avatar files first,
   * then saves the new one to avatars/{userId}/avatar.{ext}
   * Ensures only 1 file ever exists regardless of extension changes.
   */
  async uploadAvatar(userId: string, file: File): Promise<string> {
    const supabase = getRequiredClient();
    // Delete all existing files in the user's avatar folder first
    const { data: existing } = await supabase.storage
      .from("avatars")
      .list(userId);
    if (existing && existing.length > 0) {
      const paths = existing.map((f) => `${userId}/${f.name}`);
      await supabase.storage.from("avatars").remove(paths);
    }
    const ext = file.name.split(".").pop() ?? "jpg";
    const { url } = await storageService.upload("avatars", userId, file, `avatar.${ext}`);
    return url;
  },

  /**
   * Delete all avatar files for a user from storage.
   */
  async deleteAvatar(userId: string): Promise<void> {
    const supabase = getRequiredClient();
    const { data: existing } = await supabase.storage
      .from("avatars")
      .list(userId);
    if (existing && existing.length > 0) {
      const paths = existing.map((f) => `${userId}/${f.name}`);
      await supabase.storage.from("avatars").remove(paths);
    }
  },

  /**
   * Upload mess logo — saves to mess-logos/{messId}/logo.{ext}
   */
  async uploadMessLogo(messId: string, file: File): Promise<string> {
    const ext = file.name.split(".").pop() ?? "jpg";
    const { url } = await storageService.upload("mess-logos", messId, file, `logo.${ext}`);
    return url;
  },

  /**
   * Upload receipt — saves to receipts/{userId}/{timestamp}.{ext}
   */
  async uploadReceipt(userId: string, file: File): Promise<UploadResult> {
    return storageService.upload("receipts", userId, file);
  },

  /**
   * Upload complaint media — saves to media/{userId}/{timestamp}.{ext}
   */
  async uploadMedia(userId: string, file: File): Promise<UploadResult> {
    return storageService.upload("media", userId, file);
  },
};
