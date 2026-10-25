export const dynamic = "force-dynamic";

// Masaüstü simgesi servisin ayakta olup olmadığını bununla kontrol eder.
export function GET() {
  return Response.json({ ok: true, uygulama: "ttn-kar" });
}
