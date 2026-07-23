-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'NUTRIOLOGO');

-- CreateEnum
CREATE TYPE "EstadoCuenta" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'ILIMITADO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "estado" "EstadoCuenta" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "notasAdmin" TEXT,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'NUTRIOLOGO',
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "tier" "PlanTier" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "tierUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

