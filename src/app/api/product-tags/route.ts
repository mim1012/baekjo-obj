import { NextResponse } from 'next/server';
import { getPublicProductTagsConfig } from '@/lib/productTags/repo';

export async function GET() {
  const config = await getPublicProductTagsConfig();
  return NextResponse.json(config, { status: 200 });
}
