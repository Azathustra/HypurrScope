import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const existingLocale = request.cookies.get("insider-locale")?.value;

  if (!existingLocale) {
    const country = request.headers.get("x-vercel-ip-country")?.toUpperCase();
    const acceptLanguage = request.headers.get("accept-language")?.toLowerCase() ?? "";
    const locale = country === "GB" || country === "UK" || acceptLanguage.startsWith("en") ? "en" : "fr";

    response.cookies.set("insider-locale", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax"
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/).*)"]
};
