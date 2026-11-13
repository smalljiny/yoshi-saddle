#!/usr/bin/env node

// validate-path.js — dev-context.json의 경로 필드를 읽어 검증·정규화 후 canonical 절대경로를 stdout에 출력.
// 사용법: node .harness/scripts/validate-path.js --topic=<topic> --field=<field>
// 성공: exit 0 + canonical 절대경로 출력
// 실패: exit 1 + 오류 메시지를 stderr에 출력

import { execSync, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

function main() {
  const { topic, field } = parseArgs(process.argv.slice(2));

  if (!topic || !field) {
    process.stderr.write('Usage: node validate-path.js --topic=<topic> --field=<field>\n');
    process.exit(1);
  }

  // shell injection 방지: topic/field는 영문자·숫자·일부 기호만 허용
  if (!/^[a-zA-Z0-9_-]+$/.test(topic)) {
    process.stderr.write(`Invalid topic: ${topic}\n`);
    process.exit(1);
  }
  if (!/^[a-zA-Z0-9_.]+$/.test(field)) {
    process.stderr.write(`Invalid field: ${field}\n`);
    process.exit(1);
  }

  const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  const devContextScript = path.join(__dirname, 'dev-context.js');

  let rawPath;
  try {
    rawPath = execFileSync(
      'node',
      [devContextScript, 'read', `--topic=${topic}`, `--field=${field}`],
      { encoding: 'utf8', cwd: repoRoot }
    ).trim();
  } catch (err) {
    process.stderr.write(`Failed to read path (topic=${topic} field=${field}): ${err.message}\n`);
    process.exit(1);
  }

  if (!rawPath) {
    process.stderr.write(`Empty path: topic=${topic} field=${field}\n`);
    process.exit(1);
  }

  const result = resolveSafePath(repoRoot, rawPath);
  if (!result.ok) {
    process.stderr.write(`${result.reason}\n`);
    process.exit(1);
  }

  process.stdout.write(result.path + '\n');
}

// 경로 검증·정규화. 성공: { ok: true, path }, 실패: { ok: false, reason } (reason은 CLI stderr 메시지 그대로).
export function resolveSafePath(repoRoot, rawPath) {
  // 절대경로·leading dash·경로 탐색·제어 문자·쉘 메타문자 거부
  if (/^\//.test(rawPath) || /^-/.test(rawPath) || /\.\./.test(rawPath) || /[\x00-\x1f]/.test(rawPath)) {
    return { ok: false, reason: `UNSAFE path rejected: ${rawPath}` };
  }
  if (/[^a-zA-Z0-9_.\/\-]/.test(rawPath)) {
    return { ok: false, reason: `UNSAFE path chars rejected: ${rawPath}` };
  }

  // Windows에서 git은 'C:/...', Node는 'C:\...'를 돌려준다. 루트를 realpath로 같은 형식에
  // 맞춘 뒤 비교해야 저장소 안 경로가 거부되지 않는다 (POSIX에서는 symlink 루트도 정규화됨).
  let root;
  try {
    root = fs.realpathSync(repoRoot);
  } catch {
    return { ok: false, reason: `Repo root not found: ${repoRoot}` };
  }
  const fullPath = path.join(root, rawPath);

  let canonPath;
  try {
    canonPath = fs.realpathSync(fullPath);
  } catch {
    // 파일이 아직 생성 전일 수 있음 (pre-creation 검증); path.resolve로 폴백
    canonPath = path.resolve(fullPath);
  }

  if (!canonPath.startsWith(root + path.sep) && canonPath !== root) {
    return { ok: false, reason: `Path escapes repo root: ${rawPath}` };
  }
  return { ok: true, path: canonPath };
}

// 직접 실행될 때만 main()을 호출한다 (테스트의 import 시 실행 방지).
// import.meta.url 은 실제 경로로 해석되지만 argv[1] 은 입력한 경로 그대로라, symlink·junction
// 을 거쳐 실행하면 문자열 비교가 어긋나 main()이 조용히 건너뛰어진다. 양쪽을 realpath로 맞춘다.
function isEntryPoint() {
  if (!process.argv[1]) return false;
  try {
    return fs.realpathSync.native(process.argv[1]) === fs.realpathSync.native(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  main();
}
