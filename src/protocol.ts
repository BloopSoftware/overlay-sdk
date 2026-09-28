import type { AcceptedSubscriptions, OverlayFrame, OverlayRecord, RecordKind, RecordRequest, RejectedSubscription, Subscriptions } from './types.js';

export const PROTOCOL_VERSION = 2;

export interface SubscribedFrame {
  type: 'sdk.subscribed';
  version: 2;
  revision: number;
  accepted: AcceptedSubscriptions;
  rejected: RejectedSubscription[];
}

export interface ReadyFrame {
  type: 'sdk.ready';
  version: 2;
  revision: number;
}

const NAME = /^[a-zA-Z_][a-zA-Z0-9_.-]{0,95}$/;
const BOARD = /^[a-zA-Z0-9_:.-]{1,96}$/;
const RECORD_ID = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/;
const RECORD_KINDS: readonly string[] = ['widget', 'giveaway', 'nowplaying', 'alert_design', 'theme'];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function uniqueNames(values: readonly string[], label: string, max: number, pattern = NAME): string[] {
  if (values.length > max || values.some((value) => typeof value !== 'string' || !pattern.test(value))) {
    throw new TypeError(`Invalid ${label} subscription`);
  }
  return [...new Set(values)];
}

/** A malformed request never reaches the socket; the server decides grants. */
export function helloFrame(subscriptions: Subscriptions): object {
  if (!subscriptions || !Array.isArray(subscriptions.events)) throw new TypeError('Events must be an array');
  const events = uniqueNames(subscriptions.events, 'event', 64);
  const variables = uniqueNames(subscriptions.variables ?? [], 'variable', 32);
  const messages = uniqueNames(subscriptions.messages ?? [], 'message', 64);
  const boards = uniqueNames(subscriptions.boards ?? [], 'board', 32, BOARD);
  const records = subscriptions.records ?? [];
  if (!Array.isArray(records) || records.length > 64 || records.some((record) =>
    !record || typeof record.kind !== 'string' || !NAME.test(record.kind) ||
    typeof record.id !== 'string' || !RECORD_ID.test(record.id))) {
    throw new TypeError('Invalid record subscription');
  }
  const uniqueRecords = [...new Map(records.map((record) => [`${record.kind}:${record.id}`, record])).values()];
  return { hello: 'overlay-sdk', version: PROTOCOL_VERSION, subscribe: { events, variables, messages, boards, records: uniqueRecords } };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isRecordRequest(value: unknown): value is RecordRequest {
  return isObject(value) && typeof value.kind === 'string' && typeof value.id === 'string';
}

export function isRecordKind(value: string): value is RecordKind {
  return RECORD_KINDS.includes(value);
}

export function recordKey(kind: RecordKind, id: string): string {
  return `${kind}:${id}`;
}

export function readRecord(value: unknown): OverlayRecord | null {
  if (!isObject(value) || typeof value.kind !== 'string' || !isRecordKind(value.kind) ||
    typeof value.id !== 'string' || !RECORD_ID.test(value.id) ||
    typeof value.revision !== 'number' || !Number.isSafeInteger(value.revision) || value.revision < 0 ||
    !Object.hasOwn(value, 'data')) return null;
  return { kind: value.kind, id: value.id, revision: value.revision, data: value.data };
}

function isRejection(value: unknown): value is RejectedSubscription {
  return isObject(value) &&
    ['event', 'variable', 'message', 'board', 'record'].includes(String(value.kind)) &&
    typeof value.name === 'string' &&
    (value.reason === 'unknown' || value.reason === 'not_granted');
}

export function readSubscribedFrame(value: unknown): SubscribedFrame | null {
  if (!isObject(value) || value.type !== 'sdk.subscribed' || value.version !== PROTOCOL_VERSION ||
    typeof value.revision !== 'number' || !Number.isSafeInteger(value.revision) || value.revision < 1 ||
    !isObject(value.accepted) || !isStringArray(value.accepted.events) ||
    !isStringArray(value.accepted.variables) || !isStringArray(value.accepted.messages) ||
    !isStringArray(value.accepted.boards) || !Array.isArray(value.accepted.records) ||
    !value.accepted.records.every(isRecordRequest) || !Array.isArray(value.rejected) ||
    !value.rejected.every(isRejection)) return null;
  return value as unknown as SubscribedFrame;
}

export function readReadyFrame(value: unknown): ReadyFrame | null {
  return isObject(value) && value.type === 'sdk.ready' && value.version === PROTOCOL_VERSION &&
    typeof value.revision === 'number' && Number.isSafeInteger(value.revision) && value.revision > 0
    ? value as unknown as ReadyFrame : null;
}

export function readEventFrame(value: unknown): OverlayFrame | null {
  return isObject(value) && typeof value.type === 'string' && value.type.length > 0
    ? { ...value, type: value.type }
    : null;
}
