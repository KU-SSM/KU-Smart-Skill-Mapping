import { getMockSession } from './mockAuth';

const OWNERSHIP_KEY = 'ssm_eval_owner_by_id';

type OwnershipMap = Record<string, string>;

function readOwnershipMap(): OwnershipMap {
  try {
    const raw = localStorage.getItem(OWNERSHIP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as OwnershipMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeOwnershipMap(map: OwnershipMap): void {
  try {
    localStorage.setItem(OWNERSHIP_KEY, JSON.stringify(map));
  } catch {
  }
}

export function getCurrentSessionUsername(): string | null {
  const session = getMockSession();
  return session?.username || null;
}

export function setEvaluationOwner(evaluationId: string | number, username?: string): void {
  const owner = username || getCurrentSessionUsername();
  if (!owner) return;
  const id = String(evaluationId);
  const map = readOwnershipMap();
  map[id] = owner;
  writeOwnershipMap(map);
}

export function getEvaluationOwner(evaluationId: string | number): string | null {
  const id = String(evaluationId);
  const map = readOwnershipMap();
  return map[id] || null;
}

export function isEvaluationOwnedByCurrentSession(evaluationId: string | number): boolean {
  const current = getCurrentSessionUsername();
  if (!current) return true;
  const owner = getEvaluationOwner(evaluationId);
  if (!owner) return false;
  return owner === current;
}

export function removeEvaluationOwner(evaluationId: string | number): void {
  const id = String(evaluationId);
  const map = readOwnershipMap();
  if (!(id in map)) return;
  delete map[id];
  writeOwnershipMap(map);
}
