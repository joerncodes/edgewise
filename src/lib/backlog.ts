import type { Knife } from "./storage/types";

export function inBacklog(k: Knife): boolean {
  return k.backlog === true;
}

export function backlogList(knives: Knife[]): Knife[] {
  return knives.filter(inBacklog);
}
