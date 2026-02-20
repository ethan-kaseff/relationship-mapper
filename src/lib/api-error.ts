import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function unauthorized(message = "Authentication required") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "You do not have permission to access this resource") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function badRequest(message = "Invalid request") {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Resource not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function conflict(message = "Resource already exists") {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function serverError(message = "Internal server error") {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function handleApiError(error: unknown) {
  console.error("API Error:", error);

  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  return serverError();
}
