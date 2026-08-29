
/* eslint-disable @typescript-eslint/no-require-imports -- standalone one-off Node maintenance script */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('site_settings').select('value').eq('id', 'home').single().then(({data}: { data: { value?: { audit?: { badge?: string } } } | null }) => {
  if (data && data.value && data.value.audit) {
    data.value.audit.badge = 'BAEKJO OBJET AUDIT';
    supabase.from('site_settings').update({ value: data.value }).eq('id', 'home').then(() => console.log('Updated DB'));
  } else {
    console.log('No data found');
  }
});
