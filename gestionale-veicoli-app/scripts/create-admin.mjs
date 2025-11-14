import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error(
    '❌ SUPABASE_URL non impostata. Inseriscila in .env (es. SUPABASE_URL=https://...supabase.co)'
  );
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error(
    '❌ SUPABASE_SERVICE_ROLE_KEY non impostata. Aggiungi la chiave service role al file .env.'
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const options = {};

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith('--')) {
      options[key] = next;
      i += 1;
    } else {
      options[key] = true;
    }
  }
}

const username = (options.username || 'scozzarini').trim().toLowerCase();
const password = options.password || 'ChangeMeSubito!';
const displayName = options.displayName || 'Scozzarini';
const email = username.includes('@') ? username : `${username}@app.local`;

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log(`⚙️  Creo utente admin '${username}' (${email})...`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (error) {
    if (error.message?.includes('already registered')) {
      console.log('ℹ️  Utente già esistente, proseguo con l’aggiornamento del profilo.');
    } else {
      console.error('❌ Errore durante la creazione utente:', error);
      process.exit(1);
    }
  }

  const userId =
    data?.user?.id ??
    (await (async () => {
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers(
        {
          perPage: 1000,
        }
      );
      if (listError) {
        console.error('❌ Impossibile recuperare lista utenti:', listError);
        process.exit(1);
      }
      const match = listData?.users?.find((user) => user.email?.toLowerCase() === email);
      if (!match) {
        console.error('❌ Utente non trovato dopo la creazione.');
        process.exit(1);
      }
      return match.id;
    })());

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      username,
      display_name: displayName,
      role: 'admin',
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', userId);

  if (profileError) {
    console.error('❌ Errore aggiornando il profilo:', profileError);
    process.exit(1);
  }

  console.log('✅ Profilo aggiornato come admin.');
  console.log('👤 Dettagli credenziali:');
  console.log(`    • username: ${username}`);
  console.log(`    • email:    ${email}`);
  console.log(`    • password: ${password}`);
  console.log('Ricordati di far cambiare la password al primo accesso.');
}

main().catch((err) => {
  console.error('❌ Errore imprevisto:', err);
  process.exit(1);
});

