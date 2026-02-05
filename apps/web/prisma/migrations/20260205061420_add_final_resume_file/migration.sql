-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "finalResumeFileName" TEXT,
ADD COLUMN     "finalResumeFilePath" TEXT,
ADD COLUMN     "finalResumeFileSize" INTEGER,
ADD COLUMN     "finalResumeFileType" TEXT,
ADD COLUMN     "finalResumeUploadedAt" TIMESTAMP(3);
