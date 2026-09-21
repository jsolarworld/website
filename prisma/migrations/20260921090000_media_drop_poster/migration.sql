-- The video still frame is derived from the video URL at render time (lib/media.ts), so it is not stored.
ALTER TABLE "ProductMedia" DROP COLUMN "posterUrl";
