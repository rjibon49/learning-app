
import { apiClient } from "./client";

export type LearnerProfile = {
  id: string;
  email: string;
  displayName: string;
  emailVerifiedAt?: string | null;
  currentStreak?: number;
  longestStreak?: number;
};

export type LoginResult = {
  user: LearnerProfile;
  accessToken: string;
  expiresIn: number;
  /** Returned because the client sends X-Client-Type: mobile. */
  refreshToken?: string;
};

export type RefreshResult = {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
};

export async function refreshLearnerSession(refreshToken: string) {
  const response = await apiClient.post<RefreshResult>(
    "/auth/learner/refresh",
    { refreshToken },
  );
  return response.data;
}

export async function updateLearnerProfile(displayName: string) {
  const response = await apiClient.patch<LearnerProfile>("/auth/learner/me", { displayName });
  return response.data;
}

export async function changeLearnerPassword(currentPassword: string, newPassword: string) {
  const response = await apiClient.post<RefreshResult>("/auth/learner/change-password", {
    currentPassword,
    newPassword,
  });
  return response.data;
}

/** Google Play / App Store require in-app account deletion. */
export async function deleteLearnerAccount(password: string) {
  const response = await apiClient.delete<{ success: boolean; mode: "deleted" | "anonymized" }>(
    "/auth/learner/me",
    { data: { password } },
  );
  return response.data;
}

export async function logoutLearner(refreshToken: string | null) {
  await apiClient.post(
    "/auth/learner/logout",
    refreshToken ? { refreshToken } : {},
  );
}

export type RegistrationInput = {
  displayName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  marketing: {
    email: boolean;
    whatsapp: boolean;
    sms: boolean;
  };
};

export async function registerLearner(
  data: RegistrationInput
) {
  const response = await apiClient.post<{
    message: string;
  }>("/auth/register", data);

  return response.data;
}

export async function verifyEmail(
  email: string,
  code: string
) {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
  }>("/auth/verify-email", {
    email: email.trim().toLowerCase(),
    code: code.trim(),
  });

  return response.data;
}

export async function loginLearner(
  email: string,
  password: string
) {
  const response = await apiClient.post<LoginResult>(
    "/auth/learner/login",
    {
      email: email.trim().toLowerCase(),
      password,
    }
  );

  return response.data;
}

export async function getLearnerProfile() {
  const response = await apiClient.get<LearnerProfile>(
    "/auth/learner/me"
  );

  return response.data;
}

export async function requestPasswordReset(email: string) {
  const response = await apiClient.post<{
    message: string;
  }>("/auth/learner/forgot-password", {
    email: email.trim().toLowerCase(),
  });

  return response.data;
}

export async function resetPassword(
  token: string,
  newPassword: string
) {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
  }>("/auth/learner/reset-password", {
    token: token.trim(),
    newPassword,
  });

  return response.data;
}


export async function resendVerificationCode(
  email: string
): Promise<{ message: string }> {
  const response = await apiClient.post<{
    message: string;
  }>("/auth/resend-verification", {
    email: email.trim().toLowerCase(),
  });

  return response.data;
}
