"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import {
  Plus,
  MessageSquare,
  Search,
  FolderOpen,
  Folder,
  Tag,
  X,
  MoreHorizontal,
  Trash2,
  FolderInput,
  Pencil,
  Hash,
  GripVertical,
} from "lucide-react";

interface ChatProject {
  id: number;
  name: string;
  color: string;
  createdAt: string;
}

interface ChatSession {
  id: number;
  uuid: string;
  title: string;
  projectId: number | null;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
}

const PROJECT_COLORS = [
  "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6",
  "#ec4899", "#14b8a6", "#6366f1", "#84cc16", "#fb923c",
];

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [projects, setProjects] = useState<ChatProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeProject, setActiveProject] = useState<number | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ id: number; x: number; y: number } | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
  const [tagInput, setTagInput] = useState<{ sessionId: number; value: string } | null>(null);
  const [moveMenu, setMoveMenu] = useState<number | null>(null);
  const [dragSessionId, setDragSessionId] = useState<number | null>(null);
  const [dragOverProject, setDragOverProject] = useState<number | "all" | null>(null);
  const router = useRouter();
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchSessions();
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search, activeProject, activeTag]);

  async function fetchAll() {
    await Promise.all([fetchSessions(), fetchProjects()]);
    setLoading(false);
  }

  async function fetchSessions() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (activeProject !== null) params.set("projectId", String(activeProject));
    if (activeTag) params.set("tag", activeTag);
    const res = await fetch(`/api/chat/sessions?${params}`);
    const data = await res.json();
    setSessions(data.sessions || []);
  }

  async function fetchProjects() {
    const res = await fetch("/api/chat/projects");
    const data = await res.json();
    setProjects(data.projects || []);
  }

  async function createSession() {
    const body: Record<string, unknown> = {};
    if (activeProject !== null) body.projectId = activeProject;
    const res = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.session) router.push(`/chat/${data.session.uuid}`);
  }

  async function createProject() {
    if (!newProjectName.trim()) return;
    await fetch("/api/chat/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProjectName.trim(), color: newProjectColor }),
    });
    setNewProjectName("");
    setShowNewProject(false);
    await fetchProjects();
  }

  async function deleteProject(id: number) {
    await fetch("/api/chat/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (activeProject === id) setActiveProject(null);
    await Promise.all([fetchProjects(), fetchSessions()]);
  }

  async function deleteSession(id: number) {
    await fetch("/api/chat/sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setContextMenu(null);
    await fetchSessions();
  }

  async function moveToProject(sessionId: number, projectId: number | null) {
    await fetch("/api/chat/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sessionId, projectId }),
    });
    setContextMenu(null);
    setMoveMenu(null);
    await fetchSessions();
  }

  async function addTag(sessionId: number, tag: string) {
    const session = sessions.find((s) => s.id === sessionId);
    const existing: string[] = session?.tags ? JSON.parse(session.tags) : [];
    if (existing.includes(tag)) return;
    const newTags = [...existing, tag];
    await fetch("/api/chat/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sessionId, tags: newTags }),
    });
    setTagInput(null);
    await fetchSessions();
  }

  async function removeTag(sessionId: number, tag: string) {
    const session = sessions.find((s) => s.id === sessionId);
    const existing: string[] = session?.tags ? JSON.parse(session.tags) : [];
    const newTags = existing.filter((t) => t !== tag);
    await fetch("/api/chat/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sessionId, tags: newTags }),
    });
    await fetchSessions();
  }

  // Gather all unique tags
  const allTags = Array.from(
    new Set(
      sessions.flatMap((s) => (s.tags ? JSON.parse(s.tags) as string[] : []))
    )
  ).sort();

  function getProjectForSession(s: ChatSession) {
    return projects.find((p) => p.id === s.projectId);
  }

  return (
    <PageContainer
      title="Chat"
      subtitle="NEXUS Intelligence Analyst"
      actions={
        <Button size="sm" onClick={createSession}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Chat
        </Button>
      }
    >
      {/* Click away listener */}
      {contextMenu && (
        <div className="fixed inset-0 z-40" onClick={() => { setContextMenu(null); setMoveMenu(null); }} />
      )}

      <div className="flex gap-4 h-full">
        {/* ── Left: Projects & Tags Sidebar ── */}
        <div className="w-48 shrink-0 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-navy-500" />
            <input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs font-mono bg-navy-900/60 border border-navy-700/50 rounded text-navy-200 placeholder:text-navy-600 focus:outline-none focus:border-navy-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-3 w-3 text-navy-500 hover:text-navy-300" />
              </button>
            )}
          </div>

          {/* All Chats */}
          <div
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverProject("all"); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverProject(null); }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverProject(null);
              if (dragSessionId !== null) moveToProject(dragSessionId, null);
              setDragSessionId(null);
            }}
            className={`rounded transition-all ${dragOverProject === "all" ? "ring-1 ring-navy-500 bg-navy-800/80" : ""}`}
          >
            <button
              onClick={() => { setActiveProject(null); setActiveTag(null); }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-mono transition-colors ${
                activeProject === null && !activeTag
                  ? "bg-navy-800/60 text-navy-200"
                  : "text-navy-400 hover:text-navy-300 hover:bg-navy-800/30"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              All Chats
              <span className="ml-auto text-[10px] text-navy-600">{sessions.length}</span>
            </button>
          </div>

          {/* Projects */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider">Projects</span>
              <button
                onClick={() => setShowNewProject(!showNewProject)}
                className="text-navy-500 hover:text-navy-300 transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            {showNewProject && (
              <div className="mb-2 space-y-1.5">
                <input
                  autoFocus
                  type="text"
                  placeholder="Project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") createProject(); if (e.key === "Escape") setShowNewProject(false); }}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-navy-900/60 border border-navy-700/50 rounded text-navy-200 placeholder:text-navy-600 focus:outline-none focus:border-navy-500"
                />
                <div className="flex gap-1 flex-wrap">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewProjectColor(c)}
                      className={`w-4 h-4 rounded-full border-2 transition-colors ${
                        newProjectColor === c ? "border-white/60" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={createProject}
                    className="px-2.5 py-1 text-[10px] font-mono bg-navy-800/60 border border-navy-700/50 rounded text-navy-300 hover:bg-navy-700/60"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowNewProject(false)}
                    className="px-2.5 py-1 text-[10px] font-mono text-navy-500 hover:text-navy-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-0.5">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className={`group flex items-center rounded transition-all ${
                    dragOverProject === p.id ? "ring-1 ring-offset-0 bg-navy-800/80" : ""
                  }`}
                  style={dragOverProject === p.id ? { boxShadow: `inset 0 0 0 1px ${p.color}40, 0 0 8px ${p.color}20` } : undefined}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverProject(p.id); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverProject(null); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverProject(null);
                    if (dragSessionId !== null) moveToProject(dragSessionId, p.id);
                    setDragSessionId(null);
                  }}
                >
                  <button
                    onClick={() => { setActiveProject(p.id); setActiveTag(null); }}
                    className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-mono transition-colors ${
                      activeProject === p.id
                        ? "bg-navy-800/60 text-navy-200"
                        : "text-navy-400 hover:text-navy-300 hover:bg-navy-800/30"
                    }`}
                  >
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="truncate">{p.name}</span>
                  </button>
                  <button
                    onClick={() => deleteProject(p.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-navy-600 hover:text-accent-rose transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div>
              <span className="text-[10px] font-mono text-navy-500 uppercase tracking-wider mb-1.5 block">Tags</span>
              <div className="flex flex-wrap gap-1">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => { setActiveTag(activeTag === tag ? null : tag); setActiveProject(null); }}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono transition-colors ${
                      activeTag === tag
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "bg-navy-800/40 text-navy-400 border border-navy-700/30 hover:border-navy-600/50"
                    }`}
                  >
                    <Hash className="h-2.5 w-2.5" />
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Chat List ── */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded border border-navy-700 bg-navy-900/40 animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <MessageSquare className="h-10 w-10 text-navy-600 mb-4" />
              <div className="text-sm text-navy-400 mb-1">
                {search ? "No chats match your search." : "No conversations yet."}
              </div>
              {!search && (
                <Button size="sm" className="mt-4" onClick={createSession}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Start a Conversation
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => {
                const project = getProjectForSession(session);
                const tags: string[] = session.tags ? JSON.parse(session.tags) : [];
                return (
                  <div
                    key={session.id}
                    draggable
                    onDragStart={(e) => {
                      setDragSessionId(session.id);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", String(session.id));
                    }}
                    onDragEnd={() => { setDragSessionId(null); setDragOverProject(null); }}
                    className={`group relative flex items-center gap-3 rounded border border-navy-700/50 bg-navy-900/40 px-4 py-3 hover:bg-navy-800/60 hover:border-navy-600/50 transition-colors cursor-grab active:cursor-grabbing ${
                      dragSessionId === session.id ? "opacity-50" : ""
                    }`}
                  >
                    <GripVertical className="h-3.5 w-3.5 text-navy-700 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <button
                      onClick={() => router.push(`/chat/${session.uuid}`)}
                      className="flex-1 flex items-center gap-3 text-left min-w-0"
                    >
                      <MessageSquare className="h-4 w-4 text-navy-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-navy-200 truncate">
                            {session.title}
                          </span>
                          {project && (
                            <span
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono shrink-0"
                              style={{
                                backgroundColor: project.color + "18",
                                color: project.color,
                                border: `1px solid ${project.color}30`,
                              }}
                            >
                              <Folder className="h-2.5 w-2.5" />
                              {project.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-navy-500">
                            {new Date(session.updatedAt).toLocaleString()}
                          </span>
                          {tags.length > 0 && (
                            <div className="flex items-center gap-1">
                              {tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[9px] font-mono bg-navy-800/50 text-navy-400 border border-navy-700/30"
                                >
                                  <Hash className="h-2 w-2" />
                                  {tag}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); removeTag(session.id, tag); }}
                                    className="ml-0.5 text-navy-600 hover:text-accent-rose"
                                  >
                                    <X className="h-2 w-2" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Tag input inline */}
                    {tagInput?.sessionId === session.id && (
                      <input
                        autoFocus
                        type="text"
                        placeholder="tag name"
                        value={tagInput.value}
                        onChange={(e) => setTagInput({ ...tagInput, value: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && tagInput.value.trim()) {
                            addTag(session.id, tagInput.value.trim().toLowerCase());
                          }
                          if (e.key === "Escape") setTagInput(null);
                        }}
                        onBlur={() => setTagInput(null)}
                        className="w-24 px-2 py-0.5 text-[10px] font-mono bg-navy-900 border border-navy-600 rounded text-navy-200 focus:outline-none focus:border-cyan-600"
                      />
                    )}

                    {/* Context menu trigger */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setContextMenu({ id: session.id, x: rect.right, y: rect.bottom });
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-navy-500 hover:text-navy-300 transition-all"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {/* Context Menu */}
                    {contextMenu?.id === session.id && (
                      <div
                        className="absolute right-0 top-full mt-1 z-50 w-44 py-1 bg-navy-900 border border-navy-700/50 rounded shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setTagInput({ sessionId: session.id, value: "" })}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-navy-300 hover:bg-navy-800/60"
                        >
                          <Tag className="h-3 w-3" /> Add Tag
                        </button>
                        <button
                          onClick={() => setMoveMenu(moveMenu === session.id ? null : session.id)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-navy-300 hover:bg-navy-800/60"
                        >
                          <FolderInput className="h-3 w-3" /> Move to Project
                        </button>
                        {moveMenu === session.id && (
                          <div className="mx-2 my-1 border-t border-navy-700/30 pt-1 space-y-0.5">
                            <button
                              onClick={() => moveToProject(session.id, null)}
                              className="w-full flex items-center gap-2 px-2 py-1 text-[10px] font-mono text-navy-400 hover:bg-navy-800/60 rounded"
                            >
                              <X className="h-2.5 w-2.5" /> No Project
                            </button>
                            {projects.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => moveToProject(session.id, p.id)}
                                className="w-full flex items-center gap-2 px-2 py-1 text-[10px] font-mono text-navy-400 hover:bg-navy-800/60 rounded"
                              >
                                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.color }} />
                                {p.name}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="border-t border-navy-700/30 mt-1 pt-1">
                          <button
                            onClick={() => deleteSession(session.id)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-accent-rose hover:bg-navy-800/60"
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
