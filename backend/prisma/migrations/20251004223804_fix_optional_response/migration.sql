-- AlterTable
ALTER TABLE "Commitment" ALTER COLUMN "responseId" DROP NOT NULL;

-- RenameForeignKey
ALTER TABLE "Commitment" RENAME CONSTRAINT "Commitment_responseId_fkey" TO "commitment_response_fk";
