"use client";

import type { NovaUser, NovaUserRole } from "./nova-auth";
import { getAuthStore, getCurrentUser, getUserTeams } from "./nova-auth";

export type NovaFeedback = {
  id: string;
  athleteUserId: string;
  fromUserId: string;
  fromName: string;
  fromRole: NovaUserRole;
  toUserId: string;
  toName: string;
  toRole: NovaUserRole;
  body: string;
  createdAt: string;
  updatedAt?: string;
};

const KEY = "nova-feedback-v2";

function read(): NovaFeedback[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is NovaFeedback => Boolean(item?.id && item?.athleteUserId && item?.fromUserId && item?.toUserId && item?.body)) : [];
  } catch {
    return [];
  }
}

function write(items: NovaFeedback[]) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("nova-feedback-updated"));
    return true;
  } catch {
    return false;
  }
}

function isManager(role: NovaUserRole) {
  return role === "director" || role === "coach";
}

function activeTeamIds(userId: string) {
  return new Set(getUserTeams(userId).map((team) => team.id));
}

function sameManagerAthleteTeam(managerId: string, athleteId: string) {
  const store = getAuthStore();
  const managerTeams = activeTeamIds(managerId);
  return store.members.some((member) =>
    member.userId === athleteId &&
    member.role === "athlete" &&
    member.status === "active" &&
    managerTeams.has(member.teamId),
  );
}

function linkedParentChild(parentId: string, athleteId: string) {
  const store = getAuthStore();
  return store.guardianLinks.some((link) =>
    link.guardianUserId === parentId &&
    link.athleteUserId === athleteId &&
    link.status === "active",
  );
}

export function canSendNovaFeedback(from: NovaUser, to: NovaUser) {
  if (from.id === to.id) return false;
  if (isManager(from.role) && to.role === "athlete") return sameManagerAthleteTeam(from.id, to.id);
  if (from.role === "athlete" && isManager(to.role)) return sameManagerAthleteTeam(to.id, from.id);
  if (from.role === "parent" && to.role === "athlete") return linkedParentChild(from.id, to.id);
  if (from.role === "athlete" && to.role === "parent") return linkedParentChild(to.id, from.id);
  return false;
}

export function getNovaFeedbackForUser(user: NovaUser): NovaFeedback[] {
  const items = read();
  if (isManager(user.role)) {
    const store = getAuthStore();
    const teams = activeTeamIds(user.id);
    const athleteIds = new Set(
      store.members.filter((member) => member.role === "athlete" && member.status === "active" && teams.has(member.teamId)).map((member) => member.userId),
    );
    return items.filter((item) => athleteIds.has(item.athleteUserId) && (isManager(item.fromRole) || isManager(item.toRole)));
  }
  if (user.role === "athlete") return items.filter((item) => item.athleteUserId === user.id);
  if (user.role === "parent") {
    const store = getAuthStore();
    const childIds = new Set(store.guardianLinks.filter((link) => link.guardianUserId === user.id && link.status === "active").map((link) => link.athleteUserId));
    return items.filter((item) => childIds.has(item.athleteUserId));
  }
  return [];
}

export function getNovaFeedbackTargets(user: NovaUser): NovaUser[] {
  const store = getAuthStore();
  if (isManager(user.role)) {
    const teams = activeTeamIds(user.id);
    return store.users.filter((candidate) => candidate.role === "athlete" && sameManagerAthleteTeam(user.id, candidate.id) && teams.size > 0);
  }
  if (user.role === "parent") {
    const childIds = new Set(store.guardianLinks.filter((link) => link.guardianUserId === user.id && link.status === "active").map((link) => link.athleteUserId));
    return store.users.filter((candidate) => candidate.role === "athlete" && childIds.has(candidate.id));
  }
  if (user.role === "athlete") {
    const result: NovaUser[] = [];
    const teams = activeTeamIds(user.id);
    const managerIds = new Set(store.members.filter((member) => isManager(member.role) && member.status === "active" && teams.has(member.teamId)).map((member) => member.userId));
    for (const candidate of store.users) if (managerIds.has(candidate.id) && isManager(candidate.role)) result.push(candidate);
    const parentIds = new Set(store.guardianLinks.filter((link) => link.athleteUserId === user.id && link.status === "active").map((link) => link.guardianUserId));
    for (const candidate of store.users) if (parentIds.has(candidate.id) && candidate.role === "parent") result.push(candidate);
    return result;
  }
  return [];
}

export function createNovaFeedback(from: NovaUser, to: NovaUser, body: string): NovaFeedback | null {
  const clean = body.trim();
  if (!clean || !canSendNovaFeedback(from, to)) return null;
  const item: NovaFeedback = {
    id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    athleteUserId: from.role === "athlete" ? from.id : to.id,
    fromUserId: from.id,
    fromName: from.name,
    fromRole: from.role,
    toUserId: to.id,
    toName: to.name,
    toRole: to.role,
    body: clean,
    createdAt: new Date().toISOString(),
  };
  write([item, ...read()]);
  return item;
}

export function updateNovaFeedback(user: NovaUser, feedbackId: string, body: string): NovaFeedback | null {
  const clean = body.trim();
  if (!clean) return null;
  const items = read();
  const index = items.findIndex((item) => item.id === feedbackId && item.fromUserId === user.id);
  if (index < 0) return null;
  items[index] = { ...items[index], body: clean, updatedAt: new Date().toISOString() };
  write(items);
  return items[index];
}

export function formatNovaFeedbackDate(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
