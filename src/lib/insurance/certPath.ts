// POST /api/insurance/upload이 반환하는 path 모양(certs/<uuid>.<ext>)만 허용한다 — 임의
// 문자열을 그대로 저장하면 이후 관리자 signed URL 발급(U16)·PII 삭제(U11)에서 다른 경로를
// 참조하게 될 수 있어 형식을 여기서 좁혀 막는다. 순수 상수라 별도 lib 파일로 분리해
// next-auth 등 서버 전용 의존성 없이 테스트에서 바로 import할 수 있게 한다.
export const CERT_PATH_PATTERN = /^certs\/[a-zA-Z0-9-]+\.(pdf|jpg|png|webp)$/;
