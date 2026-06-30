-- AlterTable
ALTER TABLE "members" ADD COLUMN "rfid_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "members_rfid_token_key" ON "members"("rfid_token");
