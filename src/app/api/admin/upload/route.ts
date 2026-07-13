import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { getSupabase } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

function getExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return `.${ext}`;
}

export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.ok) return adminCheck.response;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const domain = formData.get('domain') as string;
    const usage = formData.get('usage') as string;
    const entityId = formData.get('entityId') as string | null;
    const draftId = formData.get('draftId') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!domain || !usage) return NextResponse.json({ error: 'Domain and usage are required' }, { status: 400 });
    if (!entityId && !draftId) return NextResponse.json({ error: 'Either entityId or draftId must be provided' }, { status: 400 });

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File is too large (max 8MB)' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid MIME type. Only JPEG, PNG, WEBP are allowed.' }, { status: 400 });
    }

    const ext = getExtension(file.name);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: 'Invalid file extension.' }, { status: 400 });
    }

    // Determine storage path
    let storagePath = '';
    const fileUuid = randomUUID();
    const fileName = `${fileUuid}${ext}`;
    
    // Check for malicious paths
    if ((entityId && (entityId.includes('/') || entityId.includes('\\'))) ||
        (draftId && (draftId.includes('/') || draftId.includes('\\')))) {
      return NextResponse.json({ error: 'Invalid identifier' }, { status: 400 });
    }

    // Path mapping
    if (!entityId && draftId) {
      // Use temporary path for drafts
      // get session user id from requireAdmin result (assuming it returns session if we need it)
      // Since requireAdmin does not return the session directly, let's fetch it or just parse the admin check. 
      const adminId = adminCheck.requester.id;
      
      if (!adminId || !/^[a-zA-Z0-9_-]+$/.test(adminId)) {
         return NextResponse.json({ error: 'Invalid admin ID format' }, { status: 401 });
      }
      
      storagePath = `temp/${adminId}/${draftId}/${usage}/${fileName}`;
    } else if (entityId) {
      // Permanent paths
      if (domain === 'product') {
        if (!['main', 'gallery', 'detail'].includes(usage)) {
          return NextResponse.json({ error: 'Invalid usage for product' }, { status: 400 });
        }
        storagePath = `products/${entityId}/${usage}/${fileName}`;
      } else if (domain === 'brand') {
        if (!['logo', 'cover'].includes(usage)) {
          return NextResponse.json({ error: 'Invalid usage for brand' }, { status: 400 });
        }
        storagePath = `brands/${entityId}/${usage}/${fileName}`;
      } else if (domain === 'banner') {
        if (usage !== 'hero') {
          return NextResponse.json({ error: 'Invalid usage for banner' }, { status: 400 });
        }
        storagePath = `banners/${usage}/${fileName}`;
      } else {
        return NextResponse.json({ error: 'Invalid domain' }, { status: 400 });
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const supabase = getSupabase();
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('catalog-assets')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from('catalog-assets')
      .getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      path: storagePath,
      publicUrl: urlData.publicUrl,
      bucket: 'catalog-assets'
    });

  } catch (err: any) {
    console.error('Upload route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.ok) return adminCheck.response;

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    if (path.includes('../') || path.includes('..\\')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const supabase = getSupabase();
    const adminId = adminCheck.requester.id;

    // Only allow actual deletion if it's in the current admin's temp folder
    if (path.startsWith(`temp/${adminId}/`)) {
      const { error } = await supabase.storage
        .from('catalog-assets')
        .remove([path]);

      if (error) {
        console.error('Supabase delete error:', error);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        deleted: true,
        reason: 'temporary-file-deleted'
      });
    }

    // For permanent files (products, brands, etc.), do not delete the physical file right now
    // Only return success to decouple the DB reference
    return NextResponse.json({
      success: true,
      deleted: false,
      reason: 'permanent-file-preserved'
    });

  } catch (err: any) {
    console.error('Delete route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
