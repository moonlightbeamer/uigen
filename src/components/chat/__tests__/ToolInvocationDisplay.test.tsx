import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToolInvocationDisplay, getToolDisplay } from "../ToolInvocationDisplay";

function makeTool(
  toolName: string,
  args: Record<string, any>,
  state: "input-available" | "output-available" = "input-available"
) {
  return {
    type: `tool-${toolName}`,
    toolCallId: "test-id",
    input: args,
    state,
  };
}

describe("getToolDisplay", () => {
  test("str_replace_editor create → Creating <filename>", () => {
    const { label } = getToolDisplay(makeTool("str_replace_editor", { command: "create", path: "/App.jsx" }));
    expect(label).toBe("Creating App.jsx");
  });

  test("str_replace_editor str_replace → Editing <filename>", () => {
    const { label } = getToolDisplay(makeTool("str_replace_editor", { command: "str_replace", path: "/components/Card.jsx" }));
    expect(label).toBe("Editing Card.jsx");
  });

  test("str_replace_editor insert → Editing <filename>", () => {
    const { label } = getToolDisplay(makeTool("str_replace_editor", { command: "insert", path: "/components/Card.jsx" }));
    expect(label).toBe("Editing Card.jsx");
  });

  test("str_replace_editor view → Reading <filename>", () => {
    const { label } = getToolDisplay(makeTool("str_replace_editor", { command: "view", path: "/utils/helpers.ts" }));
    expect(label).toBe("Reading helpers.ts");
  });

  test("file_manager rename → Renaming <old> → <new>", () => {
    const { label } = getToolDisplay(makeTool("file_manager", { command: "rename", path: "/Button.jsx", new_path: "/components/Button.jsx" }));
    expect(label).toBe("Renaming Button.jsx → Button.jsx");
  });

  test("file_manager delete → Deleting <filename>", () => {
    const { label } = getToolDisplay(makeTool("file_manager", { command: "delete", path: "/old/Component.jsx" }));
    expect(label).toBe("Deleting Component.jsx");
  });

  test("unknown tool falls back to toolName", () => {
    const { label } = getToolDisplay(makeTool("some_other_tool", {}));
    expect(label).toBe("some_other_tool");
  });
});

describe("ToolInvocationDisplay", () => {
  test("shows spinner when state is input-available", () => {
    const tool = makeTool("str_replace_editor", { command: "create", path: "/App.jsx" }, "input-available");
    const { container } = render(<ToolInvocationDisplay tool={tool} />);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  test("shows green dot when state is output-available", () => {
    const tool = makeTool("str_replace_editor", { command: "create", path: "/App.jsx" }, "output-available");
    const { container } = render(<ToolInvocationDisplay tool={tool} />);
    expect(container.querySelector(".bg-emerald-500")).toBeTruthy();
    expect(container.querySelector(".animate-spin")).toBeFalsy();
  });

  test("renders friendly label text", () => {
    const tool = makeTool("str_replace_editor", { command: "create", path: "/App.jsx" });
    render(<ToolInvocationDisplay tool={tool} />);
    expect(screen.getAllByText("Creating App.jsx").length).toBeGreaterThan(0);
  });

  test("renders editing label for str_replace", () => {
    const tool = makeTool("str_replace_editor", { command: "str_replace", path: "/components/Card.jsx" });
    render(<ToolInvocationDisplay tool={tool} />);
    expect(screen.getAllByText("Editing Card.jsx").length).toBeGreaterThan(0);
  });

  test("renders delete label for file_manager", () => {
    const tool = makeTool("file_manager", { command: "delete", path: "/old.jsx" });
    render(<ToolInvocationDisplay tool={tool} />);
    expect(screen.getAllByText("Deleting old.jsx").length).toBeGreaterThan(0);
  });
});
