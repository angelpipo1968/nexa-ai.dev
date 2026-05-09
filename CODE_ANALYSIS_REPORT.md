# Code Analysis Report — nexa-ai.dev

**Generated**: 2026-05-09  
**Scope**: Full repository (193 source files)  
**Stack**: Next.js 15 + TypeScript + Capacitor + Turborepo monorepo

---

## Summary

| Category | Count |
|---|---|
| **Dead Code** | 38 |
| — Unused exports (functions/types/interfaces) | 12 |
| — Never-imported files | 14 |
| — Commented-out code blocks | 3 |
| — Build artifacts committed to repo | 92 files |
| — Stale/temp files | 4 |
| **Duplicates** | 14 |
| — Duplicate interface definitions | 7 |
| — Duplicate class implementations | 4 |
| — Duplicate rate-limiter logic | 2 |
| — Duplicate writing workflow | 1 |
| **Recommendations** | 18 |
| — Anti-patterns | 5 |
| — Performance issues | 4 |
| — Security concerns | 4 |
| — Code consolidation | 5 |

---

## 1. Dead Code

### 1.1 Unused Exports

| File | Line | What | Action |
|---|---|---|---|
| `src/lib/nexa-core/tools.ts` | L12 | `executeCode()` — never called anywhere outside the file | Remove or wire up |
| `src/lib/nexa-core/tools.ts` | L298 | `buildVisionMessages()` — exported but never imported | Remove or wire up |
| `src/lib/nexa-core/tools.ts` | L5 | `ToolResult` interface — shadows the one in `src/packages/tools/src/types.ts` | Consolidate |
| `src/lib/nexa-core/tools.ts` | L45 | `generateHTML()` — only imported by `src/app/api/generate/web/route.ts` which is a dead API route (see 1.2) | Remove together |
| `src/lib/nexa-core/logger.ts` | L93 | `withLogging()` — exported but never used by any route | Remove or use |
| `src/lib/nexa-core/logger.ts` | L62 | `sendToMonitoring()` — placeholder that does nothing (Sentry commented out) | Remove dead placeholder |
| `src/packages/core/src/index.ts` | L1-2 | `CORE_VERSION`, `APP_NAME` — never referenced outside this file | Remove |
| `src/packages/core/src/index.ts` | L6 | `safetyFilter` — mock that allows everything; only used in `apps/api/src/index.ts` and `apps/api/src/routes/ai.ts` | Replace with real implementation or remove |
| `src/packages/core/src/index.ts` | L12 | `llmRouter` — mock that returns hardcoded response; never used in production | Remove |
| `src/packages/tools/src/tools/stubs.ts` | L32 | `RAGTool` — duplicate of `src/packages/tools/src/tools/rag.ts` L16 (see Duplicates) | Remove stub |
| `src/packages/tools/src/tools/stubs.ts` | L41 | `BrowserTool` — stub, never used | Remove |
| `src/packages/tools/src/tools/stubs.ts` | L50 | `CalculatorTool` — stub, never used | Remove |

### 1.2 Never-Imported Files

| File | What | Action |
|---|---|---|
| `server/local-storage.ts` | Express server for local storage; standalone script | Keep if used via `npm run local-server`, but ensure `.gitignore` includes its data dir |
| `src/packages/tools/src/sandbox/vm.ts` | `VM` sandbox implementation | Wire up or remove |
| `src/packages/sandbox/executor.ts` | `SecureExecutor` using WebContainer | Wire up or remove |
| `src/packages/studio/src/voice/VoiceSynthesisEngine.ts` | Voice synthesis engine | Wire up or remove |
| `src/packages/models/src/test-stream.ts` | Test file for stream | Remove (not in test suite) |
| `src/packages/models/src/test-ollama.ts` | Test file for Ollama | Remove |
| `src/packages/models/src/test-local-nexa.ts` | Test file for local Nexa | Remove |
| `src/packages/models/src/test-cache.ts` | Test file for cache | Remove |
| `src/packages/writing/src/test-studio.ts` | Test file for studio | Remove |
| `src/packages/writing/src/test-workflow.ts` | Test file for workflow | Remove |
| `apps/web/src/components/layout/SidebarWrapper.tsx` | Sidebar wrapper component | Wire up or remove |
| `apps/api/src/services/ModelFallback.ts` | Model fallback service; imports non-existent `@/lib/analytics/AnalyticsService` and `@/lib/logging/StructuredLogger` | Remove or fix imports |
| `test-architect.ts` | Root-level test script | Remove |
| `test_scan.ts` | Root-level test script; imports non-existent stores | Remove |

