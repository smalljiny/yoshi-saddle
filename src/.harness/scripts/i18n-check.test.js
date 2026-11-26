// i18n-check.test.js — 메시지 카탈로그·참조 토큰 검사기 fixture 테스트
// 각 테스트는 임시 루트에 fixture 트리를 만들고 CLI를 --root로 실행해 exit 코드와 stderr 진단을 단언한다.
import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'i18n-check.js')
const DIAG_RE =
  /^[^: ][^:]*:[0-9]+: (orphan-file|missing-catalog|id-mismatch|format|placeholder-mismatch|malformed-ref|unresolved-ref|unused-id|residual|stale-allow): .+$/

const SKILL = '.claude/skills/demo/SKILL.md'
const SKILL_EN = '.claude/skills/demo/templates/messages.en.md'
const SKILL_KO = '.claude/skills/demo/templates/messages.ko.md'
const COMMON_EN = '.harness/i18n/en/common.md'
const COMMON_KO = '.harness/i18n/ko/common.md'

let root

function write(rel, content) {
  const abs = join(root, rel)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, content, 'utf8')
}

function tree(files) {
  for (const [rel, content] of Object.entries(files)) write(rel, content)
}

// 카탈로그 본문 생성: { ID: value } → `## ID` + 코드 블록
function catalog(entries) {
  return Object.entries(entries)
    .map(([id, value]) => `## ${id}\n\n\`\`\`text\n${value}\n\`\`\`\n`)
    .join('\n')
}

// 같은 ID 집합의 ko·en 카탈로그 쌍
function pair(enPath, koPath, entries, koEntries = entries) {
  return { [enPath]: catalog(entries), [koPath]: catalog(koEntries) }
}

function run(args = [`--root=${root}`]) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' })
  const lines = r.stderr.split('\n').filter(Boolean)
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, lines }
}

function kinds(result) {
  return result.lines.map((l) => l.match(DIAG_RE)?.[1] ?? `UNPARSED:${l}`)
}

function expectOnly(result, kind, count) {
  assert.equal(result.status, 1, result.stderr)
  assert.deepEqual(kinds(result), Array(count).fill(kind), result.stderr)
}

function expectClean(result) {
  assert.equal(result.stderr, '', result.stderr)
  assert.equal(result.status, 0)
  assert.match(result.stdout, /i18n-check: OK/)
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'i18n-check-test-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('orphan-file', () => {
  test('en 카탈로그만 있으면 orphan-file 1건', () => {
    tree({ [SKILL]: 'Say {{msg:HELLO}}.\n', [SKILL_EN]: catalog({ HELLO: 'Hello' }) })
    const r = run()
    expectOnly(r, 'orphan-file', 1)
    assert.match(r.lines[0], /^\.claude\/skills\/demo\/templates\/messages\.en\.md:0: orphan-file: /)
  })

  test('공통 카탈로그도 ko만 있으면 orphan-file', () => {
    tree({ [COMMON_KO]: catalog({ X: '엑스' }) })
    const r = run()
    assert.ok(kinds(r).includes('orphan-file'), r.stderr)
  })
})

describe('missing-catalog', () => {
  test('자기 메시지 토큰이 있는데 자기 카탈로그가 없으면 missing-catalog 1건', () => {
    tree({ [SKILL]: 'Say {{msg:HELLO}} and {{msg:BYE}}.\n' })
    const r = run()
    expectOnly(r, 'missing-catalog', 1)
    assert.match(r.lines[0], /^\.claude\/skills\/demo\/SKILL\.md:0: missing-catalog: /)
  })
})

describe('id-mismatch', () => {
  test('ko에 ID가 하나 더 있으면 id-mismatch 1건', () => {
    tree({
      [SKILL]: '{{msg:HELLO}}\n',
      ...pair(SKILL_EN, SKILL_KO, { HELLO: 'Hello' }, { HELLO: '안녕', EXTRA: '추가' }),
    })
    const r = run()
    expectOnly(r, 'id-mismatch', 1)
    assert.match(r.lines[0], /^\.claude\/skills\/demo\/templates\/messages\.ko\.md:\d+: id-mismatch: .*EXTRA/)
  })
})

