import type { ReactNode } from 'react';
import type { SiteShellContent } from '@/components/providers/PublicSiteContentProvider';

export interface ManagedLegalArticle {
  title: string;
  body: string;
  visible: boolean;
}

export interface ManagedLegalNotice {
  visible: boolean;
  title: string;
  body: string;
}

export interface ManagedLegalPurposeRow {
  category: string;
  purpose: string;
  requiredItems: string;
  optionalItems: string;
  note: string;
  visible: boolean;
}

export interface ManagedLegalPurposeTable {
  visible: boolean;
  title: string;
  description: string;
  footerNote: string;
  headers: {
    category: string;
    purpose: string;
    items: string;
  };
  rows: ManagedLegalPurposeRow[];
}

export interface ManagedLegalListItem {
  body: string;
  visible: boolean;
}

export interface ManagedLegalListSection {
  visible: boolean;
  title: string;
  items: ManagedLegalListItem[];
}

export interface ManagedLegalRetentionRow {
  information: string;
  period: string;
  visible: boolean;
}

export interface ManagedLegalRetentionTable {
  visible: boolean;
  title: string;
  description: string;
  headers: {
    information: string;
    period: string;
  };
  rows: ManagedLegalRetentionRow[];
}

export interface ManagedLegalStatutoryRetentionRow {
  record: string;
  period: string;
  basis: string;
  visible: boolean;
}

export interface ManagedLegalStatutoryRetentionTable {
  visible: boolean;
  headers: {
    record: string;
    period: string;
    basis: string;
  };
  rows: ManagedLegalStatutoryRetentionRow[];
}

export interface ManagedLegalThirdPartyRow {
  category: string;
  content: string;
  visible: boolean;
}

export interface ManagedLegalThirdPartyProvision {
  visible: boolean;
  title: string;
  introduction: string;
  headers: {
    category: string;
    content: string;
  };
  rows: ManagedLegalThirdPartyRow[];
  refusalTitle: string;
  refusalBody: string;
}

export interface ManagedLegalOutsourcingRow {
  trustee: string;
  work: string;
  period: string;
  visible: boolean;
}

export interface ManagedLegalOutsourcingSection {
  visible: boolean;
  title: string;
  introduction: string;
  headers: {
    trustee: string;
    work: string;
    period: string;
  };
  rows: ManagedLegalOutsourcingRow[];
  footerNote: string;
}

export interface ManagedLegalSecurityMeasureRow {
  category: string;
  measure: string;
  visible: boolean;
}

export interface ManagedLegalSecurityMeasuresTable {
  visible: boolean;
  title: string;
  introduction: string;
  headers: {
    category: string;
    measure: string;
  };
  rows: ManagedLegalSecurityMeasureRow[];
}

export interface ManagedLegalPrivacyContactRow {
  category: string;
  content: string;
  visible: boolean;
}

export interface ManagedLegalPrivacyContactTable {
  visible: boolean;
  title: string;
  introduction: string;
  headers: {
    category: string;
    content: string;
  };
  rows: ManagedLegalPrivacyContactRow[];
  footerNote: string;
}

export interface ManagedLegalRightsReliefRow {
  agency: string;
  phone: string;
  homepage: string;
  visible: boolean;
}

export interface ManagedLegalRightsReliefTable {
  visible: boolean;
  title: string;
  introduction: string;
  headers: {
    agency: string;
    phone: string;
    homepage: string;
  };
  rows: ManagedLegalRightsReliefRow[];
}

export interface ManagedLegalPolicyChangeItem {
  body: string;
  visible: boolean;
}

export interface ManagedLegalPolicyChanges {
  visible: boolean;
  title: string;
  items: ManagedLegalPolicyChangeItem[];
  effectiveDateLabel: string;
  effectiveDate: string;
}

