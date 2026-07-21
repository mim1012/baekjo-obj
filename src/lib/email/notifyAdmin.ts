// 신규 접수(보험 분석 신청·B2B 케어키트 제휴 문의) 관리자 알림. sendMail을 얇게 감싼다.
import { sendMail } from '@/lib/email/mailer';
import { logServerError } from '@/lib/logServerError';

export interface NotifyAdminNewSubmissionInput {
  /** 접수 종류 — 알림 제목/본문에 그대로 노출된다. */
  kind: '보험 분석 신청' | 'B2B 케어키트 제휴 문의';
  /** 관리자가 목록에서 바로 알아볼 요약(신청자명·연락처 등, PII 최소한만). */
  summary: string;
}

/**
 * 신규 접수 관리자 알림 메일. 접수 자체는 이미 DB insert로 성공했으므로, 알림 발송 실패가
 * 접수 실패로 이어지면 안 된다 — 실패는 삼키고 console.error(logServerError)만 남긴다.
 * 수신자는 ADMIN_NOTIFY_EMAIL, 없으면 발신 계정(SMTP_GMAIL_USER)로 폴백(자기 자신에게라도 도착).
 */
export async function notifyAdminNewSubmission(input: NotifyAdminNewSubmissionInput): Promise<void> {
  const to = process.env.ADMIN_NOTIFY_EMAIL ?? process.env.SMTP_GMAIL_USER;
  if (!to) {
    logServerError('[notifyAdminNewSubmission] 수신자 미설정(ADMIN_NOTIFY_EMAIL/SMTP_GMAIL_USER 없음)', null);
    return;
  }

  try {
    await sendMail({
      to,
      subject: `[백조오브제] 신규 ${input.kind} 접수`,
      html: `
<div style="background-color:#F9F8F3;padding:40px 16px;">
  <div style="max-width:480px;margin:0 auto;background-color:#FFFFFF;border-radius:12px;padding:32px 28px;">
    <p style="margin:0 0 20px;color:#2F3B34;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;">백조오브제 관리자 알림</p>
    <h1 style="margin:0 0 16px;color:#1A1D1B;font-size:18px;font-weight:600;">신규 ${input.kind} 접수</h1>
    <p style="margin:0;color:#2F3B34;font-size:14px;line-height:1.6;white-space:pre-wrap;">${input.summary}</p>
  </div>
</div>`,
    });
  } catch (error) {
    logServerError('[notifyAdminNewSubmission] 관리자 알림 메일 발송 실패', error);
  }
}
