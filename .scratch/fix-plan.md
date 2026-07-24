# Fix Plan: Code Review Findings

**Repo:** /home/xingwangtan/Code/107competition
**Base:** HEAD (049dee9)
**Source:** Code review of bc11f25...HEAD (Standards + Spec axes)

---

## Priority 1 — Spec Violations (must fix)

### F1: Frontend never writes progress → progress indicator permanently 0/N

**Problem:** `chat.js` only GETs `/api/progress`, never POSTs. Mastery is never updated.

**Fix:** After the agent confirms understanding (when a verification problem is answered correctly, or when the agent explicitly marks mastery), call `POST /api/progress/{username}` with `{block_slug, status: "mastered"}`. At minimum:
- When student switches away from a block after interacting, set status to `"in-progress"`.
- Parse agent responses for mastery confirmation signals (e.g., a JSON marker the system prompt instructs the LLM to emit like `:::mastered:::`) and trigger the POST.
- Update the progress indicator UI after each successful POST.

### F2: Hardcoded prerequisite DAG contradicts spec

**Problem:** `app/blocks.py` hardcodes `prerequisites` lists. Spec says "LLM determines dynamically at runtime (not a hardcoded DAG)."

**Fix:** Remove the `prerequisites` field from the block definitions. The system prompt already instructs the LLM to assess prerequisites dynamically. The UI prerequisite chips (`renderPrerequisiteChips` in `chat.js`) should be removed or repurposed to show topic categories instead. The LLM handles prerequisite checking in-conversation per the spec.

### F3: Active training mode not implemented (User Story #23)

**Problem:** `selectBlock()` only injects a static welcome bubble. No proactive quiz is fired.

**Fix:** When a student selects a block, automatically send a `POST /api/chat` request with a synthetic first message like `"I'm ready to study this block. Please start by assessing my current understanding."` — the system prompt's Socratic instructions will cause the agent to proactively quiz. Show a loading indicator during this initial request.

### F4: Font loading mismatch

**Problem:** HTML loads static `Inter` from Google Fonts, but CSS references `'Inter Variable'` which is never loaded. All text falls back to system-ui.

**Fix:** Change the Google Fonts URL to load the variable font:
```
https://fonts.googleapis.com/css2?family=Inter:wdth,wght@100,300..600&display=swap
```
And update CSS font-family references from `'Inter Variable'` to `'Inter'` (Google Fonts serves the variable font under the family name `Inter` when using the variable URL format). Alternatively, self-host Inter Variable and use `@font-face` with `font-family: 'Inter Variable'`.

### F5: Charts/graphs not implemented (User Story #13)

**Problem:** No convergence curve or function plot rendering exists.

**Fix:** Add a lightweight charting capability:
- When the agent's response contains a `:::chart{...}:::` marker (instruct via system prompt), the frontend renders a plot using a minimal canvas-based approach or Chart.js CDN.
- Update the system prompt to instruct the LLM to emit chart data (as JSON with x/y arrays) when discussing convergence behavior, error decay, or function shapes.
- Render charts in a card similar to formula cards (near-white bg, hairline border).

---

## Priority 2 — Spec Correctness (should fix)

### F6: Cross-session memory timing

**Problem:** `memory_summary` appended on every `/api/chat` call. Spec says "at conversation start."

**Fix:** Only include `memory_summary` when `history` is empty (first message of a session). In `app/routes.py`, guard:
```python
if request.memory_summary and not request.history:
    system_prompt += ...
```

### F7: Upload size check after full read

**Problem:** Entire file buffered into memory before size validation.

**Fix:** Check `file.size` (FastAPI/Starlette provides this from Content-Length header) before calling `await file.read()`. If Content-Length is unreliable, read in chunks up to MAX_UPLOAD_SIZE + 1 and reject if exceeded.

---

## Priority 3 — Standards Smells (nice to fix)

### F8: Duplicated LLM error handling → extract helper

Extract the repeated try/except block in `app/llm.py` into a shared async context manager or wrapper function:
```python
async def _llm_request(client, url, headers, payload) -> dict:
    ...  # single try/except for HTTPStatusError, TimeoutException, KeyError
```
All three public functions call this.

### F9: Duplicated completed_count → call existing helper

In `app/routes.py`, replace both inline `sum(...)` computations with a call to `progress.get_completed_count(data)` (or add that helper to `progress.py` if it doesn't exist).

### F10: Data Clumps in llm.py → build a client object

Create a small `LLMClient` class (or dataclass + functions) that holds `api_base`, `api_key`, `model`, and `headers` — constructed once at startup. Public methods: `chat()`, `vision_chat()`. Eliminates repeated config reads and header construction.

### F11: Remove dead code

- Delete `chat_completion_stream` from `app/llm.py` (no caller, spec doesn't require streaming for MVP).
- Delete `get_topic_blocks()` from `app/blocks.py` (no caller).
- Remove `.scratch/handoff.md` from git tracking (add `.scratch/` to `.gitignore`).

### F12: Rename `_get_config()` → `_read_llm_env()`

Self-explanatory rename for clarity.

---

## Execution Order

```
F4 (font) ─── independent, quick
F2 (remove DAG) ─── affects blocks.py + chat.js
F1 (progress write) ─── affects chat.js + prompts.py
F3 (active training) ─── affects chat.js, depends on F2 being done
F6 (memory timing) ─── one-line guard in routes.py
F7 (upload size) ─── routes.py
F5 (charts) ─── chat.js + prompts.py + style.css
F8-F12 (standards) ─── llm.py + routes.py + blocks.py cleanup
```

Suggested commit strategy: one commit per F-item (or group F8-F12 into one cleanup commit).

---

## Verification

After all fixes:
1. `uv run pytest tests/ -q` — all tests pass (update tests for removed prerequisites field)
2. `uv run serve` — start server, open localhost:8000
3. Manual check: font renders as Inter (inspect computed style)
4. Manual check: select a block → agent proactively quizzes
5. Manual check: complete a verification → progress indicator updates
6. Manual check: prerequisite chips no longer show hardcoded deps
7. Manual check: toggle memory ON, start new conversation → only first message carries summary