export interface ManagedLegalContent extends Record<string, unknown> {
  visible: boolean;
  eyebrow: string;
  title: string;
  effectiveDate: string;
  introduction: string;
  articles: ManagedLegalArticle[];
  footerNote: string;
  companyBoxVisible: boolean;
  companyBoxTitle: string;
  featuredNotice?: ManagedLegalNotice;
  purposeTable?: ManagedLegalPurposeTable;
  collectionMethods?: ManagedLegalListSection;
  retentionTable?: ManagedLegalRetentionTable;
  statutoryRetentionTable?: ManagedLegalStatutoryRetentionTable;
  thirdPartyProvision?: ManagedLegalThirdPartyProvision;
  outsourcing?: ManagedLegalOutsourcingSection;
  securityMeasuresTable?: ManagedLegalSecurityMeasuresTable;
  privacyContactTable?: ManagedLegalPrivacyContactTable;
  rightsReliefTable?: ManagedLegalRightsReliefTable;
  policyChanges?: ManagedLegalPolicyChanges;
}

type Company = SiteShellContent['company'];

function replaceTokens(value: string, company: Company, effectiveDate: string): string {
  const replacements: Record<string, string> = {
    '{{effectiveDate}}': effectiveDate,
    '{{company.serviceName}}': company.serviceName,
    '{{company.name}}': company.name,
    '{{company.ceo}}': company.ceo,
    '{{company.businessNumber}}': company.businessNumber,
    '{{company.mailOrderNumber}}': company.mailOrderNumber,
    '{{company.address}}': company.address,
    '{{company.tel}}': company.tel,
    '{{company.email}}': company.email,
    '{{company.privacyOfficer}}': company.privacyOfficer,
    '{{company.hostingProvider}}': company.hostingProvider,
    '{{company.supportHours}}': company.supportHours,
  };
  return Object.entries(replacements).reduce(
    (result, [token, replacement]) => result.split(token).join(replacement),
    value,
  );
}

