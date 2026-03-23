"use client";

import { Loader2, FilePlus, FileEdit, Eye, FilePen, Trash2 } from "lucide-react";

interface ToolPart {
  type: string;
  state: string;
  input: Record<string, any>;
  toolCallId: string;
  toolName?: string;
}

interface ToolInvocationDisplayProps {
  tool: ToolPart;
}

interface ToolDisplay {
  Icon: React.ElementType;
  label: string;
}

function getFilename(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

export function getToolDisplay(tool: ToolPart): ToolDisplay {
  const toolName = tool.toolName ?? tool.type.replace(/^tool-/, "");
  const args = tool.input as Record<string, any>;
  const path: string = args?.path ?? "";
  const filename = getFilename(path);

  if (toolName === "str_replace_editor") {
    switch (args?.command) {
      case "create":
        return { Icon: FilePlus, label: `Creating ${filename}` };
      case "str_replace":
      case "insert":
        return { Icon: FileEdit, label: `Editing ${filename}` };
      case "view":
        return { Icon: Eye, label: `Reading ${filename}` };
    }
  }

  if (toolName === "file_manager") {
    switch (args?.command) {
      case "rename": {
        const newFilename = getFilename(args?.new_path ?? "");
        return { Icon: FilePen, label: `Renaming ${filename} → ${newFilename}` };
      }
      case "delete":
        return { Icon: Trash2, label: `Deleting ${filename}` };
    }
  }

  return { Icon: FileEdit, label: toolName };
}

export function ToolInvocationDisplay({ tool }: ToolInvocationDisplayProps) {
  const isDone = tool.state === "output-available" || tool.state === "output-error";
  const { Icon, label } = getToolDisplay(tool);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600 flex-shrink-0" />
      )}
      <Icon className="w-3 h-3 text-neutral-500 flex-shrink-0" />
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