describe('format', () => {
  function formatCase(text) {
    tree({ [SKILL]: '{{msg:HELLO}}\n', [SKILL_EN]: text, [SKILL_KO]: text })
    return run()
  }

  test('ID 중복', () => {
    const r = formatCase(catalog({ HELLO: 'a' }) + '\n' + catalog({ HELLO: 'b' }))
    expectOnly(r, 'format', 2)
    assert.match(r.stderr, /duplicate/)
  })

  test('ID 형식 위반 ([A-Z][A-Z0-9_]*)', () => {
    const r = formatCase(catalog({ HELLO: 'a' }) + '\n## bad_id\n\n```text\nx\n```\n')
    expectOnly(r, 'format', 2)
    assert.match(r.stderr, /bad_id/)
  })

  test('섹션 코드 블록 0개', () => {
    const r = formatCase('## HELLO\n\n')
    expectOnly(r, 'format', 2)
  })

  test('섹션 코드 블록 2개', () => {
    const r = formatCase('## HELLO\n\n```text\na\n```\n\n```text\nb\n```\n')
    expectOnly(r, 'format', 2)
  })

  test('섹션 밖 내용 (첫 제목 앞 문단)', () => {
    const r = formatCase('intro text\n\n' + catalog({ HELLO: 'a' }))
    expectOnly(r, 'format', 2)
  })

  test('섹션 안 코드 블록 밖 문단', () => {
    const r = formatCase('## HELLO\n\nnote\n\n```text\na\n```\n')
    expectOnly(r, 'format', 2)
  })

  test('en _HEADER 13자는 위반, ko 12자는 통과', () => {
    tree({
      [SKILL]: '{{ask:PICK|*}}\n',
      ...pair(
        SKILL_EN,
        SKILL_KO,
        { PICK_Q: 'Pick?', PICK_HEADER: 'ABCDEFGHIJKLM' },
        { PICK_Q: '고르세요', PICK_HEADER: '가나다라마바사아자차카타' },
      ),
    })
    const r = run()
    expectOnly(r, 'format', 1)
    assert.match(r.lines[0], /messages\.en\.md:\d+: format: .*PICK_HEADER/)
  })

  test('ko _HEADER 13자(코드 포인트 기준)는 위반', () => {
    tree({
      [SKILL]: '{{ask:PICK|*}}\n',
      ...pair(
        SKILL_EN,
        SKILL_KO,
        { PICK_Q: 'Pick?', PICK_HEADER: 'Pick' },
        { PICK_Q: '고르세요', PICK_HEADER: '가나다라마바사아자차카타파' },
      ),
    })
    const r = run()
    expectOnly(r, 'format', 1)
    assert.match(r.lines[0], /messages\.ko\.md:\d+: format: .*PICK_HEADER/)
  })
})

describe('placeholder-mismatch', () => {
  test('ko {topic} / en {name}이면 placeholder-mismatch 1건', () => {
    tree({
      [SKILL]: '{{msg:HELLO}}\n',
      ...pair(SKILL_EN, SKILL_KO, { HELLO: 'Hello {name}' }, { HELLO: '안녕 {topic}' }),
    })
    expectOnly(run(), 'placeholder-mismatch', 1)
  })
})

