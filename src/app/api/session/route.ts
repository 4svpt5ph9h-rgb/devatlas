import { authorize, errorResponse, json } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try { return json({ user: await authorize(request) }); }
  catch (error) { return errorResponse(error); }
}