function LegalBody({ body, company, effectiveDate }: { body: string; company: Company; effectiveDate: string }) {
  const lines = replaceTokens(body, company, effectiveDate)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const nodes: ReactNode[] = [];
  let bullets: string[] = [];
  const flushBullets = () => {
    if (bullets.length === 0) return;
    const current = bullets;
    bullets = [];
    nodes.push(
      <ul key={`list-${nodes.length}`} className="list-disc space-y-2 pl-5">
        {current.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
      </ul>,
    );
  };
  for (const line of lines) {
    if (line.startsWith('- ') || line.startsWith('· ')) {
      bullets.push(line.slice(2).trim());
      continue;
    }
    flushBullets();
    nodes.push(<p key={`paragraph-${nodes.length}`}>{line}</p>);
  }
  flushBullets();
  return <div className="space-y-3 text-pretty">{nodes}</div>;
}

function PurposeTable({
  table,
  company,
  effectiveDate,
}: {
  table: ManagedLegalPurposeTable;
  company: Company;
  effectiveDate: string;
}) {
  const rows = table.rows.filter((row) => row.visible);
  const renderItems = (row: ManagedLegalPurposeRow) => [row.requiredItems, row.optionalItems, row.note]
    .filter(Boolean)
    .join('\n');

  return (
    <section className="mt-10">
      <h2 className="text-balance text-lg font-bold text-[#202521]">{table.title}</h2>
      <div className="mt-3 break-keep text-sm leading-7 text-[#4A514A]">
        <LegalBody body={table.description} company={company} effectiveDate={effectiveDate} />
      </div>

      <div className="mt-5 hidden overflow-hidden rounded-lg border border-[#202521] md:block">
        <table className="w-full table-fixed border-collapse text-left text-sm leading-6 tabular-nums text-[#303630]">
          <thead className="bg-[#E7EBF3] text-[#202521]">
            <tr>
              <th scope="col" className="w-[22%] border-r border-[#202521] px-4 py-3 text-center font-semibold">{table.headers.category}</th>
              <th scope="col" className="w-[34%] border-r border-[#202521] px-4 py-3 text-center font-semibold">{table.headers.purpose}</th>
              <th scope="col" className="w-[44%] px-4 py-3 text-center font-semibold">{table.headers.items}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.category}-${index}`} className="border-t border-[#202521] align-top">
                <th scope="row" className="border-r border-[#202521] px-4 py-4 font-semibold text-[#202521]">
                  <LegalBody body={row.category} company={company} effectiveDate={effectiveDate} />
                </th>
                <td className="border-r border-[#202521] px-4 py-4">
                  <LegalBody body={row.purpose} company={company} effectiveDate={effectiveDate} />
                </td>
                <td className="px-4 py-4">
                  <LegalBody body={renderItems(row)} company={company} effectiveDate={effectiveDate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 space-y-4 md:hidden">
        {rows.map((row, index) => (
          <article key={`${row.category}-mobile-${index}`} className="rounded-lg border border-[#B9BDB7] bg-white/60 p-5 text-sm leading-7 text-[#4A514A]">
            <div className="font-semibold text-[#202521]">
              <LegalBody body={row.category} company={company} effectiveDate={effectiveDate} />
            </div>
            <p className="mt-4 font-semibold text-[#202521]">{table.headers.purpose}</p>
            <div className="mt-1">
              <LegalBody body={row.purpose} company={company} effectiveDate={effectiveDate} />
            </div>
            <p className="mt-4 font-semibold text-[#202521]">{table.headers.items}</p>
            <div className="mt-1">
              <LegalBody body={renderItems(row)} company={company} effectiveDate={effectiveDate} />
            </div>
          </article>
        ))}
      </div>

      {table.footerNote && (
        <div className="mt-5 break-keep text-sm leading-7 text-[#4A514A]">
          <LegalBody body={table.footerNote} company={company} effectiveDate={effectiveDate} />
        </div>
      )}
    </section>
  );
}

function CollectionMethods({
  section,
  company,
  effectiveDate,
}: {
  section: ManagedLegalListSection;
  company: Company;
  effectiveDate: string;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-balance text-lg font-bold text-[#202521]">{section.title}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-[#4A514A]">
        {section.items.filter((item) => item.visible).map((item, index) => (
          <li key={`${item.body}-${index}`} className="text-pretty">
            {replaceTokens(item.body, company, effectiveDate)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RetentionTable({
  table,
  company,
  effectiveDate,
}: {
  table: ManagedLegalRetentionTable;
  company: Company;
  effectiveDate: string;
}) {
  const rows = table.rows.filter((row) => row.visible);
  return (
    <section className="mt-10">
      <h2 className="text-balance text-lg font-bold text-[#202521]">{table.title}</h2>
      <div className="mt-3 break-keep text-sm leading-7 text-[#4A514A]">
        <LegalBody body={table.description} company={company} effectiveDate={effectiveDate} />
      </div>

      <div className="mt-5 hidden overflow-hidden rounded-lg border border-[#202521] md:block">
        <table className="w-full table-fixed border-collapse text-left text-sm leading-6 tabular-nums text-[#303630]">
          <thead className="bg-[#E7EBF3] text-[#202521]">
            <tr>
              <th scope="col" className="w-2/5 border-r border-[#202521] px-4 py-3 text-center font-semibold">{table.headers.information}</th>
              <th scope="col" className="w-3/5 px-4 py-3 text-center font-semibold">{table.headers.period}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.information}-${index}`} className="border-t border-[#202521] align-top">
                <th scope="row" className="border-r border-[#202521] px-4 py-4 font-semibold text-[#202521]">
                  <LegalBody body={row.information} company={company} effectiveDate={effectiveDate} />
                </th>
                <td className="px-4 py-4">
                  <LegalBody body={row.period} company={company} effectiveDate={effectiveDate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 space-y-4 md:hidden">
        {rows.map((row, index) => (
          <article key={`${row.information}-mobile-${index}`} className="rounded-lg border border-[#B9BDB7] bg-white/60 p-5 text-sm leading-7 text-[#4A514A]">
            <p className="font-semibold text-[#202521]">{row.information}</p>
            <p className="mt-3 text-pretty">{replaceTokens(row.period, company, effectiveDate)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function StatutoryRetentionTable({
  table,
  company,
  effectiveDate,
}: {
  table: ManagedLegalStatutoryRetentionTable;
  company: Company;
  effectiveDate: string;
}) {
  const rows = table.rows.filter((row) => row.visible);
  return (
    <section className="mt-6" aria-label="법정 보존기록">
      <div className="hidden overflow-hidden rounded-lg border border-[#202521] md:block">
        <table className="w-full table-fixed border-collapse text-left text-sm leading-6 tabular-nums text-[#303630]">
          <thead className="bg-[#E7EBF3] text-[#202521]">
            <tr>
              <th scope="col" className="w-[42%] border-r border-[#202521] px-4 py-3 text-center font-semibold">{table.headers.record}</th>
              <th scope="col" className="w-[16%] border-r border-[#202521] px-4 py-3 text-center font-semibold">{table.headers.period}</th>
              <th scope="col" className="w-[42%] px-4 py-3 text-center font-semibold">{table.headers.basis}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.record}-${index}`} className="border-t border-[#202521] align-top">
                <th scope="row" className="border-r border-[#202521] px-4 py-4 font-semibold text-[#202521]">
                  <LegalBody body={row.record} company={company} effectiveDate={effectiveDate} />
                </th>
                <td className="border-r border-[#202521] px-4 py-4 text-center">
                  <LegalBody body={row.period} company={company} effectiveDate={effectiveDate} />
                </td>
                <td className="px-4 py-4">
                  <LegalBody body={row.basis} company={company} effectiveDate={effectiveDate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 md:hidden">
        {rows.map((row, index) => (
          <article key={`${row.record}-mobile-${index}`} className="rounded-lg border border-[#B9BDB7] bg-white/60 p-5 text-sm leading-7 text-[#4A514A]">
            <p className="font-semibold text-[#202521]">{row.record}</p>
            <p className="mt-3 tabular-nums">{row.period}</p>
            <p className="mt-2 text-pretty">{row.basis}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ThirdPartyProvision({
  section,
  company,
  effectiveDate,
}: {
  section: ManagedLegalThirdPartyProvision;
  company: Company;
  effectiveDate: string;
}) {
  const rows = section.rows.filter((row) => row.visible);
  return (
    <section className="mt-10">
      <h2 className="text-balance text-lg font-bold text-[#202521]">{section.title}</h2>
      <div className="mt-3 break-keep text-sm leading-7 text-[#4A514A]">
        <LegalBody body={section.introduction} company={company} effectiveDate={effectiveDate} />
      </div>

      <div className="mt-5 hidden overflow-hidden rounded-lg border border-[#202521] md:block">
        <table className="w-full table-fixed border-collapse text-left text-sm leading-6 text-[#303630]">
          <thead className="bg-[#E7EBF3] text-[#202521]">
            <tr>
              <th scope="col" className="w-1/4 border-r border-[#202521] px-4 py-3 text-center font-semibold">{section.headers.category}</th>
              <th scope="col" className="w-3/4 px-4 py-3 text-center font-semibold">{section.headers.content}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.category}-${index}`} className="border-t border-[#202521] align-top">
                <th scope="row" className="border-r border-[#202521] px-4 py-4 font-semibold text-[#202521]">{row.category}</th>
                <td className="px-4 py-4 text-pretty">{row.content}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 space-y-4 md:hidden">
        {rows.map((row, index) => (
          <article key={`${row.category}-mobile-${index}`} className="rounded-lg border border-[#B9BDB7] bg-white/60 p-5 text-sm leading-7 text-[#4A514A]">
            <p className="font-semibold text-[#202521]">{row.category}</p>
            <p className="mt-2 text-pretty">{row.content}</p>
          </article>
        ))}
      </div>

      <aside className="mt-5 rounded-lg border border-[#202521] bg-white/60 p-5 text-sm leading-7 text-[#303630]">
        <p className="font-semibold text-[#202521]">{section.refusalTitle}</p>
        <div className="mt-2 break-keep">
          <LegalBody body={section.refusalBody} company={company} effectiveDate={effectiveDate} />
        </div>
      </aside>
    </section>
  );
}

function OutsourcingSection({
  section,
  company,
  effectiveDate,
}: {
  section: ManagedLegalOutsourcingSection;
  company: Company;
  effectiveDate: string;
}) {
  const rows = section.rows.filter((row) => row.visible);
  return (
    <section className="mt-10">
      <h2 className="text-balance text-lg font-bold text-[#202521]">{section.title}</h2>
      <div className="mt-3 break-keep text-sm leading-7 text-[#4A514A]">
        <LegalBody body={section.introduction} company={company} effectiveDate={effectiveDate} />
      </div>

      <div className="mt-5 hidden overflow-hidden rounded-lg border border-[#202521] md:block">
        <table className="w-full table-fixed border-collapse text-left text-sm leading-6 tabular-nums text-[#303630]">
          <thead className="bg-[#E7EBF3] text-[#202521]">
            <tr>
              <th scope="col" className="w-1/4 border-r border-[#202521] px-4 py-3 text-center font-semibold">{section.headers.trustee}</th>
              <th scope="col" className="w-2/5 border-r border-[#202521] px-4 py-3 text-center font-semibold">{section.headers.work}</th>
              <th scope="col" className="px-4 py-3 text-center font-semibold">{section.headers.period}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.trustee}-${index}`} className="border-t border-[#202521] align-top">
                <th scope="row" className="border-r border-[#202521] px-4 py-4 font-semibold text-[#202521]">{row.trustee}</th>
                <td className="border-r border-[#202521] px-4 py-4 text-pretty">{row.work}</td>
                <td className="px-4 py-4 text-pretty">{row.period}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 space-y-4 md:hidden">
        {rows.map((row, index) => (
          <article key={`${row.trustee}-mobile-${index}`} className="rounded-lg border border-[#B9BDB7] bg-white/60 p-5 text-sm leading-7 text-[#4A514A]">
            <p className="font-semibold text-[#202521]">{row.trustee}</p>
            <p className="mt-3 text-pretty">{row.work}</p>
            <p className="mt-2 text-pretty tabular-nums">{row.period}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 break-keep text-sm leading-7 text-[#4A514A]">
        <LegalBody body={section.footerNote} company={company} effectiveDate={effectiveDate} />
      </div>
    </section>
  );
}

interface ManagedLegalTwoColumnRow {
  category: string;
  content: string;
  visible: boolean;
}

interface ManagedLegalTwoColumnSection {
  title: string;
  introduction: string;
  headers: {
    category: string;
    content: string;
  };
  rows: ManagedLegalTwoColumnRow[];
  footerNote?: string;
}

function TwoColumnTableSection({
  section,
  company,
  effectiveDate,
}: {
  section: ManagedLegalTwoColumnSection;
  company: Company;
  effectiveDate: string;
}) {
  const rows = section.rows.filter((row) => row.visible);
  return (
    <section className="mt-10">
      <h2 className="text-balance text-lg font-bold text-[#202521]">{section.title}</h2>
      <div className="mt-3 break-keep text-sm leading-7 text-[#4A514A]">
        <LegalBody body={section.introduction} company={company} effectiveDate={effectiveDate} />
      </div>

      <div className="mt-5 hidden overflow-hidden rounded-lg border border-[#202521] md:block">
        <table className="w-full table-fixed border-collapse text-left text-sm leading-6 text-[#303630]">
          <thead className="bg-[#E7EBF3] text-[#202521]">
            <tr>
              <th scope="col" className="w-1/3 border-r border-[#202521] px-4 py-3 text-center font-semibold">{section.headers.category}</th>
              <th scope="col" className="px-4 py-3 text-center font-semibold">{section.headers.content}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.category}-${index}`} className="border-t border-[#202521] align-top">
                <th scope="row" className="border-r border-[#202521] px-4 py-4 font-semibold text-[#202521]">{row.category}</th>
                <td className="px-4 py-4 text-pretty">{row.content}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 space-y-4 md:hidden">
        {rows.map((row, index) => (
          <article key={`${row.category}-mobile-${index}`} className="rounded-lg border border-[#B9BDB7] bg-white/60 p-5 text-sm leading-7 text-[#4A514A]">
            <p className="font-semibold text-[#202521]">{row.category}</p>
            <p className="mt-2 text-pretty">{row.content}</p>
          </article>
        ))}
      </div>

      {section.footerNote && (
        <div className="mt-5 break-keep text-sm leading-7 text-[#4A514A]">
          <LegalBody body={section.footerNote} company={company} effectiveDate={effectiveDate} />
        </div>
      )}
    </section>
  );
}

function externalHomepageHref(homepage: string): string {
  return /^https?:\/\//i.test(homepage) ? homepage : `https://${homepage}`;
}

function RightsReliefTable({ table }: { table: ManagedLegalRightsReliefTable }) {
  const rows = table.rows.filter((row) => row.visible);
  return (
    <section className="mt-10">
      <h2 className="text-balance text-lg font-bold text-[#202521]">{table.title}</h2>
      <p className="mt-3 break-keep text-pretty text-sm leading-7 text-[#4A514A]">{table.introduction}</p>

      <div className="mt-5 hidden overflow-hidden rounded-lg border border-[#202521] md:block">
        <table className="w-full table-fixed border-collapse text-left text-sm leading-6 text-[#303630]">
          <thead className="bg-[#E7EBF3] text-[#202521]">
            <tr>
              <th scope="col" className="w-2/5 border-r border-[#202521] px-4 py-3 text-center font-semibold">{table.headers.agency}</th>
              <th scope="col" className="w-1/4 border-r border-[#202521] px-4 py-3 text-center font-semibold">{table.headers.phone}</th>
              <th scope="col" className="px-4 py-3 text-center font-semibold">{table.headers.homepage}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.agency}-${index}`} className="border-t border-[#202521] align-top">
                <th scope="row" className="border-r border-[#202521] px-4 py-4 font-semibold text-[#202521]">{row.agency}</th>
                <td className="border-r border-[#202521] px-4 py-4 text-pretty tabular-nums">{row.phone}</td>
                <td className="px-4 py-4 text-pretty">
                  <a className="underline decoration-[#969D96] underline-offset-4 hover:text-[#202521]" href={externalHomepageHref(row.homepage)} target="_blank" rel="noreferrer">{row.homepage}</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 space-y-4 md:hidden">
        {rows.map((row, index) => (
          <article key={`${row.agency}-mobile-${index}`} className="rounded-lg border border-[#B9BDB7] bg-white/60 p-5 text-sm leading-7 text-[#4A514A]">
            <p className="font-semibold text-[#202521]">{row.agency}</p>
            <dl className="mt-3 space-y-2">
              <div>
                <dt className="font-medium text-[#59615B]">{table.headers.phone}</dt>
                <dd className="tabular-nums">{row.phone}</dd>
              </div>
              <div>
                <dt className="font-medium text-[#59615B]">{table.headers.homepage}</dt>
                <dd><a className="break-all underline decoration-[#969D96] underline-offset-4" href={externalHomepageHref(row.homepage)} target="_blank" rel="noreferrer">{row.homepage}</a></dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function PolicyChangesSection({ section }: { section: ManagedLegalPolicyChanges }) {
  const items = section.items.filter((item) => item.visible);
  return (
    <section className="mt-10">
      <h2 className="text-balance text-lg font-bold text-[#202521]">{section.title}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-pretty text-sm leading-7 text-[#4A514A]">
        {items.map((item, index) => <li key={`${item.body}-${index}`}>{item.body}</li>)}
      </ul>
      <p className="mt-8 text-sm leading-7 text-[#303630] tabular-nums">
        <span className="font-semibold text-[#202521]">{section.effectiveDateLabel}:</span> {section.effectiveDate}
      </p>
    </section>
  );
}

export default function ManagedLegalDocument({
  document,
  company,
}: {
  document: ManagedLegalContent;
  company: Company;
}) {
  return (
    <div className="min-h-dvh bg-[#F4F2EC] py-16">
      <div className="site-container">
        <div className="mx-auto max-w-3xl">
          <p className="page-eyebrow">{document.eyebrow}</p>
          <h1 className="mt-3 text-balance text-3xl font-bold text-[#202521] md:text-4xl">{document.title}</h1>
          <p className="mt-4 text-sm text-[#6F766F]">시행일: {document.effectiveDate}</p>
          {document.introduction && (
            <div className="mt-8 break-keep text-sm leading-7 text-[#4A514A]">
              <LegalBody body={document.introduction} company={company} effectiveDate={document.effectiveDate} />
            </div>
          )}

          {document.featuredNotice && document.featuredNotice.visible && (
            <aside className="mt-8 rounded-lg border border-[#202521] bg-white/60 p-5 text-sm leading-7 text-[#303630]">
              <p className="font-semibold text-[#202521]">{document.featuredNotice.title}</p>
              <div className="mt-2 break-keep">
                <LegalBody body={document.featuredNotice.body} company={company} effectiveDate={document.effectiveDate} />
              </div>
            </aside>
          )}

          {document.purposeTable && document.purposeTable.visible && (
            <PurposeTable
              table={{
                visible: document.purposeTable.visible,
                title: document.purposeTable.title,
                description: document.purposeTable.description,
                footerNote: document.purposeTable.footerNote,
                headers: {
                  category: document.purposeTable.headers.category,
                  purpose: document.purposeTable.headers.purpose,
                  items: document.purposeTable.headers.items,
                },
                rows: document.purposeTable.rows,
              }}
              company={company}
              effectiveDate={document.effectiveDate}
            />
          )}

          {document.collectionMethods && document.collectionMethods.visible && (
            <CollectionMethods
              section={{
                visible: document.collectionMethods.visible,
                title: document.collectionMethods.title,
                items: document.collectionMethods.items,
              }}
              company={company}
              effectiveDate={document.effectiveDate}
            />
          )}

          {document.retentionTable && document.retentionTable.visible && (
            <RetentionTable
              table={{
                visible: document.retentionTable.visible,
                title: document.retentionTable.title,
                description: document.retentionTable.description,
                headers: {
                  information: document.retentionTable.headers.information,
                  period: document.retentionTable.headers.period,
                },
                rows: document.retentionTable.rows,
              }}
              company={company}
              effectiveDate={document.effectiveDate}
            />
          )}

          {document.statutoryRetentionTable && document.statutoryRetentionTable.visible && (
            <StatutoryRetentionTable
              table={{
                visible: document.statutoryRetentionTable.visible,
                headers: {
                  record: document.statutoryRetentionTable.headers.record,
                  period: document.statutoryRetentionTable.headers.period,
                  basis: document.statutoryRetentionTable.headers.basis,
                },
                rows: document.statutoryRetentionTable.rows,
              }}
              company={company}
              effectiveDate={document.effectiveDate}
            />
          )}

          {document.thirdPartyProvision && document.thirdPartyProvision.visible && (
            <ThirdPartyProvision
              section={{
                visible: document.thirdPartyProvision.visible,
                title: document.thirdPartyProvision.title,
                introduction: document.thirdPartyProvision.introduction,
                headers: {
                  category: document.thirdPartyProvision.headers.category,
                  content: document.thirdPartyProvision.headers.content,
                },
                rows: document.thirdPartyProvision.rows,
                refusalTitle: document.thirdPartyProvision.refusalTitle,
                refusalBody: document.thirdPartyProvision.refusalBody,
              }}
              company={company}
              effectiveDate={document.effectiveDate}
            />
          )}

          {document.outsourcing && document.outsourcing.visible && (
            <OutsourcingSection
              section={{
                visible: document.outsourcing.visible,
                title: document.outsourcing.title,
                introduction: document.outsourcing.introduction,
                headers: {
                  trustee: document.outsourcing.headers.trustee,
                  work: document.outsourcing.headers.work,
                  period: document.outsourcing.headers.period,
                },
                rows: document.outsourcing.rows,
                footerNote: document.outsourcing.footerNote,
              }}
              company={company}
              effectiveDate={document.effectiveDate}
            />
          )}

          <div className="mt-10 space-y-10">
            {document.articles.filter((article) => article.visible).map((article, index) => (
              <section key={`${article.title}-${index}`}>
                <h2 className="text-balance text-lg font-bold text-[#202521]">{article.title}</h2>
                <div className="mt-3 break-keep text-sm leading-7 text-[#4A514A]">
                  <LegalBody body={article.body} company={company} effectiveDate={document.effectiveDate} />
                </div>
              </section>
            ))}
          </div>

          {document.securityMeasuresTable && document.securityMeasuresTable.visible && (
            <TwoColumnTableSection
              section={{
                title: document.securityMeasuresTable.title,
                introduction: document.securityMeasuresTable.introduction,
                headers: {
                  category: document.securityMeasuresTable.headers.category,
                  content: document.securityMeasuresTable.headers.measure,
                },
                rows: document.securityMeasuresTable.rows.map((row) => ({
                  category: row.category,
                  content: row.measure,
                  visible: row.visible,
                })),
              }}
              company={company}
              effectiveDate={document.effectiveDate}
            />
          )}

          {document.privacyContactTable && document.privacyContactTable.visible && (
            <TwoColumnTableSection
              section={{
                title: document.privacyContactTable.title,
                introduction: document.privacyContactTable.introduction,
                headers: {
                  category: document.privacyContactTable.headers.category,
                  content: document.privacyContactTable.headers.content,
                },
                rows: document.privacyContactTable.rows,
                footerNote: document.privacyContactTable.footerNote,
              }}
              company={company}
              effectiveDate={document.effectiveDate}
            />
          )}

          {document.rightsReliefTable && document.rightsReliefTable.visible && (
            <RightsReliefTable
              table={{
                visible: document.rightsReliefTable.visible,
                title: document.rightsReliefTable.title,
                introduction: document.rightsReliefTable.introduction,
                headers: {
                  agency: document.rightsReliefTable.headers.agency,
                  phone: document.rightsReliefTable.headers.phone,
                  homepage: document.rightsReliefTable.headers.homepage,
                },
                rows: document.rightsReliefTable.rows,
              }}
            />
          )}

          {document.policyChanges && document.policyChanges.visible && (
            <PolicyChangesSection
              section={{
                visible: document.policyChanges.visible,
                title: document.policyChanges.title,
                items: document.policyChanges.items,
                effectiveDateLabel: document.policyChanges.effectiveDateLabel,
                effectiveDate: document.policyChanges.effectiveDate,
              }}
            />
          )}

          {document.companyBoxVisible && (
            <div className="mt-14 rounded-2xl border border-[#D8D6CE] bg-white/60 p-6 text-sm leading-7 text-[#4A514A]">
              <p className="font-semibold text-[#202521]">{document.companyBoxTitle}</p>
              <p className="mt-2">
                상호: {company.name} · 대표자: {company.ceo}<br />
                사업자등록번호: {company.businessNumber} · 통신판매업신고번호: {company.mailOrderNumber}<br />
                주소: {company.address}<br />
                고객센터: {company.tel} · {company.email}
              </p>
            </div>
          )}

          {document.footerNote && (
            <div className="mt-10 text-sm leading-7 text-[#6F766F]">
              <LegalBody body={document.footerNote} company={company} effectiveDate={document.effectiveDate} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
