// 이메일 발송기 — Gmail SMTP(nodemailer). secret(앱 비밀번호)을 다루므로 서버 전용.
import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

let cachedTransport: Transporter | null = null;

/** SMTP_GMAIL_USER / SMTP_GMAIL_APP_PASSWORD로 지연 생성되는 싱글턴 전송기. */
function getTransport(): Transporter {
  if (cachedTransport) return cachedTransport;

  const user = process.env.SMTP_GMAIL_USER;
  const appPassword = process.env.SMTP_GMAIL_APP_PASSWORD;
  if (!user || !appPassword) {
    throw new Error('SMTP_GMAIL_USER / SMTP_GMAIL_APP_PASSWORD 환경변수가 설정되지 않았습니다.');
  }

  cachedTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass: appPassword },
  });
  return cachedTransport;
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  /** 선택적 텍스트 대체본(가산) — 이메일 클라이언트가 html을 못 그리거나 거부할 때의 폴백,
   * 그리고 신뢰할 수 없는 입력을 HTML로 보간하지 않고 안전하게 담는 경로로도 쓸 수 있다. */
  text?: string;
}

/** 메일 발송. 실패하면 예외를 그대로 던지므로 호출부에서 상황에 맞게 처리한다. */
export async function sendMail(input: SendMailInput): Promise<void> {
  const user = process.env.SMTP_GMAIL_USER;
  if (!user) {
    throw new Error('SMTP_GMAIL_USER 환경변수가 설정되지 않았습니다.');
  }

  await getTransport().sendMail({
    from: `"백조오브제" <${user}>`,
    to: input.to,
    subject: input.subject,
    html: input.html,
    ...(input.text !== undefined ? { text: input.text } : {}),
  });
}
