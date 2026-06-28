import "server-only";
import { newId } from "../ids";

/**
 * The "firehose" plane: chat, presence, reactions, leaderboards, global activity.
 * This is high-volume, append-mostly, eventually-consistent data, the opposite
 * of the money ledger, so it lives in DynamoDB with a single-table design.
 *
 * Backend switch by env (DYNAMODB_TABLE). With no table configured it falls back
 * to an in-process store so the app runs locally with zero AWS setup.
 *
 * Single-table key design (PK / SK):
 *   chat        LOT#<lot>   / MSG#<ts>#<id>
 *   presence    LOT#<lot>   / PRES#<userId>           (+ ttl)
 *   reaction    LOT#<lot>   / REACT#<emoji>           (ADD count)
 *   leaderboard LB#<lot>    / USER#<userId>           (ADD score)
 *   feed        FEED#GLOBAL / <ts>#<id>               (+ ttl)
 */

export interface ChatMessage {
  id: string;
  user: string;
  avatar: string;
  text: string;
  region: string;
  ts: number;
}
export interface PresenceUser {
  userId: string;
  handle: string;
  avatar: string;
  region: string;
  ts: number;
}
export interface FeedEvent {
  id: string;
  kind: string;
  text: string;
  lotId: string | null;
  region: string | null;
  ts: number;
}
export interface LeaderRow {
  userId: string;
  handle: string;
  avatar: string;
  score: number;
}

const PRESENCE_WINDOW_MS = 30_000;
const usingDynamo = () => !!process.env.DYNAMODB_TABLE;

// ---------------------------------------------------------------------------
// In-memory fallback store
// ---------------------------------------------------------------------------
interface MemStore {
  chat: Map<string, ChatMessage[]>;
  presence: Map<string, Map<string, PresenceUser>>;
  reactions: Map<string, Map<string, number>>;
  leaderboard: Map<string, Map<string, LeaderRow>>;
  feed: FeedEvent[];
}
const g = globalThis as unknown as { __lotzeroMem?: MemStore };
function mem(): MemStore {
  if (!g.__lotzeroMem)
    g.__lotzeroMem = {
      chat: new Map(),
      presence: new Map(),
      reactions: new Map(),
      leaderboard: new Map(),
      feed: [],
    };
  return g.__lotzeroMem;
}

// ---------------------------------------------------------------------------
// DynamoDB document client (lazy)
// ---------------------------------------------------------------------------
type Doc = {
  send: (cmd: unknown) => Promise<{ Items?: Record<string, unknown>[]; Item?: Record<string, unknown> }>;
};
let docPromise: Promise<Doc> | null = null;
async function doc(): Promise<Doc> {
  if (!docPromise)
    docPromise = (async () => {
      const { DynamoDBClient } = await import("@aws-sdk/client-dynamodb");
      const { DynamoDBDocumentClient } = await import("@aws-sdk/lib-dynamodb");
      const base = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
      return DynamoDBDocumentClient.from(base) as unknown as Doc;
    })();
  return docPromise;
}
const TABLE = () => process.env.DYNAMODB_TABLE as string;
const now = () => Date.now();
const ttlSecs = (ms: number) => Math.floor((now() + ms) / 1000);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function postChat(lotId: string, user: string, avatar: string, text: string, region: string) {
  const msg: ChatMessage = { id: newId("msg"), user, avatar, text: text.slice(0, 280), region, ts: now() };
  if (usingDynamo()) {
    const { PutCommand } = await import("@aws-sdk/lib-dynamodb");
    await (await doc()).send(
      new PutCommand({
        TableName: TABLE(),
        Item: { pk: `LOT#${lotId}`, sk: `MSG#${msg.ts}#${msg.id}`, type: "msg", ...msg, ttl: ttlSecs(86_400_000) },
      }),
    );
  } else {
    const list = mem().chat.get(lotId) ?? [];
    list.push(msg);
    mem().chat.set(lotId, list.slice(-200));
  }
  return msg;
}

export async function getChat(lotId: string, limit = 40): Promise<ChatMessage[]> {
  if (usingDynamo()) {
    const { QueryCommand } = await import("@aws-sdk/lib-dynamodb");
    const res = await (await doc()).send(
      new QueryCommand({
        TableName: TABLE(),
        KeyConditionExpression: "pk = :p AND begins_with(sk, :s)",
        ExpressionAttributeValues: { ":p": `LOT#${lotId}`, ":s": "MSG#" },
        ScanIndexForward: false,
        Limit: limit,
      }),
    );
    return ((res.Items ?? []) as unknown as ChatMessage[]).reverse();
  }
  return (mem().chat.get(lotId) ?? []).slice(-limit);
}

export async function heartbeat(lotId: string, user: PresenceUser) {
  if (usingDynamo()) {
    const { PutCommand } = await import("@aws-sdk/lib-dynamodb");
    await (await doc()).send(
      new PutCommand({
        TableName: TABLE(),
        Item: {
          pk: `LOT#${lotId}`,
          sk: `PRES#${user.userId}`,
          type: "pres",
          ...user,
          ts: now(),
          ttl: ttlSecs(PRESENCE_WINDOW_MS * 2),
        },
      }),
    );
  } else {
    const map = mem().presence.get(lotId) ?? new Map<string, PresenceUser>();
    map.set(user.userId, { ...user, ts: now() });
    mem().presence.set(lotId, map);
  }
}

