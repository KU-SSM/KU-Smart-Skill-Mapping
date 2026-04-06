import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export type AppRole = 'student' | 'teacher';

const STORAGE_KEY = 'ssm_app_role';

function readInitialRole(): AppRole {
  const env = process.env.REACT_APP_DEFAULT_ROLE?.toLowerCase();
  if (env === 'teacher' || env === 'student') {
    return env;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'teacher' || stored === 'student') {
      return stored;
    }
  } catch {
  }
  return 'student';
}

export interface AppRoleContextValue {
  role: AppRole;
  setRole: (role: AppRole) => void;
  isStudent: boolean;
  isTeacher: boolean;
}

const AppRoleContext = createContext<AppRoleContextValue | null>(null);

export const AppRoleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [role, setRoleState] = useState<AppRole>(readInitialRole);

  const setRole = useCallback((next: AppRole) => {
    setRoleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
    }
  }, []);

  const value = useMemo(
    () => ({
      role,
      setRole,
      isStudent: role === 'student',
      isTeacher: role === 'teacher',
    }),
    [role, setRole]
  );

  return (
    <AppRoleContext.Provider value={value}>{children}</AppRoleContext.Provider>
  );
};

export function useAppRole(): AppRoleContextValue {
  const ctx = useContext(AppRoleContext);
  if (!ctx) {
    throw new Error('useAppRole must be used within AppRoleProvider');
  }
  return ctx;
}
