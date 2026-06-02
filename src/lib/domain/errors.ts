export type BidErrorCode =
  | "not_found"
  | "not_live"
  | "ended"
  | "too_low"
  | "insufficient"
  | "no_wallet"
  | "sold_out"
  | "self_bid"
  | "wrong_type";

export class BidError extends Error {
  code: BidErrorCode;
  detail?: number;
  constructor(code: BidErrorCode, message: string, detail?: number) {
    super(message);
    this.name = "BidError";
    this.code = code;
    this.detail = detail;
  }
}