export async function getPresence(lotId: string): Promise<PresenceUser[]> {
  const cutoff = now() - PRESENCE_WINDOW_MS;
  if (usingDynamo()) {
    const { QueryCommand } = await import("@aws-sdk/lib-dynamodb");
    const res = await (await doc()).send(
      new QueryCommand({
        TableName: TABLE(),
        KeyConditionExpression: "pk = :p AND begins_with(sk, :s)",
        ExpressionAttributeValues: { ":p": `LOT#${lotId}`, ":s": "PRES#" },
      }),
    );
    return ((res.Items ?? []) as unknown as PresenceUser[]).filter((u) => u.ts > cutoff);
  }
  return Array.from((mem().presence.get(lotId) ?? new Map<string, PresenceUser>()).values()).filter(
    (u) => u.ts > cutoff,
  );
}

export async function addReaction(lotId: string, emoji: string): Promise<void> {
  if (usingDynamo()) {
    const { UpdateCommand } = await import("@aws-sdk/lib-dynamodb");
    await (await doc()).send(
      new UpdateCommand({
        TableName: TABLE(),
        Key: { pk: `LOT#${lotId}`, sk: `REACT#${emoji}` },
        UpdateExpression: "ADD #c :one SET #t = :t",
        ExpressionAttributeNames: { "#c": "count", "#t": "type" },
        ExpressionAttributeValues: { ":one": 1, ":t": "react" },
      }),
    );
  } else {
    const map = mem().reactions.get(lotId) ?? new Map<string, number>();
    map.set(emoji, (map.get(emoji) ?? 0) + 1);
    mem().reactions.set(lotId, map);
  }
}

export async function getReactions(lotId: string): Promise<Record<string, number>> {
  if (usingDynamo()) {
    const { QueryCommand } = await import("@aws-sdk/lib-dynamodb");
    const res = await (await doc()).send(
      new QueryCommand({
        TableName: TABLE(),
        KeyConditionExpression: "pk = :p AND begins_with(sk, :s)",
        ExpressionAttributeValues: { ":p": `LOT#${lotId}`, ":s": "REACT#" },
      }),
    );
    const out: Record<string, number> = {};
    for (const it of res.Items ?? []) out[String(it.sk).replace("REACT#", "")] = Number(it.count ?? 0);
    return out;
  }
  return Object.fromEntries(mem().reactions.get(lotId) ?? new Map());
}

export async function bumpLeaderboard(lotId: string, userId: string, handle: string, avatar: string, by: number) {
  if (usingDynamo()) {
    const { UpdateCommand } = await import("@aws-sdk/lib-dynamodb");
    await (await doc()).send(
      new UpdateCommand({
        TableName: TABLE(),
        Key: { pk: `LB#${lotId}`, sk: `USER#${userId}` },
        UpdateExpression: "ADD score :s SET handle = :h, avatar = :a",
        ExpressionAttributeValues: { ":s": by, ":h": handle, ":a": avatar },
      }),
    );
  } else {
    const map = mem().leaderboard.get(lotId) ?? new Map<string, LeaderRow>();
    const cur = map.get(userId) ?? { userId, handle, avatar, score: 0 };
    cur.score += by;
    map.set(userId, cur);
    mem().leaderboard.set(lotId, map);
  }
}

export async function getLeaderboard(lotId: string, limit = 5): Promise<LeaderRow[]> {
  let rows: LeaderRow[];
  if (usingDynamo()) {
    const { QueryCommand } = await import("@aws-sdk/lib-dynamodb");
    const res = await (await doc()).send(
      new QueryCommand({
        TableName: TABLE(),
        KeyConditionExpression: "pk = :p",
        ExpressionAttributeValues: { ":p": `LB#${lotId}` },
      }),
    );
    rows = (res.Items ?? []).map((it) => ({
      userId: String(it.sk).replace("USER#", ""),
      handle: String(it.handle ?? ""),
      avatar: String(it.avatar ?? "🙂"),
      score: Number(it.score ?? 0),
    }));
  } else {
    rows = Array.from((mem().leaderboard.get(lotId) ?? new Map<string, LeaderRow>()).values());
  }
  return rows.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function pushFeed(kind: string, text: string, lotId: string | null, region: string | null) {
  const ev: FeedEvent = { id: newId("fd"), kind, text, lotId, region, ts: now() };
  if (usingDynamo()) {
    const { PutCommand } = await import("@aws-sdk/lib-dynamodb");
    await (await doc()).send(
      new PutCommand({
        TableName: TABLE(),
        Item: { pk: "FEED#GLOBAL", sk: `${ev.ts}#${ev.id}`, type: "feed", ...ev, ttl: ttlSecs(86_400_000) },
      }),
    );
  } else {
    mem().feed.push(ev);
    if (mem().feed.length > 300) mem().feed.splice(0, mem().feed.length - 300);
  }
  return ev;
}

export async function getFeed(limit = 30): Promise<FeedEvent[]> {
  if (usingDynamo()) {
    const { QueryCommand } = await import("@aws-sdk/lib-dynamodb");
    const res = await (await doc()).send(
      new QueryCommand({
        TableName: TABLE(),
        KeyConditionExpression: "pk = :p",
        ExpressionAttributeValues: { ":p": "FEED#GLOBAL" },
        ScanIndexForward: false,
        Limit: limit,
      }),
    );
    return (res.Items ?? []) as unknown as FeedEvent[];
  }
  return mem().feed.slice(-limit).reverse();
}
