/*
  Warnings:

  - You are about to drop the column `content` on the `Note` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Note" DROP COLUMN "content",
ADD COLUMN     "blocks" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "title" TEXT NOT NULL DEFAULT 'Untitled';
