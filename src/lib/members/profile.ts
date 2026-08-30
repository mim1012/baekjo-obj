export interface ProfileContactFields {
  name: string;
  phone: string;
}

export function isMemberProfileComplete(profile: ProfileContactFields): boolean {
  return profile.name.trim().length > 0 && profile.phone.trim().length > 0;
}