describe('malformed-ref', () => {
  const ok = pair(SKILL_EN, SKILL_KO, { HELLO: 'Hello' })

  test('malformed: 소문자 ID {{msg:foo}}', () => {
    tree({ [SKILL]: 'x {{msg:foo}} y\n' })
    expectOnly(run(), 'malformed-ref', 1)
  })

  test('malformed: 옵션 1개 {{ask:Q|A}}', () => {
    tree({ [SKILL]: 'x {{ask:Q|A}} y\n' })
    expectOnly(run(), 'malformed-ref', 1)
  })

  test('malformed: 같은 줄에 닫힘 없음 {{msg:X', () => {
    tree({ [SKILL]: 'x {{msg:X\ny }}\n' })
    expectOnly(run(), 'malformed-ref', 1)
  })

  test('malformed: 알 수 없는 종류 {{note:X}}', () => {
    tree({ [SKILL]: 'x {{note:X}} y\n' })
    expectOnly(run(), 'malformed-ref', 1)
  })

  test('한 줄짜리 ```x``` 인라인 코드 뒤의 오기도 검사한다', () => {
    tree({ [SKILL]: '```js```\n{{msg:bad}}\n' })
    expectOnly(run(), 'malformed-ref', 1)
  })

  test('frontmatter 안 오기도 검사한다 (A8)', () => {
    tree({ [SKILL]: '---\ndescription: say {{msg:bad}}\n---\nbody\n' })
    expectOnly(run(), 'malformed-ref', 1)
  })

  test('malformed: 정상 토큰과 오기가 한 줄에 있으면 오기만 1건', () => {
    tree({ [SKILL]: 'Say {{msg:HELLO}} then {{msg:bad}}.\n', ...ok })
    const r = run()
    expectOnly(r, 'malformed-ref', 1)
    assert.match(r.lines[0], /^\.claude\/skills\/demo\/SKILL\.md:1: malformed-ref: /)
  })
})

describe('unresolved-ref', () => {
  test('en 카탈로그에 없는 msg ID', () => {
    tree({ [SKILL]: '{{msg:HELLO}} {{msg:NOPE}}\n', ...pair(SKILL_EN, SKILL_KO, { HELLO: 'Hello' }) })
    const r = run()
    expectOnly(r, 'unresolved-ref', 1)
    assert.match(r.lines[0], /NOPE/)
  })

  test('고정 선택지 ask의 옵션 _DESC 누락', () => {
    const entries = { Q1_Q: 'q', Q1_HEADER: 'h', Q1_A_LABEL: 'a', Q1_A_DESC: 'ad', Q1_B_LABEL: 'b' }
    tree({ [SKILL]: '{{ask:Q1|A|B}}\n', ...pair(SKILL_EN, SKILL_KO, entries) })
    const r = run()
    expectOnly(r, 'unresolved-ref', 1)
    assert.match(r.lines[0], /Q1_B_DESC/)
  })

  test('common: 토큰이 common.md에 없는 ID를 가리킴', () => {
    tree({
      [SKILL]: '{{msg:common:NOPE}}\n',
      '.claude/agents/a.md': '{{msg:common:SHARED}}\n',
      '.claude/commands/c.md': '{{msg:common:SHARED}}\n',
      ...pair(COMMON_EN, COMMON_KO, { SHARED: 's' }),
    })
    expectOnly(run(), 'unresolved-ref', 1)
  })
})

describe('unused-id', () => {
  test('어떤 토큰도 가리키지 않는 자기 카탈로그는 모든 ID가 unused-id', () => {
    tree({ [SKILL]: 'No tokens here.\n', ...pair(SKILL_EN, SKILL_KO, { A: 'a', B: 'b' }) })
    const r = run()
    expectOnly(r, 'unused-id', 2)
    assert.ok(r.lines.every((l) => l.startsWith(SKILL_EN)), r.stderr)
  })

  test('검사 범위 밖 컴포넌트의 카탈로그는 파일 단위 unused-id 1건', () => {
    tree({ ...pair('.claude/skills/stack-x/templates/messages.en.md', '.claude/skills/stack-x/templates/messages.ko.md', { A: 'a', B: 'b' }) })
    const r = run()
    expectOnly(r, 'unused-id', 1)
    assert.match(r.lines[0], /^\.claude\/skills\/stack-x\/templates\/messages\.en\.md:0: unused-id: /)
  })

  test('common.md가 없는데 common: 토큰을 쓰면 unresolved-ref', () => {
    tree({ [SKILL]: '{{msg:common:SHARED}}\n' })
    const r = run()
    expectOnly(r, 'unresolved-ref', 1)
    assert.match(r.lines[0], /common\.md missing/)
  })

  test('참조 컴포넌트가 1개뿐인 common ID는 unused-id', () => {
    tree({ [SKILL]: '{{msg:common:SHARED}}\n', ...pair(COMMON_EN, COMMON_KO, { SHARED: 's' }) })
    const r = run()
    expectOnly(r, 'unused-id', 1)
    assert.match(r.lines[0], /^\.harness\/i18n\/en\/common\.md:\d+: unused-id: .*SHARED/)
  })
})

