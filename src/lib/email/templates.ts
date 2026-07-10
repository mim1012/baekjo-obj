// 발송 메일 템플릿 — 인라인 스타일 카드 하나로 통일(메일 클라이언트는 외부 CSS를 못 읽는다).

export interface EmailContent {
  subject: string;
  html: string;
}

function renderCard(params: {
  title: string;
  bodyLines: string[];
  buttonLabel: string;
  link: string;
  deadlineNotice: string;
}): string {
  const { title, bodyLines, buttonLabel, link, deadlineNotice } = params;
  const paragraphs = bodyLines
    .map((line) => `<p style="margin:0 0 16px;color:#2F3B34;font-size:15px;line-height:1.6;">${line}</p>`)
    .join('');

  return `
<div style="background-color:#F9F8F3;padding:40px 16px;">
  <div style="max-width:480px;margin:0 auto;background-color:#FFFFFF;border-radius:12px;padding:40px 32px;">
    <p style="margin:0 0 24px;color:#2F3B34;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;">백조오브제</p>
    <h1 style="margin:0 0 20px;color:#1A1D1B;font-size:20px;font-weight:600;">${title}</h1>
    ${paragraphs}
    <div style="margin:28px 0;">
      <a href="${link}" style="display:inline-block;background-color:#2F3B34;color:#F9F8F3;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">${buttonLabel}</a>
    </div>
    <p style="margin:0 0 8px;color:#5C6A61;font-size:13px;line-height:1.6;">버튼이 눌리지 않으면 아래 링크를 복사해 브라우저에 붙여넣어 주세요.</p>
    <p style="margin:0 0 24px;color:#5C6A61;font-size:12px;line-height:1.6;word-break:break-all;">${link}</p>
    <p style="margin:0;color:#8A9187;font-size:12px;line-height:1.6;">${deadlineNotice} 본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.</p>
  </div>
</div>`;
}

/** 이메일 인증 메일. */
export function verificationEmail(link: string): EmailContent {
  return {
    subject: '[백조오브제] 이메일 인증을 완료해 주세요',
    html: renderCard({
      title: '이메일 인증',
      bodyLines: ['백조오브제 회원가입을 환영합니다.', '아래 버튼을 눌러 이메일 인증을 완료해 주세요.'],
      buttonLabel: '이메일 인증하기',
      link,
      deadlineNotice: '이 링크는 24시간 안에 완료해 주세요.',
    }),
  };
}

/** 비밀번호 재설정 메일. */
export function passwordResetEmail(link: string): EmailContent {
  return {
    subject: '[백조오브제] 비밀번호 재설정 안내',
    html: renderCard({
      title: '비밀번호 재설정',
      bodyLines: ['비밀번호 재설정 요청이 접수되었습니다.', '아래 버튼을 눌러 새 비밀번호를 설정해 주세요.'],
      buttonLabel: '비밀번호 재설정하기',
      link,
      deadlineNotice: '이 링크는 30분 안에 완료해 주세요.',
    }),
  };
}
