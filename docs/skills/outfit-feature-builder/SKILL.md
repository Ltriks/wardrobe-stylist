---
name: outfit-feature-builder
description: Implement wardrobe and outfit-related features in the current repository with minimal scope and practical validation.
---

When the user asks to build or change a wardrobe-stylist feature:

1. Restate the requested feature in concise Chinese.
2. Inspect the current repository and identify the most relevant files.
3. Implement the smallest useful version of the feature.
4. Reuse current UI, data, and state patterns where possible.
5. Run the most relevant validation.
6. Summarize:
- files changed
- feature behavior
- validation
- assumptions
- next-step improvements

Rules:
- Build in this order when possible:
  1. data structure
  2. CRUD workflow
  3. filtering / browsing
  4. outfit composition
  5. preview
  6. AI enhancement
- Prefer working user flow over ambitious abstraction.
- Avoid jumping to advanced AI visualization unless the user explicitly requests it.
- Keep implementation incremental and testable.

