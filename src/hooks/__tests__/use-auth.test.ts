import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProject).mockResolvedValue({ id: "new-project-1" } as any);
  });

  test("initial state has isLoading false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  describe("signIn", () => {
    test("returns result from signInAction", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());

      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signIn("user@test.com", "password123");
      });

      expect(returnValue).toEqual({ success: true });
    });

    test("sets isLoading true during call and false after", async () => {
      let resolveSignIn: (val: any) => void;
      vi.mocked(signInAction).mockReturnValue(
        new Promise((resolve) => { resolveSignIn = resolve; })
      );

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signIn("user@test.com", "password123");
      });
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn!({ success: false, error: "Invalid credentials" });
      });
      expect(result.current.isLoading).toBe(false);
    });

    test("sets isLoading false even when signInAction throws", async () => {
      vi.mocked(signInAction).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password123").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns error result without redirecting on failed sign in", async () => {
      vi.mocked(signInAction).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());

      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signIn("user@test.com", "wrongpass");
      });

      expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
      expect(mockPush).not.toHaveBeenCalled();
      expect(createProject).not.toHaveBeenCalled();
    });

    test("redirects to existing project when user has projects and no anon work", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getProjects).mockResolvedValue([
        { id: "project-abc" } as any,
        { id: "project-def" } as any,
      ]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@test.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/project-abc");
      expect(createProject).not.toHaveBeenCalled();
    });

    test("creates new project and redirects when user has no projects and no anon work", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockResolvedValue({ id: "brand-new-1" } as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@test.com", "password123");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({ messages: [], data: {} })
      );
      expect(mockPush).toHaveBeenCalledWith("/brand-new-1");
    });

    test("migrates anon work into a new project and redirects", async () => {
      const anonMessages = [{ role: "user", content: "make a button" }];
      const anonFileSystem = { "/App.tsx": { type: "file", content: "<App/>" } };
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue({
        messages: anonMessages,
        fileSystemData: anonFileSystem,
      });
      vi.mocked(createProject).mockResolvedValue({ id: "migrated-1" } as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@test.com", "password123");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: anonMessages,
          data: anonFileSystem,
        })
      );
      expect(clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/migrated-1");
      expect(getProjects).not.toHaveBeenCalled();
    });

    test("ignores anon work when messages array is empty", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue({
        messages: [],
        fileSystemData: { "/": { type: "directory" } },
      });
      vi.mocked(getProjects).mockResolvedValue([{ id: "existing-1" } as any]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@test.com", "password123");
      });

      expect(clearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-1");
    });
  });

  describe("signUp", () => {
    test("returns result from signUpAction", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());

      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signUp("new@test.com", "password123");
      });

      expect(returnValue).toEqual({ success: true });
    });

    test("sets isLoading true during call and false after", async () => {
      let resolveSignUp: (val: any) => void;
      vi.mocked(signUpAction).mockReturnValue(
        new Promise((resolve) => { resolveSignUp = resolve; })
      );

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signUp("new@test.com", "password123");
      });
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp!({ success: false, error: "Email already registered" });
      });
      expect(result.current.isLoading).toBe(false);
    });

    test("sets isLoading false even when signUpAction throws", async () => {
      vi.mocked(signUpAction).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@test.com", "password123").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns error result without redirecting on failed sign up", async () => {
      vi.mocked(signUpAction).mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      const { result } = renderHook(() => useAuth());

      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signUp("existing@test.com", "password123");
      });

      expect(returnValue).toEqual({ success: false, error: "Email already registered" });
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("migrates anon work into a new project after successful sign up", async () => {
      const anonMessages = [{ role: "user", content: "build a form" }];
      const anonFileSystem = { "/Form.tsx": { type: "file", content: "<Form/>" } };
      vi.mocked(signUpAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue({
        messages: anonMessages,
        fileSystemData: anonFileSystem,
      });
      vi.mocked(createProject).mockResolvedValue({ id: "signup-project-1" } as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@test.com", "password123");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: anonMessages,
          data: anonFileSystem,
        })
      );
      expect(clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/signup-project-1");
    });

    test("creates new project and redirects for new user with no anon work", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: true });
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockResolvedValue({ id: "first-project-1" } as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@test.com", "password123");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({ messages: [], data: {} })
      );
      expect(mockPush).toHaveBeenCalledWith("/first-project-1");
    });
  });
});
