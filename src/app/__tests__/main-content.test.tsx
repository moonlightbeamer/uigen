import { test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainContent } from "../main-content";

// Mock context providers as pass-through wrappers
vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: any) => <>{children}</>,
}));

// Mock heavy child components with simple stubs
vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface" />,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree" />,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor" />,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame" />,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions" />,
}));

// Mock Resizable components as simple pass-through divs
vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  ResizablePanel: ({ children }: any) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

// Mock Tabs with a functional implementation using shared context.
// Uses async factory to access React after vi.mock hoisting.
vi.mock("@/components/ui/tabs", async () => {
  const { createContext, useContext } = await import("react");
  const TabsCtx = createContext<any>(null);

  return {
    Tabs: ({ value, onValueChange, children, className }: any) => (
      <TabsCtx.Provider value={{ value, onValueChange }}>
        <div className={className} data-testid="tabs" data-value={value}>
          {children}
        </div>
      </TabsCtx.Provider>
    ),
    TabsList: ({ children, className }: any) => (
      <div role="tablist" className={className}>
        {children}
      </div>
    ),
    TabsTrigger: ({ value, children, className }: any) => {
      const ctx = useContext(TabsCtx);
      return (
        <button
          role="tab"
          aria-selected={ctx?.value === value}
          className={className}
          onClick={() => ctx?.onValueChange?.(value)}
          data-testid={`tab-${value}`}
        >
          {children}
        </button>
      );
    },
    TabsContent: ({ children, className }: any) => (
      <div className={className}>{children}</div>
    ),
  };
});

afterEach(() => {
  cleanup();
});

test("initially shows Preview content", () => {
  render(<MainContent />);
  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("clicking Code tab shows code editor and hides preview", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  await user.click(screen.getByTestId("tab-code"));

  expect(screen.getByTestId("code-editor")).toBeDefined();
  expect(screen.queryByTestId("preview-frame")).toBeNull();
});

test("clicking Preview tab restores preview after switching to Code", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  // Switch to Code view
  await user.click(screen.getByTestId("tab-code"));
  expect(screen.getByTestId("code-editor")).toBeDefined();
  expect(screen.queryByTestId("preview-frame")).toBeNull();

  // Switch back to Preview view
  await user.click(screen.getByTestId("tab-preview"));
  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("toggling multiple times works correctly", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  // Initial state: Preview
  expect(screen.getByTestId("preview-frame")).toBeDefined();

  // Toggle to Code
  await user.click(screen.getByTestId("tab-code"));
  expect(screen.getByTestId("code-editor")).toBeDefined();

  // Toggle back to Preview
  await user.click(screen.getByTestId("tab-preview"));
  expect(screen.getByTestId("preview-frame")).toBeDefined();

  // Toggle to Code again
  await user.click(screen.getByTestId("tab-code"));
  expect(screen.getByTestId("code-editor")).toBeDefined();
});

test("tab active state reflects current view", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  // Initially Preview is active
  const previewTab = screen.getByTestId("tab-preview");
  const codeTab = screen.getByTestId("tab-code");

  expect(previewTab.getAttribute("aria-selected")).toBe("true");
  expect(codeTab.getAttribute("aria-selected")).toBe("false");

  // After clicking Code, Code is active
  await user.click(codeTab);
  expect(previewTab.getAttribute("aria-selected")).toBe("false");
  expect(codeTab.getAttribute("aria-selected")).toBe("true");
});
