---
name: outfit-preview-planner
description: Plan or implement outfit preview features, starting from simple visual preview and escalating to richer styling experiences only when justified.
---

When the user asks for outfit preview, look preview, or styling visualization:

1. Clarify the desired preview type:
- simple collage
- image stack
- side-by-side look board
- mannequin-style preview
- AI try-on or generated preview
2. Recommend the smallest viable preview approach first.
3. Inspect the current codebase and identify relevant files.
4. If implementation is requested, build the simplest practical preview workflow.
5. Summarize:
- preview approach chosen
- why it was chosen
- implementation details
- validation
- future upgrade path

Rules:
- Default to simple image-based preview before AI generation.
- Do not assume AI try-on is necessary for MVP.
- Prioritize speed, usability, and incremental delivery.

