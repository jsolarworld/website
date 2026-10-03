-- A product can be listed before its price is known: an empty price shows "Price on request" and is not sold online.
ALTER TABLE "Product" ALTER COLUMN "priceNgn" DROP NOT NULL;
