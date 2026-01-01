import { openDB } from 'idb';

const DB_NAME = 'sliver-db';
const DB_VERSION = 1;
const PDF_STORE = 'pdfs';

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(PDF_STORE)) {
        db.createObjectStore(PDF_STORE, { keyPath: 'id' });
      }
    },
  });
}

export async function savePDF(file) {
  const db = await getDB();
  const arrayBuffer = await file.arrayBuffer();

  await db.put(PDF_STORE, {
    id: 'current-pdf',
    name: file.name,
    data: arrayBuffer,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  });

  return {
    name: file.name,
    size: file.size,
  };
}

export async function getPDF() {
  const db = await getDB();
  const pdf = await db.get(PDF_STORE, 'current-pdf');
  return pdf || null;
}

export async function deletePDF() {
  const db = await getDB();
  await db.delete(PDF_STORE, 'current-pdf');
}

export async function hasPDF() {
  const pdf = await getPDF();
  return pdf !== null;
}

// LocalStorage helpers for habit data
const HABIT_KEY = 'sliver-habit';

export function getHabitData() {
  const data = localStorage.getItem(HABIT_KEY);
  if (!data) return null;

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveHabitData(data) {
  localStorage.setItem(HABIT_KEY, JSON.stringify(data));
}

export function clearHabitData() {
  localStorage.removeItem(HABIT_KEY);
}

export function clearAllData() {
  clearHabitData();
  return deletePDF();
}
