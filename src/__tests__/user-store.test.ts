import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useUserStore } from "@/stores/user";

// Mock Amplify auth
vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn().mockResolvedValue({}),
  getCurrentUser: vi.fn().mockResolvedValue({ username: "testuser", userId: "user-123" }),
  fetchUserAttributes: vi.fn().mockResolvedValue({ nickname: "Test", email: "test@example.com" }),
  signOut: vi.fn().mockResolvedValue(undefined),
  updateUserAttributes: vi.fn().mockResolvedValue(undefined),
}));

describe("User Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("starts unauthenticated", () => {
    const store = useUserStore();
    expect(store.isAuthenticated).toBe(false);
    expect(store.username).toBe("");
  });

  it("fetches user and updates state", async () => {
    const store = useUserStore();
    await store.fetchUser();

    expect(store.isAuthenticated).toBe(true);
    expect(store.username).toBe("testuser");
    expect(store.userId).toBe("user-123");
    expect(store.nickname).toBe("Test");
    expect(store.email).toBe("test@example.com");
  });

  it("signs out and clears state", async () => {
    const store = useUserStore();
    await store.fetchUser();
    expect(store.isAuthenticated).toBe(true);

    await store.signOut();
    expect(store.isAuthenticated).toBe(false);
    expect(store.username).toBe("");
  });
});
