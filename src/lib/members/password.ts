// 이메일/비밀번호 회원의 비밀번호 해시 유틸. bcryptjs는 순수 JS 구현이라 별도 네이티브 빌드가 없다.
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
