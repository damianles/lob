/**
 * Carrier board visibility cutoffs by rate mode.
 * Firm Rate (TAKE_IT): stay on board 7 days past pickup.
 * Open bid / everything else: 48h past pickup (legacy board rule).
 */

import { LoadRateMode, LoadStatus, type Prisma } from "@prisma/client";

export const BOARD_GRACE_HOURS_DEFAULT = 48;
export const BOARD_GRACE_HOURS_FIRM_RATE = 7 * 24; // 7 days
export const MAX_BID_WINDOW_HOURS = 72;
export const BID_ACCEPT_HOURS = 24;
export const MAX_OPEN_BID_CYCLES = 2;

export function boardGraceMsForRateMode(rateMode: LoadRateMode | string): number {
  if (rateMode === LoadRateMode.TAKE_IT || rateMode === "TAKE_IT") {
    return BOARD_GRACE_HOURS_FIRM_RATE * 60 * 60 * 1000;
  }
  return BOARD_GRACE_HOURS_DEFAULT * 60 * 60 * 1000;
}

export function boardCutoffForRateMode(rateMode: LoadRateMode | string, now = new Date()): Date {
  return new Date(now.getTime() - boardGraceMsForRateMode(rateMode));
}

/** Earliest pickup still visible for the most permissive mode (Firm Rate 7d). */
export function earliestBoardPickupCutoff(now = new Date()): Date {
  return new Date(now.getTime() - BOARD_GRACE_HOURS_FIRM_RATE * 60 * 60 * 1000);
}

export function isPostedLoadOnBoard(args: {
  status: LoadStatus | string;
  rateMode: LoadRateMode | string;
  requestedPickupAt: Date;
  now?: Date;
}): boolean {
  if (args.status !== LoadStatus.POSTED && args.status !== "POSTED") return false;
  const now = args.now ?? new Date();
  return args.requestedPickupAt.getTime() >= boardCutoffForRateMode(args.rateMode, now).getTime();
}

/**
 * Prisma OR filter for carrier/admin board: POSTED loads still within mode grace,
 * plus any non-POSTED rows the caller may still want (booked etc. — caller composes).
 */
export function postedOnBoardWhere(now = new Date()): Prisma.LoadWhereInput {
  const firmCutoff = boardCutoffForRateMode(LoadRateMode.TAKE_IT, now);
  const defaultCutoff = boardCutoffForRateMode(LoadRateMode.OPEN_BID, now);
  return {
    status: LoadStatus.POSTED,
    OR: [
      { rateMode: LoadRateMode.TAKE_IT, requestedPickupAt: { gte: firmCutoff } },
      { rateMode: LoadRateMode.OPEN_BID, requestedPickupAt: { gte: defaultCutoff } },
    ],
  };
}
