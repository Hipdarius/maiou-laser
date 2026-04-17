import { createBrowserClient } from "@supabase/ssr";
import { supabaseUrl, supabaseKey } from "@/lib/supabase";

export const createClient = () =>
    createBrowserClient(
        supabaseUrl,
        supabaseKey,
    );
