export default async (req, context) => {
  return new Response(
    JSON.stringify({
      supabaseUrl: Netlify.env.get("SUPABASE_URL"),
      supabaseAnonKey: Netlify.env.get("SUPABASE_ANON_KEY"),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};

export const config = {
  path: "/api/config",
};
