import { NextResponse } from "next/server";
import { ensureAdminAccount } from "@/lib/server/data";
import { errorResponse } from "@/lib/server/db";
import { readSession } from "@/lib/server/session";

export async function GET() {
  try {
    await ensureAdminAccount();
    const user = await readSession();
    if (!user) return errorResponse("Non connecté.", 401);
    return NextResponse.json({ user });
  } catch (error) {
    console.error("[me]", error);
    return errorResponse("Erreur serveur.", 500);
  }
}