### 1.3 Unused Icon Imports

**`src/components/NexaApp.tsx`** imports 40 icons from `lucide-react`. The following appear only in the import statement (count=1) and are never used in JSX:

- `MicOff`, `ChevronLeft`, `RefreshCw`, `Download`, `Trash2`, `Monitor`, `Share`, `Pin`, `Archive`, `CopyPlus`, `AlertCircle`

**Action**: Remove unused imports to reduce bundle size.

### 1.5 Commented-Out Code Blocks

| File | Lines | What | Action |
|---|---|---|---|
| `src/lib/nexa-core/logger.ts` | L67-73 | Sentry integration commented out | Remove or implement |
| `src/packages/tools/src/tools/rag.ts` | L4 | Comment about circular deps workaround | Remove comment |
| `src/packages/tools/src/tools/web-search.ts` | L25 | TODO comment about SearXNG | Resolve or track in issue |

### 1.6 Build Artifacts Committed to Repo

**92 files** (`.d.ts`, `.d.ts.map`, `.js`, `.js.map`) are committed under `src/packages/`. These are build outputs that should be in `.gitignore`.

**Action**: Add `*.d.ts`, `*.d.ts.map`, `*.js`, `*.js.map` patterns to `.gitignore` for `src/packages/` and remove tracked artifacts.

### 1.7 Stale/Temp Files

| File | What | Action |
|---|---|---|
| `supabase/.temp/linked-project.json` | Supabase link temp file with project ref | Remove or `.gitignore` |
| `eslint_report.json` | Empty file (0 bytes) | Remove |
| `test_api.json` | Test fixture with hardcoded messages | Remove |
| `example.ts` | Root-level example file | Remove |
| `list-gemini-models.js` | One-off utility script | Remove |
| `verify_models.js` | One-off verification script | Remove |
| `verify_simple.js` | One-off verification script | Remove |
| `test_ollama_direct.js` | One-off test script | Remove |
| `test_mcp_discovery.ts` | One-off test script | Remove |
| `test-vscode-bridge.ts` | One-off test script | Remove |

---

## 2. Duplicates

### 2.1 Duplicate Interface Definitions

| Interface | Locations | Action |
|---|---|---|
| `SearchResult` | `src/packages/tools/src/types.ts:19`, `src/packages/search-service/src/types.ts:4`, `src/packages/sdk/src/core/types.ts:43` | Create shared type in `@nexa/core` |
| `ChatMessage` | `src/packages/sdk/src/core/types.ts:74`, `src/packages/models/src/types.ts:16` | Unify in `@nexa/core/types` |
| `ToolResult` | `src/lib/nexa-core/tools.ts:5`, `src/packages/tools/src/types.ts:7`, `src/packages/sdk/src/core/types.ts:87` | Unify in `@nexa/core/types` |
| `ModelProvider` | `src/packages/models/src/providers/stubs.ts:3`, `src/packages/models/src/providers/real-providers.ts:3`, `apps/api/src/services/ModelFallback.ts:4` | Single definition in `@nexa/models/types` |
| `NexaConfig` | `src/packages/sdk/src/core/types.ts:1`, `src/packages/core/src/types.ts:1` | Single definition in `@nexa/core` |
| `RateLimitResult` | `src/lib/nexa-core/rate-limiter.ts:28`, `src/packages/security/src/algorithms.ts:1` | Unify in `@nexa/security` |
| `RateLimitAlgorithm` | `src/packages/security/src/algorithms.ts:10` — only used internally | Fine, but the `RateLimitResult` duplication is the issue |

