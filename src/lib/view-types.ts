import type { Lot } from "./types";

export type LotView = Lot & {
  current_price_cents?: number;
  min_next_cents?: number;
};
