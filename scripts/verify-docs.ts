#!/usr/bin/env tsx
/**
 * Docs verifier — local markdown links + stale path/string heuristics.
 *
 * Exit 0: PASS (archive / intentional warnings allowed).
 * Exit 1: FAIL (broken live links / live refs to deleted paths).
 *
 * Warning classes printed as:
 *   FAIL              — must fix (canonical)
 *   WARN [CANONICAL]  — unexpected in live docs (review)
 *   WARN [ARCHIVE]    — broken links inside docs/archive only
 *   WARN [INTENTIONAL]— known stale strings documenting removals
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ROOT_FILES = ["AGENTS.md", "CLAUDE.md", "README.md", "MASTER_ENGINEERING_ROADMAP.md"];

/** Old live paths that must not appear outside archive (use Core/* or archive/* instead). */
const DELETED_LIVE_PATHS = [
  "docs/ARCHITECTURE.md",
  "docs/AI_PIPELINE.md",
  "docs/VOICE.md",
  "docs/PAYMENTS.md",
  "docs/SEO.md",
  "docs/SEO-INFRASTRUCTURE.md",
  "docs/FLAGS.md",
  "docs/AI_BOUNDARIES.md",
  "docs/OBSERVABILITY_EXECUTION_PLAN.md",
  "docs/OBSERVABILITY_RFCS.md",
  "docs/CI_CD_ARCHITECTURE.md",
  "docs/RELEASE_STRATEGY.md",
  "docs/MIGRATION_NAMESPACE.md",
  "docs/QUALITY_GATES.md",
  "docs/OBSERVABILITY.md",
  "docs/ENGINEERING_PLATFORM.md",
  "PAYMENT_ARCHITECTURE.md",
  "DEAD_CODE_REPORT.md",
  "TECH_DEBT.md",
  "REPOSITORY_CONFIDENCE_PROGRAM.md",
  "PRE_DEPLOY_SEO_CHECKLIST.md",
];

const STALE_STRINGS = ["src/lib/mistral/", "PostHog", "Zustand"];

type WarnKind = "ARCHIVE" | "CANONICAL" | "INTENTIONAL";
type Finding =
  | { level: "FAIL"; file: string; message: string }
  | { level: "WARN"; kind: WarnKind; file: string; message: string };

const findings: Finding[] = [];

function isArchive(rel: string): boolean {
  const n = rel.replace(/\\/g, "/");
  return n.includes("/archive/") || n.startsWith("docs/archive/");
}

function walkMd(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkMd(p, out);
    else if (ent.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function collectFiles(): string[] {
  const files = walkMd(path.join(ROOT, "docs"));
  for (const f of ROOT_FILES) {
    const abs = path.join(ROOT, f);
    if (fs.existsSync(abs)) files.push(abs);
  }
  return files;
}

function relPosix(abs: string): string {
  return path.relative(ROOT, abs).split(path.sep).join("/");
}

function extractLocalLinks(content: string): { href: string }[] {
  const re = /\[[^\]]*]\(([^)]+)\)/g;
  const out: { href: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    let href = m[1].trim();
    const sp = href.match(/^(\S+)\s+"/);
    if (sp) href = sp[1];
    if (!href || href.startsWith("#")) continue;
    if (/^(https?:|mailto:|tel:)/i.test(href)) continue;
    out.push({ href });
  }
  return out;
}

function resolveLink(fromFile: string, href: string): string | null {
  const clean = href.split("#")[0].split("?")[0];
  if (!clean) return null;
  return path.normalize(path.join(path.dirname(fromFile), clean));
}

function checkLinks(abs: string, content: string) {
  const rel = relPosix(abs);
  const archive = isArchive(rel);
  for (const { href } of extractLocalLinks(content)) {
    const target = resolveLink(abs, href);
    if (!target) continue;
    if (!target.startsWith(ROOT)) continue;
    if (!fs.existsSync(target)) {
      if (archive) {
        findings.push({
          level: "WARN",
          kind: "ARCHIVE",
          file: rel,
          message: `broken link → ${href}`,
        });
      } else {
        findings.push({
          level: "FAIL",
          file: rel,
          message: `broken link → ${href}`,
        });
      }
    }
  }
}

function checkDeletedPathRefs(abs: string, content: string) {
  const rel = relPosix(abs);
  if (isArchive(rel)) return;
  for (const dead of DELETED_LIVE_PATHS) {
    if (!content.includes(dead)) continue;
    const re = new RegExp(dead.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) {
      const start = Math.max(0, m.index - 48);
      const window = content.slice(start, m.index + dead.length + 16);
      if (window.includes("archive/")) continue;
      findings.push({
        level: "FAIL",
        file: rel,
        message: `references deleted live path \`${dead}\` (use Core/Guidelines/Operations or archive/pre-governance-*)`,
      });
      break;
    }
  }
}

function checkStaleStrings(abs: string, content: string) {
  const rel = relPosix(abs);
  if (isArchive(rel)) return;
  for (const s of STALE_STRINGS) {
    if (!content.includes(s)) continue;
    // Intentional when documenting removal / archive disclaimer.
    const intentional =
      /removed|deleted|ignore|not a live|archive|do not use|Invariant #9|formerly/i.test(
        content.slice(Math.max(0, content.indexOf(s) - 80), content.indexOf(s) + s.length + 80),
      );
    findings.push({
      level: "WARN",
      kind: intentional ? "INTENTIONAL" : "CANONICAL",
      file: rel,
      message: `stale string \`${s}\``,
    });
  }
}

function main() {
  const files = collectFiles();
  for (const abs of files) {
    const content = fs.readFileSync(abs, "utf8");
    checkLinks(abs, content);
    checkDeletedPathRefs(abs, content);
    checkStaleStrings(abs, content);
  }

  const fails = findings.filter((f) => f.level === "FAIL");
  const warns = findings.filter((f): f is Extract<Finding, { level: "WARN" }> => f.level === "WARN");
  const byKind = {
    ARCHIVE: warns.filter((w) => w.kind === "ARCHIVE").length,
    CANONICAL: warns.filter((w) => w.kind === "CANONICAL").length,
    INTENTIONAL: warns.filter((w) => w.kind === "INTENTIONAL").length,
  };

  for (const f of fails) {
    console.log(`FAIL  ${f.file}: ${f.message}`);
  }
  for (const f of warns) {
    console.log(`WARN [${f.kind}]  ${f.file}: ${f.message}`);
  }

  console.log("");
  console.log(
    `verify-docs: ${fails.length} FAIL, ${warns.length} WARN (archive=${byKind.ARCHIVE}, intentional=${byKind.INTENTIONAL}, canonical=${byKind.CANONICAL}), scanned ${files.length} files`,
  );

  if (fails.length > 0) {
    process.exit(1);
  }
  if (byKind.CANONICAL > 0) {
    console.log("PASS WITH CANONICAL WARNINGS — review WARN [CANONICAL] above");
  } else {
    console.log("PASS");
  }
  process.exit(0);
}

main();
