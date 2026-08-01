import type { Role } from './enums';

// ─── API-Antwort-Wrapper ─────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// ─── Basis-Dokument (Wire-Format: ObjectId/Date als String serialisiert) ───
export interface BaseDocument {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

// ─── JWT Payload ─────────────────────────────────────────
export interface JwtPayload {
  id: string;
  userName: string;
  role: Role;
  sessionId?: string;
}

// ─── Query-Oberfläche (Datenabruf-Optionen) ──────────────
export type DataScope = 'monat' | 'all';
export type EwtFilter = 'starttag' | 'buchungstag' | 'beide';