### 2.2 Duplicate Class Implementations

| Class | Locations | Action |
|---|---|---|
| `RAGTool` | `src/packages/tools/src/tools/stubs.ts:32` (stub), `src/packages/tools/src/tools/rag.ts:16` (real) | Remove stub; use real implementation |
| `OllamaProvider` | `src/packages/models/src/providers/stubs.ts:10` (stub), `src/packages/models/src/providers/real-providers.ts:126` (real) | Remove stub; use real implementation |
| `AnthropicProvider` | `src/packages/models/src/providers/stubs.ts:192` (stub), `src/packages/models/src/providers/real-providers.ts:307` (real) | Remove stub; use real implementation |
| `ModelProvider` (interface) | Defined in both `stubs.ts` and `real-providers.ts` (see 2.1) | Single definition |

### 2.3 Duplicate Rate-Limiter Logic

Two completely separate rate-limiter implementations exist:

1. **`src/lib/nexa-core/rate-limiter.ts`** (99 lines) — in-memory, used by Next.js API routes (`src/app/api/chat/route.ts`, `src/app/api/vision/route.ts`)
2. **`src/packages/security/src/rate-limiter.ts`** (127 lines) + `algorithms.ts` (34 lines) — Redis-backed with TokenBucket/SlidingWindow/FixedWindow, used by `apps/api/src/middleware/security.ts`

**Action**: Consolidate into `@nexa/security` with a pluggable backend (in-memory for Next.js, Redis for Hono API).

### 2.4 Duplicate Writing Workflow

`src/packages/writing/src/workflow/orchestrator.ts` (`WorkflowOrchestrator`) and `src/packages/writing/src/workflow/book-workflow.ts` (`BookWritingWorkflow`) are near-identical implementations:

- Same imports (orchestrator has 2 extra: `SmartResearcher`, `QualityAnalyst`)
- Same flow: concept → blueprint → chapter → export
- Orchestrator adds research + quality analysis steps

**Action**: Make `BookWritingWorkflow` extend or compose `WorkflowOrchestrator`, or remove `BookWritingWorkflow` entirely.

---

## 3. Recommendations

### 3.1 Anti-Patterns (High Priority)

| # | Issue | File(s) | Details | Recommendation |
|---|---|---|---|---|
| 1 | **Missing module imports (will crash at runtime)** | `apps/web/src/store/useChatStore.ts`, `apps/web/src/lib/autoToolDetector.ts`, `apps/web/src/components/SystemImmunityBoundary.tsx` | 9 imports reference non-existent modules: `@/lib/selfHealing`, `@/lib/toolService`, `@/lib/gemini`, `@/lib/anthropic`, `@/lib/openai`, `@/lib/deepseek`, `@/lib/groq`, `@/lib/elevenlabs`, `@/lib/memory` | **Critical**: Create these modules or remove the imports. The `apps/web` app cannot build without them. |
| 2 | **Missing module imports in apps/api** | `apps/api/src/services/ModelFallback.ts` | Imports `@/lib/analytics/AnalyticsService` and `@/lib/logging/StructuredLogger` which don't exist | Create modules or remove the service |
| 3 | **204 uses of `: any` type** | Across entire codebase | TypeScript safety is severely undermined | Gradually replace with proper types, starting with public API surfaces |
| 4 | **204 console.log/error/warn calls in production code** | Across API routes, tools, SDK | Debug logging left in production code | Use the `logger` from `src/lib/nexa-core/logger.ts` consistently; strip debug logs |
| 5 | **Stubs exported alongside real implementations** | `src/packages/tools/src/tools/stubs.ts`, `src/packages/models/src/providers/stubs.ts` | Stubs and real impls are both exported from `index.ts`, causing ambiguity | Use conditional exports or remove stubs from production builds |

