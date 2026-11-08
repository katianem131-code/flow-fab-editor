import { create } from "zustand";

export type PostStatus = "scheduled" | "publishing" | "published" | "error";
export type PostFormat = "reels" | "feed" | "stories";

export interface ScheduledPost {
  id: string;
  videoName: string;
  headline: string;
  caption: string;
  accounts: string[];
  format: PostFormat;
  publishAt: string; // ISO
  coverSecond: number;
  status: PostStatus;
  createdAt: string;
}

export const STATUS_LABEL: Record<PostStatus, string> = {
  scheduled: "Agendado",
  publishing: "Publicando",
  published: "Publicado",
  error: "Com erro",
};

export const FORMAT_LABEL: Record<PostFormat, string> = {
  reels: "Padrão da conta (só Reels)",
  feed: "Reels + Feed",
  stories: "Stories",
};

const KEY = "labremix.schedule.v1";
const ACC_KEY = "labremix.schedule.accounts.v1";

function read<T>(k: string, fb: T): T {
  if (typeof window === "undefined") return fb;
  try {
    return JSON.parse(localStorage.getItem(k) ?? "") as T;
  } catch {
    return fb;
  }
}

interface ScheduleState {
  posts: ScheduledPost[];
  accounts: string[];
  hydrate: () => void;
  addPost: (p: Omit<ScheduledPost, "id" | "createdAt">) => void;
  updatePost: (id: string, patch: Partial<ScheduledPost>) => void;
  removePost: (id: string) => void;
  addAccount: (handle: string) => void;
}

function persist(s: Pick<ScheduleState, "posts" | "accounts">) {
  localStorage.setItem(KEY, JSON.stringify(s.posts));
  localStorage.setItem(ACC_KEY, JSON.stringify(s.accounts));
}

export const useSchedule = create<ScheduleState>((set, get) => ({
  posts: [],
  accounts: [],
  hydrate: () => set({ posts: read(KEY, []), accounts: read(ACC_KEY, []) }),
  addPost: (p) => {
    const post = { ...p, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    set({ posts: [...get().posts, post] });
    persist(get());
  },
  updatePost: (id, patch) => {
    set({ posts: get().posts.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
    persist(get());
  },
  removePost: (id) => {
    set({ posts: get().posts.filter((p) => p.id !== id) });
    persist(get());
  },
  addAccount: (handle) => {
    const h = handle.trim().replace(/^@?/, "@");
    if (h.length < 2 || get().accounts.includes(h)) return;
    set({ accounts: [...get().accounts, h] });
    persist(get());
  },
}));

export function countByStatus(posts: ScheduledPost[]) {
  const c = { all: posts.length, scheduled: 0, publishing: 0, published: 0, error: 0 };
  for (const p of posts) c[p.status]++;
  return c;
}

export function nextPost(posts: ScheduledPost[], now = new Date()) {
  return posts
    .filter((p) => p.status === "scheduled" && new Date(p.publishAt) >= now)
    .sort((a, b) => a.publishAt.localeCompare(b.publishAt))[0];
}