describe('정상 fixture (위반 0, exit 0)', () => {
  test('정상: 인라인 코드·코드 블록 안 {{topic}}은 무시', () => {
    tree({ [SKILL]: 'Template `{{topic}}` here.\n\n```bash\necho {{topic}}\n```\n' })
    expectClean(run())
  })

  test('정상: 한 줄에 토큰 두 개', () => {
    tree({ [SKILL]: '{{msg:A}} and {{msg:B}}\n', ...pair(SKILL_EN, SKILL_KO, { A: 'a', B: 'b' }) })
    expectClean(run())
  })

  test('정상: {{ask:common:X|A|B}}', () => {
    const entries = { X_Q: 'q', X_HEADER: 'h', X_A_LABEL: 'a', X_A_DESC: 'ad', X_B_LABEL: 'b', X_B_DESC: 'bd' }
    tree({
      [SKILL]: '{{ask:common:X|A|B}}\n',
      '.claude/agents/a.md': '{{ask:common:X|A|B}}\n',
      ...pair(COMMON_EN, COMMON_KO, entries),
    })
    expectClean(run())
  })

  test('정상: {{ask:X|*}}는 _Q·_HEADER만 요구', () => {
    tree({ [SKILL]: '{{ask:X|*}}\n', ...pair(SKILL_EN, SKILL_KO, { X_Q: 'q', X_HEADER: 'h' }) })
    expectClean(run())
  })

  test('정상: common: 토큰만 있고 자기 카탈로그 없는 컴포넌트', () => {
    tree({
      [SKILL]: '{{msg:common:SHARED}}\n',
      '.claude/commands/harness/c.md': '{{msg:common:SHARED}}\n',
      ...pair(COMMON_EN, COMMON_KO, { SHARED: 's' }),
    })
    expectClean(run())
  })

  test('정상: SKILL.md와 references/*.md가 같은 카탈로그를 공유', () => {
    tree({
      [SKILL]: '{{msg:A}}\n',
      '.claude/skills/demo/references/more.md': '{{msg:B}}\n',
      ...pair(SKILL_EN, SKILL_KO, { A: 'a', B: 'b' }),
    })
    expectClean(run())
  })

  test('정상: 에이전트·커맨드·Codex 스킬 카탈로그 경로 매핑', () => {
    tree({
      '.claude/agents/planner.md': '{{msg:A}}\n',
      ...pair('.harness/i18n/en/agents/planner.md', '.harness/i18n/ko/agents/planner.md', { A: 'a' }),
      '.claude/commands/harness/audit.md': '{{msg:B}}\n',
      ...pair('.harness/i18n/en/commands/harness/audit.md', '.harness/i18n/ko/commands/harness/audit.md', {
        B: 'b',
      }),
      '.codex/skills/plan-review/SKILL.md': '{{msg:C}}\n',
      ...pair(
        '.codex/skills/plan-review/templates/messages.en.md',
        '.codex/skills/plan-review/templates/messages.ko.md',
        { C: 'c {name}' },
        { C: '씨 {name}' },
      ),
    })
    expectClean(run())
  })

  test('정상: ~~~·4중 백틱 펜스와 그 안의 짧은 펜스는 코드로 무시', () => {
    tree({ [SKILL]: '~~~\n{{msg:bad}}\n~~~\n\n````md\n```\n{{note:X}}\n```\n````\n' })
    expectClean(run())
  })

  test('정상: BOM·CRLF 카탈로그', () => {
    const text = '﻿## A\r\n\r\n```text\r\na\r\n```\r\n'
    tree({ [SKILL]: '{{msg:A}}\n', [SKILL_EN]: text, [SKILL_KO]: text })
    expectClean(run())
  })

  test('정상: stack-*·learned 스킬 본문은 검사 대상 밖', () => {
    tree({
      '.claude/skills/stack-x/SKILL.md': '{{msg:bad}}\n',
      '.claude/skills/learned/p.md': '{{note:X}}\n',
    })
    expectClean(run())
  })
})

