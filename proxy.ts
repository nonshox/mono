import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // If the project is not configured, let the page render anyway.
  // API route handlers still enforce their own session check, so this
  // degrades to a password-free page instead of an infinite redirect loop
  // that bricks the deploy.
  const projectId = process.env.APPWRITE_PROJECT_ID;
  if (!projectId) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(`a_session_${projectId}`);
  if (sessionCookie?.value) {
    return NextResponse.next();
  }

  // Preserve where the user was heading so /auth can bounce them back later.
  const pathname = request.nextUrl.pathname;
  const url = new URL("/auth", request.url);
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/",
    "/settings",
    "/profile",
    "/profile/:path*",
    "/journal",
    "/brain",
  ],
};
