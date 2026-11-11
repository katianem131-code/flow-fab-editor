import { describe, expect, it, vi } from "vitest";
import { stepDestination, ownsPath, backoff, type Destination, type Patch, type Phase } from "./publishing";
import { authorizationUrl, allowedOrigin, readConfig } from "./config";

const dest = (phase: Phase = "pending"): Destination => ({ id: "d", account_id: "a", user_id: "u", phase, container_id: null, media_id: null, attempts: 0, operation_started_at: null });
function harness(row: Destination) {
  const current = { ...row };
  const io = { save: vi.fn(async (expected: Phase, patch: Patch) => {
    if (current.phase !== expected) return false;
    Object.assign(current, patch); return true;
  }), create: vi.fn(async () => "container-1"), status: vi.fn(async () => "FINISHED"), publish: vi.fn(async () => "media-1") };
  return { current, io };
}
describe("Instagram delivery safety", () => {
  it("only one concurrent caller can create a container", async () => {
    const h = harness(dest()); await Promise.all([stepDestination(dest(), h.io), stepDestination(dest(), h.io)]);
    expect(h.io.create).toHaveBeenCalledTimes(1); expect(h.current.container_id).toBe("container-1");
  });
  it("resumes processing without recreating and publishes exactly once", async () => {
    const h = harness({ ...dest("processing"), container_id: "existing" });
    await stepDestination({ ...h.current }, h.io); expect(h.current.phase).toBe("ready");
    await stepDestination({ ...h.current }, h.io); await stepDestination({ ...h.current }, h.io);
    expect(h.io.create).not.toHaveBeenCalled(); expect(h.io.publish).toHaveBeenCalledExactlyOnceWith("existing"); expect(h.current.media_id).toBe("media-1");
  });
  it("partial failure never replays the completed destination", async () => {
    const done = harness({ ...dest("published"), media_id: "completed" }); const failed = harness(dest());
    failed.io.create.mockRejectedValue({ code: "invalid_video", recoverable: false, ambiguous: false });
    await stepDestination({ ...done.current }, done.io); await stepDestination({ ...failed.current }, failed.io);
    expect(done.io.publish).not.toHaveBeenCalled(); expect(done.io.create).not.toHaveBeenCalled(); expect(failed.current.phase).toBe("failed");
  });
  it("ambiguous publish reconciles PUBLISHED without retry", async () => {
    const h = harness({ ...dest("ready"), container_id: "existing" }); h.io.publish.mockRejectedValue({ ambiguous: true });
    await stepDestination({ ...h.current }, h.io); expect(h.current.phase).toBe("unknown");
    h.io.status.mockResolvedValue("FINISHED"); await stepDestination({ ...h.current }, h.io); expect(h.current.phase).toBe("unknown");
    h.io.status.mockResolvedValue("PUBLISHED"); await stepDestination({ ...h.current }, h.io);
    expect(h.current.phase).toBe("published"); expect(h.io.publish).toHaveBeenCalledTimes(1); expect(h.current.media_id).toBeNull();
  });
  it("interrupted creation cannot be retried blindly", async () => {
    const h = harness(dest("creating")); await stepDestination({ ...h.current }, h.io); await stepDestination({ ...h.current }, h.io);
    expect(h.current.phase).toBe("unknown"); expect(h.io.create).not.toHaveBeenCalled();
  });
  it("rejects other user storage and traversal", () => {
    expect(ownsPath("alice", "bob/posts/video.mp4")).toBe(false); expect(ownsPath("alice", "alice/../bob/video.mp4")).toBe(false);
    expect(ownsPath("alice", "alice/posts/video.mp4")).toBe(true);
  });
  it("backs off at least one minute and at most one hour", () => { expect(backoff(0)).toBe(60); expect(backoff(3)).toBe(480); expect(backoff(100)).toBe(3600); });
  it("requires configuration ID and version; requests code without extra permissions", () => {
    expect(readConfig({ META_APP_ID: "2056146455756708" })).toBeNull();
    const url = new URL(authorizationUrl({ appId: "2056146455756708", configId: "123", version: "v26.0", tokenKind: "system_user", appSecret: "offline-test" }, "https://flow-fab-editor.lovable.app", "state"));
    expect(url.searchParams.get("response_type")).toBe("code"); expect(url.searchParams.get("scope")).toBeNull();
    expect(url.searchParams.get("redirect_uri")).toBe("https://flow-fab-editor.lovable.app/api/public/meta/callback");
    expect(allowedOrigin("https://evil.test")).toBe(false);
  });
});