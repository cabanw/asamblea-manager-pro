import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ihqakomnxfnpggaqmyst.supabase.co';
const supabaseKey = 'sb_publishable_q5S3IRLrQZj8k2eLcTghoA_ucaQt9y_';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('assembly_registration_links').select('*').limit(1);
  if (error) {
    console.log('QUERY ERROR:', error.code, error.message);
  } else {
    console.log('TABLE EXISTS:', data);
  }
}
check();
