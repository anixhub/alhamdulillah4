// Client-side Database API Helper & WebSocket Realtime Manager
import { formatBigDigit, mergeIdField } from "./utils";

export interface SupabaseStatus {
  connected: boolean;
  type?: string;
  url: string | null;
  anonKey?: string | null;
  reason: "connected" | "missing_keys";
}

// Global WebSocket connection for zero-latency real-time sync across devices
let sharedSocket: WebSocket | null = null;
const realtimeListeners = new Set<(event: any) => void>();
let reconnectTimer: any = null;
let pingInterval: any = null;
const pendingWSQueue: string[] = [];

function initRealtimeWebSocket() {
  if (typeof window === "undefined") return;
  if (sharedSocket && (sharedSocket.readyState === WebSocket.CONNECTING || sharedSocket.readyState === WebSocket.OPEN)) {
    return;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}`;

  try {
    sharedSocket = new WebSocket(wsUrl);

    sharedSocket.onopen = () => {
      console.log("⚡ Realtime WebSocket connected to Express server.");
      // Flush any queued messages immediately upon connection
      while (pendingWSQueue.length > 0) {
        const msgStr = pendingWSQueue.shift();
        if (msgStr && sharedSocket && sharedSocket.readyState === WebSocket.OPEN) {
          try {
            sharedSocket.send(msgStr);
          } catch (e) {
            console.warn("Error sending queued WS message:", e);
          }
        }
      }

      // Keep-alive heartbeat ping every 12 seconds to prevent Cloud Run / Nginx idle timeout
      if (pingInterval) clearInterval(pingInterval);
      pingInterval = setInterval(() => {
        if (sharedSocket && sharedSocket.readyState === WebSocket.OPEN) {
          sharedSocket.send(JSON.stringify({ type: "ping" }));
        }
      }, 12000);
    };

    sharedSocket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        realtimeListeners.forEach((fn) => fn(payload));
      } catch (e) {
        console.error("Error parsing WebSocket event payload", e);
      }
    };

    sharedSocket.onclose = () => {
      sharedSocket = null;
      if (pingInterval) clearInterval(pingInterval);
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(initRealtimeWebSocket, 1000);
    };

    sharedSocket.onerror = () => {
      if (sharedSocket) {
        try {
          sharedSocket.close();
        } catch (e) {}
      }
    };
  } catch (err) {
    console.warn("Realtime WebSocket connection failed, retrying...", err);
  }
}

// Ensure instant reconnection whenever user switches back to tab or focuses window
if (typeof window !== "undefined") {
  const handleWakeup = () => {
    if (!sharedSocket || sharedSocket.readyState === WebSocket.CLOSED || sharedSocket.readyState === WebSocket.CLOSING) {
      initRealtimeWebSocket();
    }
  };
  window.addEventListener("focus", handleWakeup);
  document.addEventListener("visibilitychange", handleWakeup);
}

/**
 * Subscribe to real-time database changes broadcasted by the server.
 * Triggers instantly (0 delay) on any insert, update, delete across any device.
 */
export function subscribeRealtimeChanges(callback: (event: any) => void): () => void {
  initRealtimeWebSocket();
  realtimeListeners.add(callback);
  return () => {
    realtimeListeners.delete(callback);
  };
}

export function sendRealtimeWSMessage(payload: any): void {
  initRealtimeWebSocket();
  const msgStr = typeof payload === "string" ? payload : JSON.stringify(payload);
  if (sharedSocket && sharedSocket.readyState === WebSocket.OPEN) {
    try {
      sharedSocket.send(msgStr);
    } catch (err) {
      console.warn("Failed to send WS message:", err);
      pendingWSQueue.push(msgStr);
    }
  } else {
    pendingWSQueue.push(msgStr);
  }
}

export async function getSupabaseClient(): Promise<any> {
  return null;
}

export async function getSupabaseStatus(): Promise<SupabaseStatus> {
  return { connected: true, type: "mysql_realtime", url: null, reason: "connected" };
}

// Convert camelCase string/object to snake_case
export function camelToSnake(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object' || obj instanceof Date || obj instanceof File || obj instanceof Blob) return obj;
  if (Array.isArray(obj)) return obj.map(camelToSnake);
  
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = key
      .replace(/([A-Z])/g, "_$1")
      .replace(/([0-9]+)/g, "_$1")
      .replace(/_+/g, "_")
      .toLowerCase();
    result[snakeKey] = camelToSnake(obj[key]);
  }
  return result;
}

// Convert snake_case string/object to camelCase
export function snakeToCamel(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object' || obj instanceof Date || obj instanceof File || obj instanceof Blob) return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z0-9])/g, (g) => g[1].toUpperCase());
    result[camelKey] = snakeToCamel(obj[key]);
  }
  return result;
}

// Helper to write to localStorage safely
export function safeLocalStorageSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    if (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22 ||
      error.code === 1014
    ) {
      console.warn("localStorage quota exceeded! Data saved in memory/remotely.", error);
      return false;
    }
    console.error("Failed to write to localStorage:", error);
    return false;
  }
}

// Helper to parse JSON safely
async function safeJsonParse(res: Response): Promise<any> {
  const text = await res.text();
  const contentType = res.headers.get("content-type") || "";
  
  if (!contentType.includes("application/json") && (text.trim().startsWith("<") || text.trim().startsWith("<!doctype"))) {
    console.warn("Menerima respon HTML dari server.");
    throw new Error("Respon dari server tidak valid (bukan format JSON).");
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("Respon dari server tidak valid (bukan format JSON).");
  }
}

// Helper to resolve dynamic API URLs supporting subpath hosting and absolute origin for cross-device compatibility
export function getApiUrl(endpoint: string): string {
  if (!endpoint) return '';
  const trimmed = endpoint.trim();
  
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const urlObj = new URL(trimmed);
      let p = urlObj.pathname + urlObj.search;
      if (p.startsWith('/uploads/')) {
        p = p.replace('/uploads/', '/api/uploads/');
      }
      return p;
    } catch (e) {
      return trimmed;
    }
  }

  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  let cleanEndpoint = trimmed.startsWith('/') ? trimmed : '/' + trimmed;
  if (cleanEndpoint.startsWith('/uploads/')) {
    cleanEndpoint = cleanEndpoint.replace('/uploads/', '/api/uploads/');
  }
  
  return cleanEndpoint;
}

// Fetch list of items from table
export async function fetchTableData<T>(table: string, localKey?: string, defaultValue: T[] = []): Promise<T[]> {
  try {
    const url = getApiUrl(`/api/db/${table}?_t=${Date.now()}`);
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    if (res.ok) {
      const result = await safeJsonParse(res);
      if (result.success && Array.isArray(result.data)) {
        const camelCasedData = snakeToCamel(result.data) as T[];
        const uniqueMap = new Map<any, T>();
        camelCasedData.forEach((item: any) => {
          if (item && item.id) {
            uniqueMap.set(item.id, item);
          } else if (item) {
            uniqueMap.set(Math.random().toString(), item);
          }
        });
        const fetchedData = Array.from(uniqueMap.values());
        if (localKey) {
          safeLocalStorageSetItem(localKey, JSON.stringify(fetchedData));
        }
        return fetchedData;
      }
    }
  } catch (err) {
    console.warn(`Fetch query failed for table ${table}.`, err);
  }

  if (localKey) {
    try {
      const localStr = localStorage.getItem(localKey);
      if (localStr) {
        const parsed = JSON.parse(localStr);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {}
  }

  return defaultValue;
}

// Insert single row
export async function insertTableRow<T extends { id?: any }>(table: string, localKey: string, row: T): Promise<T> {
  let remoteRow = { ...row };
  try {
    const snakeCasedRow = camelToSnake(row);
    const res = await fetch(getApiUrl(`/api/db/${table}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snakeCasedRow),
    });
    if (res.ok) {
      const result = await safeJsonParse(res);
      if (result.success && result.data) {
        const camelRemote = snakeToCamel(result.data);
        const remoteObj = Array.isArray(camelRemote) ? camelRemote[0] : camelRemote;
        if (remoteObj && typeof remoteObj === 'object') {
          const merged: any = { id: row.id, ...row };
          const strFields = ['nik', 'nisn', 'noKk', 'nikAyah', 'nikIbu', 'noHp', 'nism', 'rt', 'rw'];
          for (const k of Object.keys(remoteObj)) {
            if (remoteObj[k] !== undefined) {
              if (strFields.includes(k)) {
                merged[k] = mergeIdField((row as any)[k], remoteObj[k]);
              } else {
                merged[k] = typeof remoteObj[k] === 'number' ? String(remoteObj[k]) : remoteObj[k];
              }
            }
          }
          remoteRow = merged as T;
        }
      }
    }
  } catch (err) {
    console.warn(`Insert failed for ${table}, storing locally.`, err);
  }

  if (localKey && remoteRow) {
    try {
      const localStr = localStorage.getItem(localKey);
      const list = localStr ? JSON.parse(localStr) : [];
      if (Array.isArray(list)) {
        const updated = [remoteRow, ...list.filter((x: any) => x.id !== remoteRow.id)];
        safeLocalStorageSetItem(localKey, JSON.stringify(updated));
      }
    } catch (e) {}
  }

  return remoteRow;
}

