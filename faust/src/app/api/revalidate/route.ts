import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export const POST = async (request: Request) => {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "REVALIDATE_SECRET is not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const tag = url.searchParams.get("tag");

  if (!tag) {
    return NextResponse.json({ error: "Missing 'tag' query parameter" }, { status: 400 });
  }

  revalidateTag(tag, {});

  return NextResponse.json({ revalidated: true, tag, now: Date.now() });
};
