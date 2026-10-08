// Copies static assets into the standalone output, which Next doesn't do by itself.
// Plain Node (no sh/cp) so it works anywhere `next build` does. The Dockerfile relies on this.
import { cpSync, existsSync, mkdirSync } from "node:fs";

mkdirSync(".next/standalone/.next", { recursive: true });
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
if (existsSync("public")) cpSync("public", ".next/standalone/public", { recursive: true });
