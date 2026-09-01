import { COMPANY } from '@/data/company';

export interface LegalArticle {
  readonly title: string;
  readonly body: string;
  readonly visible: boolean;
}

interface StaticLegalDocumentProps {
  readonly document: {
    readonly title: string;
    readonly effectiveDate: string;
    readonly introduction: string;
    readonly articles: readonly LegalArticle[];
  };
  readonly showCompany: boolean;
}

export default function StaticLegalDocument({ document, showCompany }: StaticLegalDocumentProps) {
  return (
    <div className="min-h-dvh bg-[#F4F2EC] py-16">
      <div className="site-container">
        <div className="mx-auto max-w-3xl">
          <p className="page-eyebrow">Legal</p>
          <h1 className="mt-3 text-3xl font-bold text-[#202521] md:text-4xl">{document.title}</h1>
          <p className="mt-4 text-sm text-[#6F766F]">시행일: {document.effectiveDate}</p>

          {document.introduction && (
            <p className="mt-8 whitespace-pre-line break-keep text-sm leading-7 text-[#4A514A]">
              {document.introduction}
            </p>
          )}

          <div className="mt-10 space-y-10">
            {document.articles.filter((article) => article.visible).map((article) => (
              <section key={article.title}>
                <h2 className="text-lg font-bold text-[#202521]">{article.title}</h2>
                {article.body && (
                  <div className="mt-3 whitespace-pre-line break-keep text-sm leading-7 text-[#4A514A]">
                    {article.body}
                  </div>
                )}
              </section>
            ))}
          </div>

          {showCompany && (
            <div className="mt-14 rounded-2xl border border-[#D8D6CE] bg-white/60 p-6 text-sm leading-7 text-[#4A514A]">
              <p className="font-semibold text-[#202521]">사업자 정보</p>
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

          <p className="mt-10 text-sm text-[#6F766F]">부칙 — 이 문서는 {document.effectiveDate}부터 시행합니다.</p>
        </div>
      </div>
    </div>
  );
}
