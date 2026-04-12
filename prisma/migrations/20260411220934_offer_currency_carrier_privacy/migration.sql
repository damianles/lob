-- CreateEnum
CREATE TYPE "OfferCurrency" AS ENUM ('USD', 'CAD');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "agreedCurrency" "OfferCurrency" NOT NULL DEFAULT 'USD';

-- AlterTable
ALTER TABLE "Load" ADD COLUMN     "offerCurrency" "OfferCurrency" NOT NULL DEFAULT 'USD';
