"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getProject(projectId: string) {
  const session = await getSession();
  
  if (!session) {
    throw new Error("Unauthorized");
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      userId: session.userId,
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const rawMessages = JSON.parse(project.messages);
  // Migrate old v4 messages (with content field) to v6 UIMessage format (parts-only)
  const messages = rawMessages.map((msg: any) => {
    if (msg.parts !== undefined) return msg;
    return {
      id: msg.id,
      role: msg.role,
      parts: msg.content ? [{ type: "text", text: msg.content }] : [],
    };
  });

  return {
    id: project.id,
    name: project.name,
    messages,
    data: JSON.parse(project.data),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}