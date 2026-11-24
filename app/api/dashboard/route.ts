import { NextResponse } from "next/server";
import { computeStats, ensureAdminAccount, getCategories, getMembers, getSettings } from "@/lib/server/data";
import { errorResponse } from "@/lib/server/db";
import { readSession } from "@/lib/server/session";

export async function GET() {
  try {
    await ensureAdminAccount();
    const user = await readSession();
    if (!user) return errorResponse("Non connecté.", 401);

    const [settings, categories, allMembers] = await Promise.all([
      getSettings(),
      getCategories(),
      getMembers(),
    ]);

    const isAdmin = user.role === "admin";
    // Un acompte ne compte pas comme payé : il reste dans la liste des restants.
    const paid = allMembers.filter((m) => m.status === "paid");
    const remaining = allMembers.filter((m) => m.status !== "paid");

    return NextResponse.json({
      user,
      settings,
      categories,
      stats: computeStats(allMembers),
      paid,
      remaining: isAdmin || settings.showRemainingToMembers ? remaining : [],
      members: isAdmin ? allMembers : [],
    });
  } catch (error) {
    console.error("[dashboard]", error);
    return errorResponse(error instanceof Error ? error.message : "Erreur serveur.", 500);
  }
}
