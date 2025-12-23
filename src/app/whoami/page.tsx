import { supabaseServer } from "@/lib/supabase/server";

export default async function WhoAmI() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <pre className="p-6">{JSON.stringify({ user }, null, 2)}</pre>;
}
