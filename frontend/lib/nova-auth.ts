export type NovaUserRole = "admin" | "director" | "coach" | "athlete" | "parent";

export const NOVA_TEST_ACCOUNTS: Array<{ label: string; role: NovaUserRole; email: string; name: string }> = [
  { label: "관리자", role: "admin", email: "admin@test.nova.ai", name: "NOVA Admin" },
  { label: "감독", role: "director", email: "director@test.nova.ai", name: "NOVA 감독" },
  { label: "코치", role: "coach", email: "coach@test.nova.ai", name: "NOVA 코치" },
  { label: "선수", role: "athlete", email: "player@test.nova.ai", name: "NOVA 선수" },
  { label: "학부모", role: "parent", email: "parent@test.nova.ai", name: "NOVA 학부모" },
];
export type NovaMembershipStatus = "pending" | "active" | "rejected";
export type NovaInviteStatus = "pending" | "accepted" | "expired" | "cancelled";

export type NovaUser = {
  id: string;
  name: string;
  email: string;
  role: NovaUserRole;
  createdAt: string;
  trialStartedAt?: string;
  trialEndsAt?: string;
  subscriptionStatus?: "trial" | "active" | "expired" | "none";
};

export type NovaTeam = {
  id: string;
  name: string;
  sport?: string;
  organization?: string;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type NovaTeamMember = {
  id: string;
  teamId: string;
  userId: string;
  role: Exclude<NovaUserRole, "admin">;
  status: NovaMembershipStatus;
  invitedBy?: string;
  approvedAt?: string;
  createdAt: string;
};

export type NovaTeamInvite = {
  id: string;
  teamId: string;
  email?: string;
  role: Exclude<NovaUserRole, "admin">;
  code: string;
  status: NovaInviteStatus;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
};

export type NovaAthleteProfile = {
  userId: string;
  height?: number;
  weight?: number;
  bodyFat?: number;
  position?: string;
  injuryHistory?: string;
  gender?: "male" | "female" | "other";
  birthYear?: number;
  sport?: string;
  updatedAt: string;
};

export type NovaGuardianLink = {
  id: string;
  teamId: string;
  athleteUserId: string;
  guardianUserId: string;
  status: NovaMembershipStatus;
  createdAt: string;
  approvedAt?: string;
};

type NovaAuthStore = {
  users: NovaUser[];
  teams: NovaTeam[];
  members: NovaTeamMember[];
  invites: NovaTeamInvite[];
  guardianLinks: NovaGuardianLink[];
  athleteProfiles: NovaAthleteProfile[];
  currentUserId?: string;
};

const KEY = "nova-auth-store-v1";

const emptyStore = (): NovaAuthStore => ({
  users: [],
  teams: [],
  members: [],
  invites: [],
  guardianLinks: [],
  athleteProfiles: [],
});

function readStore(): NovaAuthStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<NovaAuthStore>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      teams: Array.isArray(parsed.teams) ? parsed.teams : [],
      members: Array.isArray(parsed.members) ? parsed.members : [],
      invites: Array.isArray(parsed.invites) ? parsed.invites : [],
      guardianLinks: Array.isArray(parsed.guardianLinks) ? parsed.guardianLinks : [],
      athleteProfiles: Array.isArray(parsed.athleteProfiles) ? parsed.athleteProfiles : [],
      currentUserId: typeof parsed.currentUserId === "string" ? parsed.currentUserId : undefined,
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: NovaAuthStore): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function inviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function getAuthStore(): NovaAuthStore {
  return readStore();
}

export function getAthleteProfile(userId?: string): NovaAthleteProfile | null {
  const store = readStore();
  const idValue = userId ?? store.currentUserId;
  if (!idValue) return null;
  return store.athleteProfiles.find((profile) => profile.userId === idValue) ?? null;
}

export function saveAthleteProfile(input: Omit<NovaAthleteProfile, "updatedAt">): NovaAthleteProfile | null {
  const store = readStore();
  const current = store.users.find((user) => user.id === store.currentUserId);
  if (!current || current.id !== input.userId || current.role !== "athlete") return null;

  const profile: NovaAthleteProfile = { ...input, updatedAt: new Date().toISOString() };
  const index = store.athleteProfiles.findIndex((item) => item.userId === input.userId);
  if (index >= 0) store.athleteProfiles[index] = profile;
  else store.athleteProfiles.push(profile);
  writeStore(store);
  return profile;
}

function refreshSubscriptionStatus(user: NovaUser): NovaUser {
  if (user.subscriptionStatus === "trial" && user.trialEndsAt && Date.now() >= new Date(user.trialEndsAt).getTime()) {
    user.subscriptionStatus = "expired";
  }
  return user;
}

