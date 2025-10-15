import { NextRequest } from "next/server"
import { getCSRFToken } from "@/lib/csrf"

export async function GET(request: NextRequest) {
  return await getCSRFToken(request)
}