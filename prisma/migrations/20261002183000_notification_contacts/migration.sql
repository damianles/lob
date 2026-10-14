-- Company email alerts: confirmed addresses, per-event switches, send log.

CREATE TYPE "NotificationEvent" AS ENUM (
  'LOAD_CANCELLED',
  'DATE_CHANGE_REQUESTED',
  'DATE_CHANGE_APPROVED',
  'DATE_CHANGE_DECLINED',
  'BID_SUBMITTED',
  'BID_ACCEPTED',
  'BID_DECLINED',
  'COUNTER_SUBMITTED',
  'COUNTER_ACCEPTED',
  'COUNTER_DECLINED',
  'LOAD_BOOKED',
  'LOAD_PICKED_UP',
  'LOAD_DELIVERED',
  'SUPPLIER_DATES_CHANGED',
  'DELIVERY_CONFIRMED',
  'FIRM_RATE_EXPIRED',
  'BID_WINDOW_ENDED',
  'LOAD_REMOVED',
  'ACCOUNT_APPROVED',
  'ACCOUNT_NEEDS_ATTENTION',
  'BID_EXPIRED',
  'LOAD_DETAILS_CHANGED',
  'INSURANCE_EXPIRING'
);

CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('SENT', 'FAILED');

CREATE TABLE "NotificationContact" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "userId" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "confirmTokenHash" TEXT,
  "confirmExpiresAt" TIMESTAMP(3),
  "confirmSentAt" TIMESTAMP(3),
  "mutedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationPreference" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "event" "NotificationEvent" NOT NULL,
  "enabled" BOOLEAN NOT NULL,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "contactId" TEXT,
  "event" "NotificationEvent" NOT NULL,
  "loadId" TEXT,
  "toEmail" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL,
  "providerId" TEXT,
  "error" TEXT,
  "dedupeKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationContact_userId_key" ON "NotificationContact"("userId");
CREATE UNIQUE INDEX "NotificationContact_confirmTokenHash_key" ON "NotificationContact"("confirmTokenHash");
CREATE UNIQUE INDEX "NotificationContact_companyId_email_key" ON "NotificationContact"("companyId", "email");
CREATE INDEX "NotificationContact_companyId_idx" ON "NotificationContact"("companyId");

CREATE UNIQUE INDEX "NotificationPreference_contactId_event_key" ON "NotificationPreference"("contactId", "event");
CREATE INDEX "NotificationPreference_event_enabled_idx" ON "NotificationPreference"("event", "enabled");

CREATE UNIQUE INDEX "NotificationDelivery_dedupeKey_key" ON "NotificationDelivery"("dedupeKey");
CREATE INDEX "NotificationDelivery_companyId_createdAt_idx" ON "NotificationDelivery"("companyId", "createdAt");
CREATE INDEX "NotificationDelivery_loadId_idx" ON "NotificationDelivery"("loadId");

ALTER TABLE "NotificationContact" ADD CONSTRAINT "NotificationContact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationContact" ADD CONSTRAINT "NotificationContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "NotificationContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "NotificationContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NotificationContact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationDelivery" ENABLE ROW LEVEL SECURITY;