export function getCurrentUser(): NovaUser | null {
  const store = readStore();
  const user = store.users.find((item) => item.id === store.currentUserId);
  if (!user) return null;
  refreshSubscriptionStatus(user);
  writeStore(store);
  return user;
}

export function registerUser(input: {
  name: string;
  email: string;
  role: NovaUserRole;
}): NovaUser {
  const store = readStore();
  const existing = store.users.find((user) => user.email.toLowerCase() === input.email.trim().toLowerCase());
  if (existing) {
    store.currentUserId = existing.id;
    writeStore(store);
    return existing;
  }

  const user: NovaUser = {
    id: id("user"),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
    createdAt: new Date().toISOString(),
    trialStartedAt: new Date().toISOString(),
    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    subscriptionStatus: "trial",
  };
  store.users.push(user);
  store.currentUserId = user.id;
  writeStore(store);
  return user;
}

export function signInDemoUser(input: {
  name: string;
  email: string;
  role: NovaUserRole;
}): NovaUser {
  const store = readStore();
  const normalizedEmail = input.email.trim().toLowerCase();
  let user = store.users.find((item) => item.email === normalizedEmail);

  if (user) {
    user.name = input.name.trim();
    user.role = input.role;
  } else {
    user = {
      id: id("user"),
      name: input.name.trim(),
      email: normalizedEmail,
      role: input.role,
      createdAt: new Date().toISOString(),
      trialStartedAt: new Date().toISOString(),
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      subscriptionStatus: "trial",
    };
    store.users.push(user);
  }

  store.currentUserId = user.id;
  writeStore(store);
  return user;
}

export function signInUser(email: string): NovaUser | null {
  const store = readStore();
  const user = store.users.find((item) => item.email === email.trim().toLowerCase());
  if (!user) return null;
  store.currentUserId = user.id;
  refreshSubscriptionStatus(user);
  writeStore(store);
  return user;
}

export function updateCurrentUserProfile(input: { name: string; email: string }): NovaUser | null {
  const store = readStore();
  const current = store.users.find((user) => user.id === store.currentUserId);
  if (!current) return null;

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name || !email) return null;

  const duplicate = store.users.find((user) => user.id !== current.id && user.email === email);
  if (duplicate) return null;

  current.name = name;
  current.email = email;
  writeStore(store);
  return current;
}


export function deleteCurrentUser(): boolean {
  const store = readStore();
  const userId = store.currentUserId;
  if (!userId) return false;

  store.users = store.users.filter((user) => user.id !== userId);
  store.members = store.members.filter((member) => member.userId !== userId);
  store.invites = store.invites.filter((invite) => invite.invitedBy !== userId);
  store.guardianLinks = store.guardianLinks.filter(
    (link) => link.guardianUserId !== userId && link.athleteUserId !== userId,
  );
  store.athleteProfiles = store.athleteProfiles.filter((profile) => profile.userId !== userId);
  store.teams = store.teams.filter((team) => team.ownerUserId !== userId);
  delete store.currentUserId;
  return writeStore(store);
}

export function findUserByEmail(email: string): NovaUser | null {
  const normalized = email.trim().toLowerCase();
  return readStore().users.find((user) => user.email === normalized) ?? null;
}

export function getAthleteSubscription(userId?: string): NovaUser | null {
  const store = readStore();
  const idValue = userId ?? store.currentUserId;
  if (!idValue) return null;
  const user = store.users.find((item) => item.id === idValue);
  if (!user || user.role !== "athlete") return null;
  refreshSubscriptionStatus(user);
  writeStore(store);
  return user.subscriptionStatus === "active" ? user : null;
}

export function activatePersonalSubscription(input: {
  athleteUserId: string;
  parentEmail: string;
  parentName: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}): NovaUser | null {
  const store = readStore();
  const athlete = store.users.find((user) => user.id === input.athleteUserId && user.role === "athlete");
  if (!athlete) return null;

  athlete.subscriptionStatus = "active";
  delete athlete.trialEndsAt;

  const normalizedParentEmail = input.parentEmail.trim().toLowerCase();
  if (normalizedParentEmail) {
    let parent = store.users.find((user) => user.email === normalizedParentEmail);
    if (!parent) {
      parent = {
        id: id("user"),
        name: input.parentName.trim() || "학부모",
        email: normalizedParentEmail,
        role: "parent",
        createdAt: new Date().toISOString(),
        subscriptionStatus: "none",
      };
      store.users.push(parent);
    }

    const existingLink = store.guardianLinks.find(
      (link) =>
        link.athleteUserId === athlete.id &&
        link.guardianUserId === parent.id &&
        link.status === "active",
    );
    if (!existingLink) {
      store.guardianLinks.push({
        id: id("guardian"),
        teamId: "",
        athleteUserId: athlete.id,
        guardianUserId: parent.id,
        status: "active",
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
      });
    }
  }

  writeStore(store);
  return athlete;
}

