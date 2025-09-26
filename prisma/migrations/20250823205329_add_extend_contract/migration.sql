/*
  Warnings:

  - A unique constraint covering the columns `[extendedContractId]` on the table `order_items` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "extendedContractId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "order_items_extendedContractId_key" ON "order_items"("extendedContractId");
