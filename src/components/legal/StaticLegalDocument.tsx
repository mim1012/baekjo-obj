import { COMPANY } from '@/data/company';
import { substituteCompanyTokensDeep } from '@/lib/cms/companyTokens';

export interface LegalArticle {
  readonly title: string;
  readonly body: string;
  readonly visible: boolean;
  /** true면 body를 줄 단위로 나눠 '-' 접두어를 지우고 실제 <ul><li> 목록으로 그린다(예: 배송·환불 안내). */
  readonly bulletList?: boolean;
  /** 있으면 body 대신 이 줄들을 테두리 있는 안내 상자로 그린다(예: 배송·환불 안내의 고객센터 블록). */
  readonly noticeLines?: readonly string[];
}

interface StaticLegalDocumentProps {
  readonly document: {
    readonly eyebrow: string;
    readonly title: string;
    readonly effectiveDate: string;
    readonly introduction: string;
    readonly articles: readonly LegalArticle[];
    readonly companyBoxTitle?: string;
    readonly footerNote?: string;
  };
  readonly showCompany: boolean;
  /** 하단 "부칙 — 이 문서는 …부터 시행합니다." 문구 표시 여부. 기존 호출자(terms/privacy)는 항상
   * 이 문구를 보여줬으므로 기본값 true로 그 동작을 유지한다. refund-policy는 이 문구가 없었다. */
  readonly showAppendixNote?: boolean;
  /** 게시된 CMS 콘텐츠를 쓰고 있을 때만 넘긴다 — 루트 요소에 data-cms-managed로 표시된다. */
  readonly cmsManagedKey?: string;
}

export default function StaticLegalDocument({
  document: rawDocument,
  showCompany,
  showAppendixNote = true,
  cmsManagedKey,
}: StaticLegalDocumentProps) {
  const document = substituteCompanyTokensDeep(rawDocument);
  return (
    <div className="page-section min-h-dvh bg-[#F4F2EC]" data-cms-managed={cmsManagedKey}>
      <div className="site-container">
        <div className="mx-auto max-w-3xl">
          <p className="page-eyebrow">{document.eyebrow}</p>
          <h1 className="page-title mt-3">{document.title}</h1>
          <p className="mt-4 text-sm text-[#6F766F]">시행일: {document.effectiveDate}</p>

          {document.introduction && (
            <p className="mt-8 whitespace-pre-line break-keep text-[15px] leading-7 text-[#4A514A]">
              {document.introduction}
            </p>
          )}

          <div className="mt-10 space-y-10">
            {document.articles.filter((article) => article.visible).map((article) => (
              <section key={article.title}>
                <h2 className="text-lg font-bold text-[#202521]">{article.title}</h2>
                {article.noticeLines && article.noticeLines.length > 0 ? (
                  <div className="mt-3 break-keep text-[15px] leading-7 text-[#4A514A]">
                    <div className="rounded-2xl border border-[#D8D6CE] bg-white/60 p-5">
                      {article.noticeLines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </div>
                ) : article.bulletList && article.body ? (
                  <div className="mt-3 break-keep text-[15px] leading-7 text-[#4A514A]">
                    <ul className="list-disc space-y-2 pl-5">
                      {article.body
                        .split('\n')
                        .filter((line) => line.length > 0)
                        .map((line) => (
                          <li key={line}>{line.replace(/^-\s*/, '')}</li>
                        ))}
                    </ul>
                  </div>
                ) : (
                  article.body && (
                    <div className="mt-3 whitespace-pre-line break-keep text-[15px] leading-7 text-[#4A514A]">
                      {article.body}
                    </div>
                  )
                )}
              </section>
            ))}
          </div>

          {showCompany && (
            <div className="mt-14 rounded-2xl border border-[#D8D6CE] bg-white/60 p-6 text-[15px] leading-7 text-[#4A514A]">
              <p className="font-semibold text-[#202521]">{document.companyBoxTitle || '사업자 정보'}</p>
              <p className="mt-2">
                상호: {COMPANY.name} · 대표자: {COMPANY.ceo}
                <br />
                사업자등록번호: {COMPANY.businessNumber} · 통신판매업신고번호: {COMPANY.mailOrderNumber}
                <br />
                주소: {COMPANY.address}
                <br />
                고객센터: {COMPANY.tel} · {COMPANY.email}
              </p>
            </div>
          )}

          {document.footerNote && (
            <p className="mt-10 whitespace-pre-line break-keep text-[15px] leading-7 text-[#4A514A]">
              {document.footerNote}
            </p>
          )}

          {showAppendixNote && (
            <p className="mt-10 text-sm text-[#6F766F]">부칙 — 이 문서는 {document.effectiveDate}부터 시행합니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
