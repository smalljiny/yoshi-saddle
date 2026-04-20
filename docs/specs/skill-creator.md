# skill-creator 스킬

> 새 스킬 작성 및 기존 스킬 개선을 위한 메타가이드 스킬로, 스킬 해부학·Progressive Disclosure·description 작성 지침·eval 루프 개념·harness 컨벤션을 단일 SKILL.md에 담는다.

## 개요

`skill-creator`는 harness에 새 스킬을 추가하거나 기존 스킬을 개선할 때 품질·일관성 기준을 제공하는 메타가이드 스킬이다.

**이 harness의 스킬 구조**: `SKILL.md + bundled resources` 구성, frontmatter 필수 필드, harness 컨벤션(경로·언어·버전) 등 harness 로컬 규칙이 핵심 내용이다.

**공식 플러그인 참조**: Anthropic 공식 `skill-creator` 플러그인의 핵심 개념(description "pushiness" 권고, eval 루프 with-skill vs baseline 비교)을 개념 수준에서 흡수했다. 공식 플러그인의 Python 스크립트(`package_skill.py`, `run_loop.py` 등)는 번들하지 않으며 참조 링크만 SKILL.md에 포함한다.

기반 소스는 `sample-claude-env`(Apache 2.0)이다.

## 구조

```
.claude/skills/skill-creator/
└── SKILL.md          # 메타가이드 본체 (bundled resources 없음)
```

### frontmatter 필드

| 필드 | 값 |
|------|----|
| `version` | `1` |
| `name` | `skill-creator` |
| `description` | 트리거 신호 — 사용자가 스킬 작성·수정·구조 이해·description/eval 품질 개선을 요청할 때 로드 |
| `origin` | `sample-claude-env+anthropic-official` |

### SKILL.md 내부 섹션

| 섹션 | 내용 |
|------|------|
| About Skills | 스킬 정의 및 제공 가치 |
| Anatomy of a Skill | SKILL.md + bundled resources 구조 (scripts/, references/, assets/) |
| Progressive Disclosure | 3단계 로딩 전략 |
| Writing Effective Descriptions | 트리거 정확도 최적화 원칙 |
| Skill Creation Process | 6단계 작성 절차 |
| Eval Loop Concept | with-skill vs baseline 수동 비교 가이드 |
| Harness Conventions | 이 harness 전용 규칙 |
| Related References | 외부 참조 링크 |

## 동작

### 트리거 조건

description 필드가 다음 상황에서 스킬을 로드한다:

- 새 스킬을 처음 작성하거나 기존 스킬을 수정·개선하려 할 때
- SKILL.md 구조나 bundled resources 활용 방식을 이해하려 할 때
- description 작성 방법이나 triggering accuracy를 개선하려 할 때
- eval 루프 설계에 대한 질문이 있을 때
- 사용자가 "스킬"이라고 명시하지 않더라도 스킬 작성에 해당하는 맥락일 때

### 제공 가이드

**스킬 해부학**: `SKILL.md`(필수)와 bundled resources(선택)의 구조를 설명한다. bundled resources는 scripts/(반복 코드), references/(참조 문서), assets/(출력용 파일) 세 유형으로 구분된다.

**Progressive Disclosure**: 스킬은 3단계로 로드된다 — Level 1(metadata: name + description, 항상 컨텍스트에 존재), Level 2(SKILL.md body: 스킬 트리거 시 로드, 500줄 이하 권장), Level 3(bundled resources: 필요할 때만 로드).

**description 작성 원칙**: 3인칭 명령형("This skill should be used when…")으로 작성하며, 트리거 맥락을 구체적으로 열거하고 undertrigger 방지를 위해 적절히 pushy하게 작성한다.

**eval 루프 개념**: with-skill run(스킬 접근 가능)과 baseline run(스킬 없음) 출력을 정성 비교한다. 테스트 케이스는 실제 사용자가 입력할 만한 구체적인 프롬프트 2~3개로 구성하며, 각 케이스에 예상 결과·트리거 여부·경계 케이스를 정의한다.

**harness 컨벤션**: 경로는 `.claude/skills/<name>/SKILL.md`, frontmatter 필수 필드는 `version`(1부터 시작)·`name`·`description`·`origin`, 지침 언어는 English. bundled resources는 구체적 필요(반복 코드, 대용량 참조 문서, 템플릿 파일)가 있을 때만 추가한다.

### `/harness:learn` 연계

`/harness:learn`이 세션 패턴을 `skills/learned/`에 저장할 때 이 스킬의 구조·컨벤션 기준을 따른다.

## 제약사항

- **bundled resources 없음**: SKILL.md 단독 구성이다. 공식 플러그인의 Python 스크립트(`init_skill.py`, `package_skill.py`, `run_loop.py`)는 번들하지 않으며 관련 참조 링크만 SKILL.md에 포함된다.
- **eval 자동화 없음**: eval 루프는 개념 수준 가이드만 제공한다. with-skill/baseline 서브에이전트를 직접 실행하는 절차, 정량 벤치마크 파이프라인, eval-viewer UI는 포함하지 않는다.
- **`.skill` 패키징 없음**: 이 harness는 디렉토리 복사 방식으로 스킬을 배포한다. `.skill` zip 패키징은 harness 외부 독립 배포 시에만 공식 플러그인 스크립트를 별도 사용한다.
- **`/skill-create` 커맨드 없음**: git 히스토리 기반 패턴 추출 커맨드는 별도 토픽에서 검토한다.