// Insert multiple rows
export async function insertTableRows<T extends { id?: any }>(table: string, localKey: string, rows: T[]): Promise<T[]> {
  if (!rows || rows.length === 0) return [];
  
  let finalRows = [...rows];
  try {
    const snakeCasedRows = camelToSnake(rows);
    const res = await fetch(getApiUrl(`/api/db/${table}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snakeCasedRows),
    });
    if (res.ok) {
      const result = await safeJsonParse(res);
      if (result.success && result.data) {
        const fetched = result.data;
        const remoteRows = (Array.isArray(fetched) ? snakeToCamel(fetched) : [snakeToCamel(fetched)]) as T[];
        if (remoteRows && remoteRows.length > 0) {
          finalRows = remoteRows;
        }
      }
    }
  } catch (err) {
    console.warn(`Batch insert failed for ${table}, storing locally.`, err);
  }

  if (localKey && finalRows.length > 0) {
    try {
      const localStr = localStorage.getItem(localKey);
      const list = localStr ? JSON.parse(localStr) : [];
      if (Array.isArray(list)) {
        const existingIds = new Set(finalRows.map(x => x.id));
        const updated = [...finalRows, ...list.filter((x: any) => !existingIds.has(x.id))];
        safeLocalStorageSetItem(localKey, JSON.stringify(updated));
      }
    } catch (e) {}
  }

  return finalRows;
}

// Update single row
export async function updateTableRow<T extends { id?: any }>(
  table: string,
  localKey: string,
  id: string | number,
  updatedData: Partial<T>
): Promise<T> {
  let remoteRow = { id, ...updatedData } as T;
  try {
    const snakeCasedData = camelToSnake(updatedData);
    const res = await fetch(getApiUrl(`/api/db/${table}/${id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snakeCasedData),
    });
    if (res.ok) {
      const result = await safeJsonParse(res);
      if (result.success && result.data) {
        const camelRemote = snakeToCamel(result.data);
        const cleanedRemote: any = {};
        if (camelRemote && typeof camelRemote === 'object') {
          const strFields = ['nik', 'nisn', 'noKk', 'nikAyah', 'nikIbu', 'noHp', 'nism', 'rt', 'rw'];
          for (const k of Object.keys(camelRemote)) {
            if (camelRemote[k] !== undefined) {
              if (strFields.includes(k)) {
                cleanedRemote[k] = mergeIdField((updatedData as any)[k], camelRemote[k]);
              } else {
                cleanedRemote[k] = camelRemote[k];
              }
            }
          }
        }
        remoteRow = { id, ...updatedData, ...cleanedRemote } as T;
      }
    }
  } catch (err) {
    console.warn(`Update failed for ${table}/${id}, updating locally.`, err);
  }

  if (localKey) {
    try {
      const localStr = localStorage.getItem(localKey);
      const list = localStr ? JSON.parse(localStr) : [];
      if (Array.isArray(list)) {
        const exists = list.some((item: any) => item.id === id);
        const updated = exists
          ? list.map((item: any) => (item.id === id ? { ...item, ...remoteRow } : item))
          : [{ id, ...remoteRow }, ...list];
        safeLocalStorageSetItem(localKey, JSON.stringify(updated));
      }
    } catch (e) {}
  }

  return remoteRow;
}

