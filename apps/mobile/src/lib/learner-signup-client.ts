/** Email OTP only; phone is optional and never verified using SMS. */
export interface LearnerRegistration {
  displayName: string; email: string; password: string; phoneNumber?: string;
  marketing: { email: boolean; whatsapp: boolean; sms: boolean };
}
export async function registerLearner(baseUrl: string, data: LearnerRegistration) {
  const response = await fetch(`${baseUrl.replace(/\/$/,'')}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!response.ok) throw new Error(`Registration failed (${response.status})`);
  return response.json() as Promise<{ message: string }>;
}
export async function verifyLearnerEmail(baseUrl: string, email: string, code: string) {
  const response = await fetch(`${baseUrl.replace(/\/$/,'')}/auth/verify-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) });
  if (!response.ok) throw new Error(`Email verification failed (${response.status})`);
  return response.json() as Promise<{ success: boolean; message: string }>;
}
