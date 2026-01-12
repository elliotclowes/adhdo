-- AlterTable User: Add streak tracking fields
ALTER TABLE "User" ADD COLUMN "currentStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "longestStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lastStreakCheckDate" TIMESTAMP(3);

-- AlterTable Todo: Add recurring streak tracking fields
ALTER TABLE "Todo" ADD COLUMN "recurringStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Todo" ADD COLUMN "longestRecurringStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Todo" ADD COLUMN "lastRecurringCompletionDate" TIMESTAMP(3);
