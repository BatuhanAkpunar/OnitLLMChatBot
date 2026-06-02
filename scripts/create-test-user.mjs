// Create a confirmed dev test user for local sign-in (email/password).
// Run: node --env-file=.env.local scripts/create-test-user.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key, { auth: { persistSession: false } });

const email = process.env.TEST_EMAIL ?? "dev@onit.local";
const password = process.env.TEST_PASSWORD ?? "Devpassword1!";

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: "Dev Tester" },
});

if (error) {
  if (/already|exists|registered/i.test(error.message)) {
    console.log(`User ${email} already exists — ok.`);
  } else {
    console.error("Error:", error.message);
    process.exit(1);
  }
} else {
  console.log(`Created user ${email} (id ${data.user.id})`);
}
console.log(`Sign in with:  ${email}  /  ${password}`);
