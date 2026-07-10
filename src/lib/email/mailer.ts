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
  });
}
