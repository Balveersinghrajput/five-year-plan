import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");

    if (!year) {
        return NextResponse.json({ error: "year is required" }, { status: 400 });
    }

    try {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        const logs = await prisma.dayLog.findMany({
            where: {
                date: { gte: startDate, lte: endDate },
            },
            orderBy: { date: "asc" },
        });

        return NextResponse.json(logs);
    } catch (error) {
        console.error("GET /api/logs error:", error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { date, worked, hours, description, skills } = body;

        if (!date) {
            return NextResponse.json({ error: "date is required" }, { status: 400 });
        }

        const log = await prisma.dayLog.upsert({
            where: { date },
            create: {
                date,
                worked: worked ?? false,
                hours: hours ?? 0,
                description: description ?? "",
                skills: skills ?? [],
            },
            update: {
                worked: worked ?? false,
                hours: hours ?? 0,
                description: description ?? "",
                skills: skills ?? [],
            },
        });

        return NextResponse.json(log);
    } catch (error) {
        console.error("POST /api/logs error:", error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
}