const ALLOW = '.harness/i18n/residual-allow.json'

function allow(entries) {
  return { [ALLOW]: JSON.stringify(entries, null, 2) + '\n' }
}

function countKinds(result) {
  const counts = {}
  for (const k of kinds(result)) counts[k] = (counts[k] ?? 0) + 1
  return counts
}

describe('residual·stale-allow (스펙 §3.8 허용 목록 기준)', () => {
  // X3: 형식 토큰이 인라인 코드로 본문에 있다. 이전 중 문자열이 바뀌었다고 가정한다.
  const changedBody = 'Write `Acceptance: N/M eval 통과됨` at the end.\n'

  test('(1) 변경된 X3 문자열: 바뀐 문자열을 등록하면 residual 0·stale-allow 0', () => {
    tree({
      [SKILL]: changedBody,
      ...allow([{ file: SKILL, text: 'Acceptance: N/M eval 통과됨', reason: 'consumer-parsed format token' }]),
    })
    expectClean(run())
  })

  test('(1) 변경된 X3 문자열: 바뀌기 전 문자열을 등록하면 stale-allow 1·residual 1', () => {
    tree({
      [SKILL]: changedBody,
      ...allow([{ file: SKILL, text: 'Acceptance: N/M eval 통과', reason: 'consumer-parsed format token' }]),
    })
    const r = run()
    assert.equal(r.status, 1)
    assert.deepEqual(countKinds(r), { residual: 1, 'stale-allow': 1 }, r.stderr)
  })

  // X6: 새 후보로 찾은 매칭 데이터(큰따옴표 구간).
  const x6Body = 'Match the legacy heading "구현 계획" when parsing.\n'

  test('(2) 새 후보 X6 문자열: 새 문자열을 등록하면 residual 0·stale-allow 0', () => {
    tree({ [SKILL]: x6Body, ...allow([{ file: SKILL, text: '구현 계획', reason: 'parsed data token' }]) })
    expectClean(run())
  })

  test('(2) 새 후보 X6 문자열: 바뀌기 전 문자열을 등록하면 stale-allow 1·residual 1', () => {
    tree({ [SKILL]: x6Body, ...allow([{ file: SKILL, text: '구현계획', reason: 'parsed data token' }]) })
    const r = run()
    assert.equal(r.status, 1)
    assert.deepEqual(countKinds(r), { residual: 1, 'stale-allow': 1 }, r.stderr)
  })

  test('(3) 등록한 X4·X1과 미등록 메시지 코드 블록 줄이 한 파일에 있으면 residual 1건(메시지 줄)', () => {
    const body = [
      'Create the task with `subject="P1: Spec 문서 분석"`.',
      '',
      '```bash',
      '# 토픽 상태를 읽는다',
      'node dev-context.js read --field=phase',
      '```',
      '',
      '```',
      '구현을 시작할 수 없습니다.',
      '```',
      '',
    ].join('\n')
    tree({
      [SKILL]: body,
      ...allow([
        { file: SKILL, text: 'subject="P1: Spec 문서 분석"', reason: 'instructions-en: X4' },
        { file: SKILL, text: '# 토픽 상태를 읽는다', reason: 'instructions-en: X1' },
      ]),
    })
    const r = run()
    expectOnly(r, 'residual', 1)
    assert.match(r.lines[0], /^\.claude\/skills\/demo\/SKILL\.md:9: residual: 구현을 시작할 수 없습니다\.$/)
  })

  test('카탈로그 파일 안 한글은 residual이 아니다', () => {
    tree({ [SKILL]: '{{msg:A}}\n', ...pair(SKILL_EN, SKILL_KO, { A: 'a' }, { A: '"한글" `한글`' }) })
    expectClean(run())
  })

  test('허용 목록 항목의 file이 다른 파일이면 일치하지 않는다', () => {
    tree({
      [SKILL]: 'Show "한글 안내".\n',
      '.claude/agents/x.md': 'Agent body.\n',
      ...allow([{ file: '.claude/agents/x.md', text: '한글 안내', reason: 'instructions-en: X2' }]),
    })
    const r = run()
    assert.deepEqual(countKinds(r), { residual: 1, 'stale-allow': 1 }, r.stderr)
  })

  test('stale-allow 진단 줄에 항목의 file 값이 들어간다', () => {
    tree({ [SKILL]: 'English only.\n', ...allow([{ file: SKILL, text: '사라진 문구', reason: 'parsed data token' }]) })
    const r = run()
    expectOnly(r, 'stale-allow', 1)
    assert.match(r.lines[0], /^\.harness\/i18n\/residual-allow\.json:2: stale-allow: \.claude\/skills\/demo\/SKILL\.md 사라진 문구$/)
  })

  test('stack-* 본문의 한글은 검사 대상 밖', () => {
    tree({ '.claude/skills/stack-x/SKILL.md': '"한글"\n' })
    expectClean(run())
  })

  test('허용 목록 파일이 없으면 빈 목록으로 처리한다', () => {
    tree({ [SKILL]: 'English only.\n' })
    expectClean(run())
  })

  test('인라인 코드가 든 큰따옴표 구간은 원문 그대로 단위가 된다', () => {
    tree({ [SKILL]: 'Say "안내 `x` 끝" now.\n', ...allow([{ file: SKILL, text: '안내 `x` 끝', reason: 'parsed data token' }]) })
    expectClean(run())
  })

  test('짝이 맞지 않는 따옴표가 있는 줄은 줄 전체가 단위 (누락 방지)', () => {
    const r = (tree({ [SKILL]: 'Width 5" and "한글" here.\n' }), run())
    expectOnly(r, 'residual', 1)
    assert.match(r.lines[0], /residual: Width 5" and "한글" here\.$/)
  })

  test('둥근 큰따옴표와 들여쓴 코드 블록 줄(앞뒤 공백 제거)', () => {
    tree({
      [SKILL]: '- Show “둥근 안내”.\n\n  ```\n    들여쓴 메시지  \n  ```\n',
      ...allow([
        { file: SKILL, text: '둥근 안내', reason: 'parsed data token' },
        { file: SKILL, text: '들여쓴 메시지', reason: 'instructions-en: X1' },
      ]),
    })
    expectClean(run())
  })

  test('한글 없는 인라인 코드·큰따옴표는 residual이 아니다', () => {
    tree({ [SKILL]: 'Run `node x.js` and print "done".\n' })
    expectClean(run())
  })
})

describe('허용 목록 스키마 오류는 format 위반', () => {
  const cases = [
    ['배열 아님', '{"file": "x"}\n'],
    ['JSON 파싱 실패', '[{"file": }\n'],
    ['file 누락', JSON.stringify([{ text: 't', reason: 'r' }])],
    ['text 누락', JSON.stringify([{ file: SKILL, reason: 'r' }])],
    ['reason 누락', JSON.stringify([{ file: SKILL, text: 't' }])],
    ['빈 문자열', JSON.stringify([{ file: SKILL, text: '', reason: 'r' }])],
    ['객체 아님', JSON.stringify(['x'])],
  ]
  for (const [name, content] of cases) {
    test(name, () => {
      tree({ [SKILL]: 'English only.\n', [ALLOW]: content })
      const r = run()
      expectOnly(r, 'format', 1)
      assert.match(r.lines[0], /^\.harness\/i18n\/residual-allow\.json:\d+: format: /)
    })
  }
})

describe('허용 목록 진단 줄 번호', () => {
  const ok = (text) => ({ file: SKILL, text, reason: 'parsed data token' })

  test('세 번째 항목 스키마 오류는 그 항목의 시작 줄(12)', () => {
    tree({ [SKILL]: '"가" "나"\n', ...allow([ok('가'), ok('나'), { file: SKILL, text: '' , reason: 'r' }]) })
    const r = run()
    expectOnly(r, 'format', 1)
    assert.match(r.lines[0], /^\.harness\/i18n\/residual-allow\.json:12: format: /)
  })

  test('[와 같은 줄의 항목, 특수문자 든 문자열, CRLF·BOM', () => {
    const content = '﻿[{"file": "x[{,\\"", "text": "t", "reason": "r"},\r\n {"file": "' + SKILL + '", "text": "다", "reason": ""}]\r\n'
    tree({ [SKILL]: '"다"\n', [ALLOW]: content })
    const r = run()
    assert.deepEqual(kinds(r).sort(), ['format', 'residual', 'stale-allow'], r.stderr)
    assert.match(r.stderr, /residual-allow\.json:1: stale-allow: x\[\{,"/)
    assert.match(r.stderr, /residual-allow\.json:2: format: /)
  })

  test('중복 항목은 두 번째 항목 줄에 format', () => {
    tree({ [SKILL]: '"가"\n', ...allow([ok('가'), ok('가')]) })
    const r = run()
    expectOnly(r, 'format', 1)
    assert.match(r.lines[0], /^\.harness\/i18n\/residual-allow\.json:7: format: duplicate/)
  })

  test('JSON 파싱 실패는 파서가 알려준 줄', () => {
    tree({ [SKILL]: 'x\n', [ALLOW]: '[\n  {"file": "a",\n  }\n]\n' })
    const r = run()
    expectOnly(r, 'format', 1)
    assert.match(r.lines[0], /residual-allow\.json:[1-9]\d*: format: invalid JSON/)
  })
})

describe('진단 형식과 실행 오류', () => {
  test('위반 stderr의 모든 줄이 진단 형식이고 경로에 \\가 없다', () => {
    tree({
      [SKILL]: '{{msg:foo}} {{msg:NOPE}} {{msg:HELLO}}\n',
      '.claude/agents/x.md': '{{msg:Y}}\n',
      ...pair(SKILL_EN, SKILL_KO, { HELLO: 'Hello {a}', UNUSED: 'u' }, { HELLO: '안녕 {b}', UNUSED: 'u', MORE: 'm' }),
      [COMMON_EN]: catalog({ Z: 'z' }),
    })
    const r = run()
    assert.equal(r.status, 1)
    assert.ok(r.lines.length >= 6, r.stderr)
    for (const line of r.lines) {
      assert.match(line, DIAG_RE)
      assert.ok(!line.includes('\\'), line)
    }
  })

  test('존재하지 않는 --root는 exit 2와 원인 출력', () => {
    const r = run([`--root=${join(root, 'missing-dir')}`])
    assert.equal(r.status, 2)
    assert.match(r.stderr, /root/)
    assert.match(r.stderr, /missing-dir/)
  })

  test('대량 위반도 stderr가 잘리지 않는다 (파이프 출력)', () => {
    const count = 5000
    tree({ [SKILL]: Array.from({ length: count }, () => '{{msg:bad}}').join('\n') + '\n' })
    const r = run()
    assert.equal(r.status, 1)
    assert.equal(r.lines.length, count)
  })

  test('symlink를 거쳐 실행해도 검사를 수행한다', () => {
    tree({ [SKILL]: '{{msg:bad}}\n' })
    const link = join(root, 'bin', 'i18n-check.js')
    mkdirSync(dirname(link), { recursive: true })
    symlinkSync(SCRIPT, link)
    const r = spawnSync(process.execPath, [link, `--root=${root}`], { encoding: 'utf8' })
    assert.equal(r.status, 1, r.stderr)
    assert.match(r.stderr, /malformed-ref/)
  })

  test('알 수 없는 인자는 exit 2', () => {
    const r = run(['--bogus'])
    assert.equal(r.status, 2)
    assert.match(r.stderr, /Usage/)
  })
})
