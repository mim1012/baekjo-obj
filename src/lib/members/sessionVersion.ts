/** Missing-version legacy tokens must sign in again after the migration. */
export function isCurrentSession(
  version: unknown,
  member: { sessionVersion: number; status?: string } | null,
): boolean {
  return Boolean(member && member.status === 'active' && Number.isSafeInteger(version)
    && version === member.sessionVersion);
}
