// Punto de entrada de la función. La lógica está en lib.ts.
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as L from "./lib.ts";
const { CATS, procesar, hoyMadrid } = L;

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // La clave está en la tabla privada config_privada (no visible para la app ni para anónimos)
  const token = (await sb.from("config_privada").select("value").eq("key", "fvf_token").maybeSingle()).data?.value;
  if (!token || req.headers.get("x-fvf-token") !== token) return new Response("no autorizado", { status: 401 });
  const dry = u.searchParams.get("dry") === "1";
  const { fecha: hoy, hora } = hoyMadrid();
  if (u.searchParams.get("cron") === "1" && hora !== 16) return Response.json({ omitido: `En Madrid son las ${hora} h` });
  const claveFC = (await sb.from("config_privada").select("value").eq("key", "firecrawl_api_key").maybeSingle()).data?.value;
  L.reiniciar(claveFC);
  const cats = u.searchParams.get("cat") ? [u.searchParams.get("cat")!] : Object.keys(CATS);
  const informe: any = { fecha: new Date().toISOString(), hoy, ok: true, categorias: {} };
  const ligas: any = {};
  for (const cat of cats) {
    try {
      const r: any = await procesar(sb, cat, dry, hoy, u.searchParams.get("renombrar") === "1");
      informe.categorias[cat] = { fecha: informe.fecha, resumen: r.resumen, avisos: r.avisos };
      if (r.liga) ligas[cat] = r.liga;
      if (dry) informe.categorias[cat].detalle = r;
    } catch (e) {
      informe.ok = false;
      informe.categorias[cat] = { fecha: informe.fecha, error: String((e as any)?.message || e) };
    }
  }
  informe.paginasLeidas = L.paginasLeidas;
  if (!dry) {
    const now = new Date().toISOString();
    const prev = (await sb.from("team_data").select("value").eq("key", "competicion").maybeSingle()).data?.value || {};
    const comp = { ...prev, ...ligas, actualizado: hoy, fuente: "Federación Vizcaína de Fútbol" };
    const infPrev = (await sb.from("team_data").select("value").eq("key", "fvf:informe").maybeSingle()).data?.value || {};
    const infTotal = { ...informe, categorias: { ...(infPrev.categorias || {}), ...informe.categorias } };
    infTotal.ok = Object.values(infTotal.categorias).every((x: any) => !x.error);
    const ups: any[] = [{ key: "fvf:informe", value: infTotal, updated_at: now }];
    if (Object.keys(ligas).length) ups.push({ key: "competicion", value: comp, updated_at: now });
    const { error } = await sb.from("team_data").upsert(ups);
    if (error) informe.ok = false, informe.errorGuardar = error.message;
  }
  return Response.json(informe);
});
