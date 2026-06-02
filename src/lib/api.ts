import { NextResponse } from "next/server";
import { BidError } from "./domain/errors";

export function ok<T>(data: T) {
  return NextResponse.json(data);
}

export function fail(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

export function handleError(e: unknown) {
  if (e instanceof BidError) {
    return NextResponse.json(
      { error: e.code, message: e.message, detail: e.detail },
      { status: 409 },
    );
  }
  console.error("[lotzero] unhandled error:", e);
  const message = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: "internal", message }, { status: 500 });
}
