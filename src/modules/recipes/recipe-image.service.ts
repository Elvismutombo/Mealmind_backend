import type { UploadApiResponse } from "cloudinary";
import { z } from "zod";
import cloudinary from "../../config/cloudinary.js";

export interface RecipeImage {
  imageUrl: string;
  imagePublicId: string;
  imagePhotographer: string;
  imageSourceUrl: string;
}

export interface PexelsRecipeImage {
  buffer: Buffer;
  photographer: string;
  sourceUrl: string;
}

const pexelsImageUrlSchema = z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && url.hostname === "images.pexels.com";
});

const pexelsResponseSchema = z.object({
  photos: z.array(
    z.object({
      url: z.string().url().refine((value) => {
        const url = new URL(value);
        return url.protocol === "https:" && url.hostname === "www.pexels.com";
      }),
      photographer: z.string().trim().min(1).max(120),
      src: z.object({
        landscape: pexelsImageUrlSchema.optional(),
        large: pexelsImageUrlSchema.optional(),
        medium: pexelsImageUrlSchema.optional(),
      }),
    }),
  ),
});

const maxImageBytes = 10 * 1024 * 1024;

export const ensureRecipeImageStorageConfigured = (): void => {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }
};

export const findRecipeImageOnPexels = async (
  title: string,
): Promise<PexelsRecipeImage> => {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    throw new Error("PEXELS_NOT_CONFIGURED");
  }

  const searchUrl = new URL("https://api.pexels.com/v1/search");
  searchUrl.searchParams.set("query", title);
  searchUrl.searchParams.set("orientation", "landscape");
  searchUrl.searchParams.set("per_page", "1");
  searchUrl.searchParams.set("locale", "fr-FR");

  const searchResponse = await fetch(searchUrl, {
    headers: { Authorization: apiKey },
    signal: AbortSignal.timeout(15_000),
  }).catch((error: unknown) => {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error("Pexels recipe image search request failed:", detail);
    throw new Error("PEXELS_SEARCH_FAILED");
  });

  if (!searchResponse.ok) {
    console.error(`Pexels recipe image search failed: HTTP ${searchResponse.status}`);
    throw new Error(
      searchResponse.status === 429
        ? "PEXELS_RATE_LIMITED"
        : "PEXELS_SEARCH_FAILED",
    );
  }

  const payload: unknown = await searchResponse.json().catch(() => null);
  const parsed = pexelsResponseSchema.safeParse(payload);
  if (!parsed.success) {
    console.error("Pexels recipe image search returned an invalid response");
    throw new Error("PEXELS_INVALID_RESPONSE");
  }

  const photo = parsed.data.photos[0];
  if (!photo) {
    throw new Error("PEXELS_NO_RESULTS");
  }

  const imageUrl = photo.src.landscape ?? photo.src.large ?? photo.src.medium;
  if (!imageUrl) {
    throw new Error("PEXELS_IMAGE_URL_MISSING");
  }

  const imageResponse = await fetch(imageUrl, {
    signal: AbortSignal.timeout(15_000),
  }).catch((error: unknown) => {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error("Pexels recipe image download failed:", detail);
    throw new Error("PEXELS_DOWNLOAD_FAILED");
  });

  const contentType = imageResponse.headers.get("content-type")?.split(";")[0];
  const contentLength = Number(imageResponse.headers.get("content-length"));
  if (
    !imageResponse.ok ||
    !contentType?.startsWith("image/") ||
    (Number.isFinite(contentLength) && contentLength > maxImageBytes)
  ) {
    console.error(
      `Pexels recipe image download returned invalid data: HTTP ${imageResponse.status}`,
    );
    throw new Error("PEXELS_INVALID_IMAGE");
  }

  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  if (buffer.length === 0 || buffer.length > maxImageBytes) {
    throw new Error("PEXELS_INVALID_IMAGE");
  }

  return {
    buffer,
    photographer: photo.photographer,
    sourceUrl: photo.url,
  };
};

const uploadToCloudinary = (image: Buffer): Promise<UploadApiResponse> => {
  ensureRecipeImageStorageConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "mealmind/recipes",
        resource_type: "image",
        transformation: [
          { width: 1200, height: 900, crop: "fill" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) {
          let detail = error instanceof Error ? error.message : "Unknown error";
          for (const secret of [
            process.env.CLOUDINARY_API_KEY,
            process.env.CLOUDINARY_API_SECRET,
          ]) {
            if (secret) detail = detail.replaceAll(secret, "[redacted]");
          }
          console.error("Cloudinary recipe image upload failed:", detail);
          reject(new Error("CLOUDINARY_UPLOAD_FAILED"));
          return;
        }

        if (!result) {
          reject(new Error("CLOUDINARY_UPLOAD_FAILED"));
          return;
        }

        resolve(result);
      },
    );

    stream.end(image);
  });
};

export const uploadRecipeImage = async (
  image: PexelsRecipeImage,
): Promise<RecipeImage> => {
  const uploaded = await uploadToCloudinary(image.buffer);
  return {
    imageUrl: uploaded.secure_url,
    imagePublicId: uploaded.public_id,
    imagePhotographer: image.photographer,
    imageSourceUrl: image.sourceUrl,
  };
};

export const deleteRecipeImage = async (imagePublicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(imagePublicId, { resource_type: "image" });
};
