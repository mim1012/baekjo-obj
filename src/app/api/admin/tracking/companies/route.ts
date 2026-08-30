import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';

const SWEET_TRACKER_COMPANY_LIST_URL = 'https://info.sweettracker.co.kr/api/v1/companylist';

type CarrierCompany = { readonly code: string; readonly label: string };

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parseCompanies(body: unknown): CarrierCompany[] {
  if (!body || typeof body !== 'object') return [];
  const source = body as Record<string, unknown>;
  const candidates = [body, source.Company, source.company, source.companies, source.data];
  const list = candidates.find(Array.isArray);
  if (!Array.isArray(list)) return [];

  return list.flatMap((item): CarrierCompany[] => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    const code = readString(row.Code) ?? readString(row.code) ?? readString(row.t_code);
    const label = readString(row.Name) ?? readString(row.name) ?? readString(row.companyName);
    return code && label ? [{ code, label }] : [];
  });
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const apiKey = process.env.SWEETTRACKER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'tracking-api-key-not-configured' }, { status: 503 });
  }

  try {
    const response = await fetch(
      `${SWEET_TRACKER_COMPANY_LIST_URL}?t_key=${encodeURIComponent(apiKey)}`,
      { cache: 'no-store' },
    );
    if (!response.ok) {
      return NextResponse.json({ error: 'tracking-company-list-failed' }, { status: 502 });
    }

    const companies = parseCompanies(await response.json());
    return NextResponse.json({ companies });
  } catch {
    return NextResponse.json({ error: 'tracking-company-list-failed' }, { status: 502 });
  }
}
