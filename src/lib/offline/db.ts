import Dexie, { type EntityTable } from "dexie";

export type OfflineMember = {
  id: string;
  churchId: string;
  fullName: string;
  status: string;
};

export type OfflineDraft = {
  id: string;
  churchId: string;
  sabbathDate: string;
  looseOffering: number;
  sabbathSchoolOffering: number;
  values: Record<string, { tithe: number; systematic: number; thanksgiving: number }>;
  updatedAt: number;
};

export type OfflineSyncQueueItem = {
  id?: number;
  reportId: string;
  createdAt: number;
};

const db = new Dexie("orion-finance");

db.version(1).stores({
  members: "id, churchId, status",
  drafts: "id, churchId, sabbathDate, updatedAt",
  syncQueue: "++id, reportId, createdAt",
});

export const orionDb = db as Dexie & {
  members: EntityTable<OfflineMember, "id">;
  drafts: EntityTable<OfflineDraft, "id">;
  syncQueue: EntityTable<OfflineSyncQueueItem, "id">;
};
