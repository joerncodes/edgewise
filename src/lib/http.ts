import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function notFound(message = "not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function serverError(err: unknown) {
  console.error(err);
  const message = err instanceof Error ? err.message : "internal error";
  return NextResponse.json({ error: message }, { status: 500 });
}

export function fromZod(err: ZodError) {
  return badRequest("validation failed", err.flatten());
}

export function nowIso(): string {
  return new Date().toISOString();
}
