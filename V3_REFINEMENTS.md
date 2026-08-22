# Orbite v3 refinements

This version keeps the existing product/UI and deepens the interview engine instead of adding unrelated screens.

## What changed

### 1. Interview Orchestrator
- Added `InterviewOrchestrator` as a dedicated backend service.
- Added `POST /api/interviews/{id}/next-turn`.
- The interviewer now chooses follow-ups from the current stage, candidate answer signals, previous prompts, and interview type.
- The endpoint is protected by session ownership validation.
- The deterministic rules engine is intentionally a provider seam for a future streaming LLM integration; Orbite still works without an external AI key.

### 2. More realistic adaptive behavior
- Follow-ups now come through the backend orchestrator when the remote interview session is available.
- The interviewer can produce a contextual reason for the probe.
- Interruption signals are returned for rambling or missing trade-off reasoning.
- The existing local adaptive fallback remains available if the backend is unavailable.

### 3. Better interview lifecycle
- Preparation was reduced from an artificial 45-second wait to a short ~12-second room calibration.
- The interview now auto-finishes when the timer reaches zero instead of leaving the candidate in a dead room.
- Normal completion uses a deliberate closing transition before the report is shown.

### 4. Evidence-led reporting
- Reports now contain answer evidence, not just aggregate scores.
- Each evidence item includes the signal observed, what the candidate actually demonstrated, and coaching for the next interview.
- Reports also expose interviewer calibration: style, adaptive follow-ups, interruptions, and hints.
- The local fallback report has the same structure.

### 5. Domain flows remain intact
- DSA still follows clarify -> brute force -> optimize -> code -> dry run -> complexity.
- Database still exposes schema/ER workspaces.
- System Design still exposes problem/architecture/whiteboard flow.
- Peer practice remains available.

## Important next step for true real-time AI

This release improves the orchestration and evaluation layer without introducing a paid AI provider or hidden API key. To make Maya fully model-driven, implement a streaming `LLMInterviewerProvider` behind `InterviewOrchestrator` and connect it to the same `NextTurnDto` contract. That keeps provider costs explicit and avoids coupling the product to one vendor.