export function signOutUser() {
  const store = readStore();
  delete store.currentUserId;
  writeStore(store);
}

export function createTeam(input: {
  name: string;
  sport?: string;
  organization?: string;
}): NovaTeam | null {
  const store = readStore();
  const user = store.users.find((item) => item.id === store.currentUserId);
  if (!user || (user.role !== "director" && user.role !== "admin")) return null;

  const now = new Date().toISOString();
  const team: NovaTeam = {
    id: id("team"),
    name: input.name.trim(),
    sport: input.sport?.trim(),
    organization: input.organization?.trim(),
    ownerUserId: user.id,
    createdAt: now,
    updatedAt: now,
  };
  store.teams.push(team);

  if (user.role !== "admin") {
    store.members.push({
      id: id("member"),
      teamId: team.id,
      userId: user.id,
      role: "director",
      status: "active",
      approvedAt: now,
      createdAt: now,
    });
  }
  writeStore(store);
  return team;
}

export function createTeamInvite(input: {
  teamId: string;
  role: Exclude<NovaUserRole, "admin">;
  email?: string;
  expiresInDays?: number;
}): NovaTeamInvite | null {
  const store = readStore();
  const user = store.users.find((item) => item.id === store.currentUserId);
  const team = store.teams.find((item) => item.id === input.teamId);
  if (!user || !team) return null;

  const isDirector = store.members.some(
    (member) => member.teamId === team.id && member.userId === user.id && member.role === "director" && member.status === "active",
  );
  if (user.role !== "admin" && !isDirector) return null;

  const days = input.expiresInDays ?? 7;
  const invite: NovaTeamInvite = {
    id: id("invite"),
    teamId: team.id,
    email: input.email?.trim().toLowerCase(),
    role: input.role,
    code: inviteCode(),
    status: "pending",
    invitedBy: user.id,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + days * 86400000).toISOString(),
  };
  store.invites.push(invite);
  writeStore(store);
  return invite;
}

export function requestTeamJoin(code: string, userId?: string): NovaTeamMember | null {
  const store = readStore();
  const user = store.users.find((item) => item.id === (userId ?? store.currentUserId));
  const invite = store.invites.find((item) => item.code === code.trim().toUpperCase() && item.status === "pending");
  if (!user || !invite || new Date(invite.expiresAt).getTime() < Date.now()) return null;

  const duplicate = store.members.find(
    (member) => member.teamId === invite.teamId && member.userId === user.id && member.status === "active",
  );
  if (duplicate) return duplicate;

  const member: NovaTeamMember = {
    id: id("member"),
    teamId: invite.teamId,
    userId: user.id,
    role: invite.role,
    status: "pending",
    invitedBy: invite.invitedBy,
    createdAt: new Date().toISOString(),
  };
  store.members.push(member);
  writeStore(store);
  return member;
}

export function approveTeamMember(memberId: string): NovaTeamMember | null {
  const store = readStore();
  const approver = store.users.find((item) => item.id === store.currentUserId);
  const member = store.members.find((item) => item.id === memberId);
  if (!approver || !member) return null;

  const allowed = approver.role === "admin" || store.members.some(
    (item) => item.teamId === member.teamId && item.userId === approver.id && item.role === "director" && item.status === "active",
  );
  if (!allowed) return null;

  member.status = "active";
  member.approvedAt = new Date().toISOString();
  const invite = store.invites.find((item) => item.teamId === member.teamId && item.status === "pending" && item.invitedBy === member.invitedBy);
  if (invite) invite.status = "accepted";
  writeStore(store);
  return member;
}

export function requestGuardianLink(teamId: string, athleteUserId: string, guardianUserId?: string): NovaGuardianLink | null {
  const store = readStore();
  const guardianId = guardianUserId ?? store.currentUserId;
  if (!guardianId) return null;
  const link: NovaGuardianLink = {
    id: id("guardian"),
    teamId,
    athleteUserId,
    guardianUserId: guardianId,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  store.guardianLinks.push(link);
  writeStore(store);
  return link;
}

export function getUserTeams(userId?: string): NovaTeam[] {
  const store = readStore();
  const idValue = userId ?? store.currentUserId;
  if (!idValue) return [];
  const teamIds = new Set(store.members.filter((member) => member.userId === idValue && member.status === "active").map((member) => member.teamId));
  return store.teams.filter((team) => teamIds.has(team.id));
}

export function getTeamMembers(teamId: string): NovaTeamMember[] {
  return readStore().members.filter((member) => member.teamId === teamId);
}
