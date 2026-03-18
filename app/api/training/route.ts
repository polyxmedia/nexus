import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isNextResponse } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { DEFAULT_PROGRESS, MISSIONS, PLAYBOOKS, getLevelForXp, type TrainingProgress } from "@/lib/training/missions";

const key = (username: string) => `training:${username}`;

async function getProgress(username: string): Promise<TrainingProgress> {
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, key(username)));
  if (!rows[0]) return { ...DEFAULT_PROGRESS, startedAt: new Date().toISOString(), lastActivityAt: new Date().toISOString() };
  try {
    return JSON.parse(rows[0].value) as TrainingProgress;
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

async function saveProgress(username: string, progress: TrainingProgress) {
  const k = key(username);
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, k));
  const value = JSON.stringify(progress);
  if (rows[0]) {
    await db.update(schema.settings).set({ value }).where(eq(schema.settings.key, k));
  } else {
    await db.insert(schema.settings).values({ key: k, value });
  }
}

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const progress = await getProgress(auth.username);
  const levelInfo = getLevelForXp(progress.xp);

  return NextResponse.json({ progress, levelInfo });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const body = await req.json();
  const { action, missionId, stepId } = body;

  const progress = await getProgress(auth.username);

  if (action === "complete_step") {
    if (!missionId || !stepId) {
      return NextResponse.json({ error: "missionId and stepId required" }, { status: 400 });
    }

    const mission = MISSIONS.find((m) => m.id === missionId);
    if (!mission) return NextResponse.json({ error: "Mission not found" }, { status: 404 });

    // Initialize step tracking for this mission
    if (!progress.completedSteps[missionId]) {
      progress.completedSteps[missionId] = [];
    }

    // Mark step complete
    if (!progress.completedSteps[missionId].includes(stepId)) {
      progress.completedSteps[missionId].push(stepId);
    }

    // Check if all steps in mission are done
    const allStepIds = mission.steps.map((s) => s.id);
    const allDone = allStepIds.every((id) => progress.completedSteps[missionId].includes(id));

    if (allDone && !progress.completedMissions.includes(missionId)) {
      progress.completedMissions.push(missionId);
      progress.xp += mission.xp;
      progress.level = getLevelForXp(progress.xp).level;
    }

    progress.lastActivityAt = new Date().toISOString();
    await saveProgress(auth.username, progress);

    const levelInfo = getLevelForXp(progress.xp);
    return NextResponse.json({ progress, levelInfo, missionCompleted: allDone });
  }

  if (action === "complete_playbook") {
    const { playbookId } = body;
    if (!playbookId) return NextResponse.json({ error: "playbookId required" }, { status: 400 });

    const playbook = PLAYBOOKS.find((p) => p.id === playbookId);
    if (!playbook) return NextResponse.json({ error: "Playbook not found" }, { status: 404 });

    if (!progress.completedPlaybooks) progress.completedPlaybooks = [];

    if (!progress.completedPlaybooks.includes(playbookId)) {
      progress.completedPlaybooks.push(playbookId);
      progress.xp += playbook.xp;
      progress.level = getLevelForXp(progress.xp).level;
    }

    progress.lastActivityAt = new Date().toISOString();
    await saveProgress(auth.username, progress);

    const levelInfo = getLevelForXp(progress.xp);
    return NextResponse.json({ progress, levelInfo });
  }

  if (action === "reset") {
    const fresh = { ...DEFAULT_PROGRESS, startedAt: new Date().toISOString(), lastActivityAt: new Date().toISOString() };
    await saveProgress(auth.username, fresh);
    return NextResponse.json({ progress: fresh, levelInfo: getLevelForXp(0) });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
