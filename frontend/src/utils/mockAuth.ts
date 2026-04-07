import type { AppRole } from '../context/AppRoleContext';

const MOCK_AUTH_KEY = 'ssm_mock_auth';

export type MockAccount = {
  username: string;
  password: string;
  role: AppRole;
  userId: number;
  displayName: string;
};

export type MockSession = Omit<MockAccount, 'password'>;

export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    username: 'student01',
    password: 'stu01pass',
    role: 'student',
    userId: 1,
    displayName: 'Student 01',
  },
  {
    username: 'student02',
    password: 'stu02pass',
    role: 'student',
    userId: 2,
    displayName: 'Student 02',
  },
  {
    username: 'student03',
    password: 'stu03pass',
    role: 'student',
    userId: 3,
    displayName: 'Student 03',
  },
  {
    username: 'teacher01',
    password: 'teach01pass',
    role: 'teacher',
    userId: 4,
    displayName: 'Teacher 01',
  },
];

export function authenticateMockUser(username: string, password: string): MockSession | null {
  const normalizedUsername = username.trim().toLowerCase();
  const account = MOCK_ACCOUNTS.find(
    (u) => u.username.toLowerCase() === normalizedUsername && u.password === password
  );
  if (!account) return null;
  const { password: _ignored, ...session } = account;
  return session;
}

export function setMockSession(session: MockSession): void {
  try {
    localStorage.setItem(MOCK_AUTH_KEY, JSON.stringify(session));
  } catch {
  }
}

export function getMockSession(): MockSession | null {
  try {
    const raw = localStorage.getItem(MOCK_AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MockSession>;
    if (
      typeof parsed?.username === 'string' &&
      typeof parsed?.displayName === 'string' &&
      (parsed?.role === 'student' || parsed?.role === 'teacher') &&
      Number.isInteger(parsed?.userId) &&
      Number(parsed.userId) > 0
    ) {
      return {
        username: parsed.username,
        displayName: parsed.displayName,
        role: parsed.role,
        userId: Number(parsed.userId),
      };
    }
  } catch {
  }
  return null;
}

export function clearMockSession(): void {
  try {
    localStorage.removeItem(MOCK_AUTH_KEY);
  } catch {
  }
}
