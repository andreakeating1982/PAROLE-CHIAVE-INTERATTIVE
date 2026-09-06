import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, lt, sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../drizzle/schema";

const connectionString = process.env.DATABASE_URL;

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function createDb() {
  if (!connectionString) {
    console.warn("[DB] DATABASE_URL not set — database features disabled");
    return null;
  }
  if (_db) return _db;
  const client = postgres(connectionString, { prepare: false });
  _db = drizzle(client, { schema });
  return _db;
}

// Named export for Better Auth (it checks `if (!db)`)
export const db = createDb();

export async function getDb() {
  return createDb();
}

// ── Classes ─────────────────────────────────────────────────────────────────

export async function createClass(data: {
  id: string;
  name: string;
  code: string;
  password: string;
  date?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .insert(schema.classes)
    .values({
      id: data.id,
      name: data.name,
      code: data.code,
      password: data.password,
      date: data.date || null,
      isActive: true,
      sessionStarted: false,
      currentQuestion: 0,
      currentQuestion2: 0,
      revealedQuestions: "[]",
    })
    .returning()
    .then((r: any[]) => r[0]);
}

export async function getClassById(id: string) {
  const db = await getDb();
  if (!db) return null;
  return db
    .select()
    .from(schema.classes)
    .where(eq(schema.classes.id, id))
    .then((r: any[]) => r[0] ?? null);
}

export async function getClassByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  return db
    .select()
    .from(schema.classes)
    .where(eq(schema.classes.code, code))
    .then((r: any[]) => r[0] ?? null);
}

export async function getAllClasses() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(schema.classes)
    .orderBy(schema.classes.createdAt);
}

export async function updateClass(id: string, data: Partial<typeof schema.classes.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(schema.classes)
    .set(data)
    .where(eq(schema.classes.id, id))
    .returning()
    .then((r: any[]) => r[0]);
}

export async function deleteClass(id: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(schema.classes).where(eq(schema.classes.id, id));
}

// ── Students ────────────────────────────────────────────────────────────────

export async function addStudent(data: { id: string; name: string; classId: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .insert(schema.students)
    .values({ id: data.id, name: data.name, classId: data.classId })
    .returning()
    .then((r: any[]) => r[0]);
}

export async function getStudentsByClass(classId: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(schema.students)
    .where(and(eq(schema.students.classId, classId), eq(schema.students.removed, false)));
}

export async function getAllStudentsByClassIncludingRemoved(classId: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(schema.students)
    .where(eq(schema.students.classId, classId));
}

export async function getStudentById(id: string) {
  const db = await getDb();
  if (!db) return null;
  return db
    .select()
    .from(schema.students)
    .where(eq(schema.students.id, id))
    .then((r: any[]) => r[0] ?? null);
}

export async function getStudentByNameAndClass(name: string, classId: string) {
  const db = await getDb();
  if (!db) return null;
  return db
    .select()
    .from(schema.students)
    .where(and(
      eq(schema.students.name, name),
      eq(schema.students.classId, classId),
      eq(schema.students.removed, false)
    ))
    .then((r: any[]) => r[0] ?? null);
}

export async function getStudentByNameAndClassIncludingRemoved(name: string, classId: string) {
  const db = await getDb();
  if (!db) return null;
  return db
    .select()
    .from(schema.students)
    .where(and(
      eq(schema.students.name, name),
      eq(schema.students.classId, classId)
    ))
    .then((r: any[]) => r[0] ?? null);
}

export async function reactivateStudent(id: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(schema.students)
    .set({ removed: false } as any)
    .where(eq(schema.students.id, id));
}

export async function deleteStudent(id: string) {
  const db = await getDb();
  if (!db) return;
  // Soft-delete: mark as removed instead of physically deleting
  // This preserves student answers for the PDF report
  await db
    .update(schema.students)
    .set({ removed: true } as any)
    .where(eq(schema.students.id, id));
}

export async function touchStudent(id: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(schema.students)
    .set({ lastActiveAt: new Date() } as any)
    .where(eq(schema.students.id, id));
}

export async function cleanupInactiveStudents(classId: string, minutes: number) {
  const db = await getDb();
  if (!db) return;
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  // Soft-delete: mark as removed instead of physically deleting
  // This preserves student answers for the PDF report
  await db
    .update(schema.students)
    .set({ removed: true } as any)
    .where(
      and(
        eq(schema.students.classId, classId),
        eq(schema.students.removed, false),
        lt(schema.students.lastActiveAt, cutoff)
      )
    );
}

// ── Answers ─────────────────────────────────────────────────────────────────

export async function saveAnswer(data: {
  id: string;
  studentId: string;
  classId: string;
  questionNumber: number;
  selectedAnswer: string;
  isCorrect: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .insert(schema.answers)
    .values({
      id: data.id,
      studentId: data.studentId,
      classId: data.classId,
      questionNumber: data.questionNumber,
      selectedAnswer: data.selectedAnswer,
      isCorrect: data.isCorrect ? 1 : 0,
    })
    .returning()
    .then((r: any[]) => r[0]);
}

export async function getAnswersByClass(classId: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(schema.answers)
    .where(eq(schema.answers.classId, classId));
}

export async function getAnswerByStudentAndQuestion(
  studentId: string,
  questionNumber: number
) {
  const db = await getDb();
  if (!db) return null;
  return db
    .select()
    .from(schema.answers)
    .where(
      and(
        eq(schema.answers.studentId, studentId),
        eq(schema.answers.questionNumber, questionNumber)
      )
    )
    .then((r: any[]) => r[0] ?? null);
}
