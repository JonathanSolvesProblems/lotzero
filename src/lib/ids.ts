import { randomUUID } from "node:crypto";

// Application-generated IDs. Aurora DSQL has no sequences / SERIAL, so we never
// rely on the database to mint identifiers. The same code path works on PGlite.
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}
