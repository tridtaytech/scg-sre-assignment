import os from "node:os";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    version: process.env.NEXT_PUBLIC_APP_VERSION || "dev",
    pod: process.env.POD_NAME || os.hostname(),
    color: process.env.ROLLOUT_COLOR || "none",
  });
}