### 3.2 Performance Issues (Medium Priority)

| # | Issue | File(s) | Details | Recommendation |
|---|---|---|---|---|
| 1 | **Bundle bloat from lucide-react** | `src/components/NexaApp.tsx` (40 icons imported), `src/components/SettingsPanel.tsx` (39 icons imported) | Each icon import adds to bundle size even if tree-shaking works partially | Import only used icons; use dynamic imports for large icon sets |
| 2 | **No streaming in chat API route** | `src/app/api/chat/route.ts` | Uses `runtime = 'edge'` but doesn't implement streaming response | Implement SSE/streaming for better UX |
| 3 | **Synchronous crypto operations** | `src/packages/nexa-core/src/protection.ts` | Uses `crypto` module synchronously | Use async variants for non-blocking I/O |
| 4 | **Large monolithic components** | `src/components/NexaApp.tsx` (836+ lines), `src/components/SettingsPanel.tsx` (400+ lines) | Single files with all state, effects, and UI | Break into smaller, focused components |

### 3.3 Security Concerns (High Priority)

| # | Issue | File(s) | Details | Recommendation |
|---|---|---|---|---|
| 1 | **Supabase project ref committed** | `supabase/.temp/linked-project.json` | Exposes organization ID and project ref | Remove from repo; add to `.gitignore` |
| 2 | **No input validation on several API routes** | `src/app/api/generate/code/route.ts`, `src/app/api/generate/web/route.ts` | No `InputValidator` usage, no rate limiting | Add validation and rate limiting to all routes |
| 3 | **Hardcoded localhost URLs** | `src/packages/models/src/providers/stubs.ts`, `src/packages/models/src/providers/real-providers.ts` | `http://localhost:11434/api` hardcoded | Use environment variables |
| 4 | **`eslint_report.json` is empty** | Root | ESLint appears configured but report is empty — may not be running | Verify ESLint is running in CI |

### 3.4 Code Consolidation (Medium Priority)

| # | Opportunity | Details | Action |
|---|---|---|---|
| 1 | **Unify `SearchResult` type** | Defined in 3 places with different shapes | Create `@nexa/core/types` with shared types |
| 2 | **Unify rate-limiter** | Two separate implementations (in-memory + Redis) | Create `@nexa/security` with pluggable storage backend |
| 3 | **Remove stubs package pattern** | `stubs.ts` files exist in tools, models, and SDK packages | Use dependency injection or environment-based selection instead of shipping both stubs and real code |
| 4 | **Consolidate writing workflows** | `WorkflowOrchestrator` and `BookWritingWorkflow` are 80% identical | Single implementation with configuration options |
| 5 | **92 build artifacts in repo** | `.d.ts`, `.js`, `.map` files committed | Add to `.gitignore`, remove tracked files, add `clean` script to `package.json` |

### 3.5 Unused Packages

| Package | Status | Action |
|---|---|---|
| `@nexa/sdk` | Defined but never imported by any consumer | Remove or document intended external use |
| `@nexa/voice` | Defined but never imported by any consumer | Remove or wire up |
| `@nexa/studio` | Defined but never imported by any consumer | Remove or wire up |
| `@nexa/nexa-core` | Defined but never imported by any consumer | Remove or wire up |

---

## Appendix: File Inventory

- **Total source files**: 193 (`.ts`, `.tsx`, `.js`, `.jsx`)
- **Build artifacts committed**: 92 (`.d.ts`, `.js`, `.map`)
- **Test/verification scripts at root**: 7
- **Legacy code**: `nexa_agente_legacy/` (Python)
- **Mock files**: `__mocks__/fileMock.js`

---

*Report generated by automated code analysis. Review each finding before acting — some may be intentional design choices.*