// Delete single row
export async function deleteTableRow(table: string, localKey: string, id: string | number): Promise<boolean> {
  try {
    await fetch(getApiUrl(`/api/db/${table}/${id}`), { method: "DELETE" });
  } catch (err) {
    console.warn(`Delete failed for ${table}/${id}, deleting locally.`, err);
  }

  if (localKey) {
    try {
      const localStr = localStorage.getItem(localKey);
      if (localStr) {
        const list = JSON.parse(localStr);
        if (Array.isArray(list)) {
          const updated = list.filter((item: any) => item.id !== id);
          safeLocalStorageSetItem(localKey, JSON.stringify(updated));
        }
      }
    } catch (e) {}
  }

  return true;
}

// Upload file to physical server folder (categorized) and return server URL
export async function uploadFileToStorage(base64DataUrl: string, originalName: string, fieldKey: string): Promise<string> {
  if (!base64DataUrl) return '';
  if (base64DataUrl.startsWith('http://') || base64DataUrl.startsWith('https://')) {
    return base64DataUrl;
  }

  let base64Data = base64DataUrl;
  let contentType = 'image/jpeg';

  if (base64DataUrl.startsWith('data:')) {
    const match = base64DataUrl.match(/^data:(.*);base64,(.*)$/);
    if (match) {
      contentType = match[1];
      base64Data = match[2];
    }
  }

  let category = 'dokumen';
  const fk = (fieldKey || '').toLowerCase();
  if (fk.includes('kk')) {
    category = 'kk';
  } else if (fk.includes('ktp')) {
    category = 'ktp';
  } else if (fk.includes('logo')) {
    category = 'logo_lembaga';
  } else if (fk.includes('avatar') || fk.includes('profil') || fk.includes('user')) {
    category = 'profil_akun';
  } else if (fk.includes('foto') || fk.includes('pasfoto')) {
    category = 'pas_foto';
  } else if (fk.includes('chat') || fk.includes('media') || fk.includes('lampiran')) {
    category = 'media';
  } else if (fk.includes('ijazah')) {
    category = 'ijazah';
  } else if (fk.includes('akta')) {
    category = 'akta';
  } else if (fk.includes('surat')) {
    category = 'surat';
  }

  const extension = (originalName || 'file.jpg').split('.').pop() || 'jpg';
  const uniqueFileName = `${fieldKey || 'file'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${extension}`;

  const res = await fetch(getApiUrl("/api/upload"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: uniqueFileName,
      fileBase64: base64Data,
      contentType: contentType,
      category: category
    })
  });

  if (!res.ok) {
    throw new Error("Gagal mengunggah file ke server fisik.");
  }

  const result = await safeJsonParse(res);
  if (result && result.success && result.publicUrl) {
    return result.publicUrl;
  }

  throw new Error("Gagal mengunggah file ke server fisik.");
}

export async function deleteFileFromStorage(fileUrl: string): Promise<boolean> {
  if (!fileUrl || !fileUrl.includes('/uploads/')) return false;
  try {
    const res = await fetch(getApiUrl("/api/delete-file"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileUrl })
    });
    const data = await safeJsonParse(res);
    return Boolean(data && data.success);
  } catch (e) {
    return false;
  }
}
