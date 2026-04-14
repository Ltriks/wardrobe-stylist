---
name: closet-catalog-manager
description: Design or implement clothing catalog features such as item schema, CRUD, filters, metadata, and organization workflows.
---

When the task is about managing the wardrobe catalog:

1. Identify the catalog-related feature:
- item creation
- item editing
- item metadata
- filtering
- grouping
- image association
2. Inspect existing schema, storage, and UI patterns.
3. Implement the narrowest useful catalog workflow.
4. Ensure the result helps the user maintain a real wardrobe database.
5. Return:
- changed schema or fields
- changed UI or flows
- validation performed
- gaps or future improvements

Rules:
- Prefer structured metadata over vague free-form descriptions.
- Support real-world usage: category, color, season, style, tags, notes, image.
- Avoid building recommendation logic inside catalog tasks unless explicitly requested.

