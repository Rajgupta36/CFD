/*
  Warnings:

  - You are about to drop the column `assetId` on the `ClosedOrder` table. All the data in the column will be lost.
  - You are about to drop the `Asset` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `asset` to the `ClosedOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `margin` to the `ClosedOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slippage` to the `ClosedOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stoploss` to the `ClosedOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `takeprofit` to the `ClosedOrder` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ClosedOrder" DROP CONSTRAINT "ClosedOrder_assetId_fkey";

-- AlterTable
ALTER TABLE "ClosedOrder" DROP COLUMN "assetId",
ADD COLUMN     "asset" TEXT NOT NULL,
ADD COLUMN     "margin" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "slippage" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "stoploss" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "takeprofit" DOUBLE PRECISION NOT NULL;

-- DropTable
DROP TABLE "Asset";
