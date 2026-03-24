import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

// ============================================================
// 任务状态管理器
// 使用 JSON 文件持久化，路径: engine/tasks/data/{task-id}.json
// ============================================================

export type TaskStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "review"
  | "completed"
  | "failed"
  | "timeout";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  assignedTo: string;
  assignedBy: "ceo";
  input: string;
  output?: string;
  progress?: string;
  createdAt: string;
  updatedAt: string;
  timeoutMs: number;
  subtasks?: Task[];
}

export type TaskFilter = Partial<Pick<Task, "status" | "assignedTo">>;

const DATA_DIR = join(__dirname, "data");

// 确保 data 目录存在
function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function taskFilePath(id: string): string {
  return join(DATA_DIR, `${id}.json`);
}

function readTaskFile(id: string): Task | null {
  const filePath = taskFilePath(id);
  if (!existsSync(filePath)) {
    return null;
  }
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as Task;
}

function writeTaskFile(task: Task): void {
  ensureDataDir();
  const filePath = taskFilePath(task.id);
  writeFileSync(filePath, JSON.stringify(task, null, 2), "utf-8");
}

/**
 * 创建新任务
 */
export function createTask(
  title: string,
  assignedTo: string,
  input: string,
  timeoutMs: number = 120000
): Task {
  const now = new Date().toISOString();
  const task: Task = {
    id: randomUUID(),
    title,
    status: "pending",
    assignedTo,
    assignedBy: "ceo",
    input,
    createdAt: now,
    updatedAt: now,
    timeoutMs,
  };
  writeTaskFile(task);
  return task;
}

/**
 * 更新任务字段
 */
export function updateTask(
  id: string,
  updates: Partial<Pick<Task, "status" | "output" | "progress" | "subtasks">>
): Task {
  const task = readTaskFile(id);
  if (!task) {
    throw new Error(`Task not found: ${id}`);
  }
  const updated: Task = {
    ...task,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeTaskFile(updated);
  return updated;
}

/**
 * 获取单个任务
 */
export function getTask(id: string): Task | null {
  return readTaskFile(id);
}

/**
 * 列出任务，可按 status 和 assignedTo 过滤
 */
export function listTasks(filter?: TaskFilter): Task[] {
  ensureDataDir();
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  const tasks: Task[] = [];

  for (const file of files) {
    const raw = readFileSync(join(DATA_DIR, file), "utf-8");
    try {
      const task = JSON.parse(raw) as Task;
      if (filter) {
        if (filter.status && task.status !== filter.status) continue;
        if (filter.assignedTo && task.assignedTo !== filter.assignedTo) continue;
      }
      tasks.push(task);
    } catch {
      // 跳过无法解析的文件
    }
  }

  return tasks.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * 检查超时任务，返回超时的任务列表并将其状态更新为 timeout
 */
export function checkTimeouts(): Task[] {
  const activeTasks = listTasks().filter((t) =>
    ["pending", "assigned", "in_progress"].includes(t.status)
  );
  const now = Date.now();
  const timedOut: Task[] = [];

  for (const task of activeTasks) {
    const elapsed = now - new Date(task.updatedAt).getTime();
    if (elapsed > task.timeoutMs) {
      const updated = updateTask(task.id, { status: "timeout" });
      timedOut.push(updated);
    }
  }

  return timedOut;
}
