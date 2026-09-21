-- Products gain video, so ProductImage becomes ProductMedia.
-- Written as a rename rather than Prisma's default drop-and-create: the table is empty today,
-- but any photos staff upload before this ships would otherwise be lost.

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO');

-- RenameTable
ALTER TABLE "ProductImage" RENAME TO "ProductMedia";

-- RenameIndex (Postgres keeps the old names through a table rename)
ALTER INDEX "ProductImage_pkey" RENAME TO "ProductMedia_pkey";
ALTER INDEX "ProductImage_productId_idx" RENAME TO "ProductMedia_productId_idx";

-- RenameConstraint
ALTER TABLE "ProductMedia" RENAME CONSTRAINT "ProductImage_productId_fkey" TO "ProductMedia_productId_fkey";

-- AlterTable: existing rows are all photos.
ALTER TABLE "ProductMedia" ADD COLUMN "kind" "MediaKind" NOT NULL DEFAULT 'IMAGE';
ALTER TABLE "ProductMedia" ADD COLUMN "posterUrl" TEXT;
