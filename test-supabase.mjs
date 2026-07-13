const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

async function test() {
  const res = await fetch(`${url}/rest/v1/products?select=id&limit=1`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text);
}

test().catch(console.error);
