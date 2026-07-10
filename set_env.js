const { execSync } = require('child_process');
try {
  console.log("Setting NEXT_PUBLIC_SUPABASE_URL...");
  execSync('npx vercel env add NEXT_PUBLIC_SUPABASE_URL production', { input: 'https://ctxylyimdavxwpzepbqh.supabase.co', stdio: ['pipe', 'inherit', 'inherit'] });
  console.log("Setting NEXT_PUBLIC_SUPABASE_ANON_KEY...");
  execSync('npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production', { input: 'sb_publishable_MnX6DG_YWasTcFAvtv487Q_kqUk6JUn', stdio: ['pipe', 'inherit', 'inherit'] });
  console.log("Done adding env vars. Triggering redeploy...");
  execSync('npx vercel --prod --yes', { stdio: 'inherit' });
} catch (e) {
  console.error(e);
}
