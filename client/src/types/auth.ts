export type TRole = 'student' | 'reviewer' | 'admin';

export type TStudentStatus = 'final_year' | 'fresh_graduate';

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: TRole;
  isOnboarded: boolean;
  fieldKeys: string[];
  studentStatus: TStudentStatus | null;
  major: string | null;
}

export interface ILoginPayload {
  email: string;
  password: string;
}

export interface IRegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface IOnboardingPayload {
  fieldKeys: string[];
  studentStatus: TStudentStatus;
  major?: string;
}

/** Bentuk error validasi dari backend: dipetakan ke field form dengan setError. */
export interface IFieldError {
  field: string;
  message: string;
}
