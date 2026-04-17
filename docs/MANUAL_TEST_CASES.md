# Wardrobe Stylist Manual Test Cases

This document is a practical manual QA checklist for local verification while `npm run dev` is running.

## Test Environment

- App URL: `http://localhost:3000`
- Recommended browser: Chrome or Edge
- Data store: local Prisma SQLite database
- Upload assets: `public/uploads`
- Suggested test image set:
  - 3 tops
  - 3 bottoms
  - 2 shoes
  - 1 accessory
  - 1 invalid file type
  - 1 image larger than upload size limit
  - 1 clean full-body front photo for template testing

## Pass Criteria

- No page crashes or blank screens
- CRUD actions reflect in UI after refresh
- Uploaded images can be previewed
- Batch upload only shows the current batch in `/batch-confirm?batchId=...`
- Board and try-on flows show correct status changes
- Expected validation and error messages appear for invalid input

## Smoke Test

### TC-001 App Load

- Purpose: Confirm the home page loads successfully.
- Steps:
  1. Open `http://localhost:3000`.
  2. Wait for the initial page to finish loading.
- Expected:
  - Home page renders without console-breaking errors.
  - Clothes tab is visible.
  - Summary cards render.
  - No infinite loading state.

### TC-002 Navigation Tabs

- Purpose: Confirm top-level navigation between Clothes and Outfits works.
- Steps:
  1. Click `Clothes`.
  2. Click `Outfits`.
  3. Click `Clothes` again.
- Expected:
  - The tab state changes immediately.
  - The corresponding list area updates correctly.
  - No stale or mixed content appears.

## Clothing Item CRUD

### TC-010 Create Clothing Item Without Image

- Purpose: Verify manual item creation.
- Steps:
  1. Click `Add Item`.
  2. Enter name, category, color, and at least one season.
  3. Leave image empty.
  4. Submit.
- Expected:
  - Item is created and appears in the clothes list.
  - Added date is shown.
  - Placeholder icon is shown instead of an image.

### TC-011 Create Clothing Item With Image Upload

- Purpose: Verify image upload and preview in single-item form.
- Steps:
  1. Click `Add Item`.
  2. Upload a valid image.
  3. Fill required fields.
  4. Submit.
- Expected:
  - Upload succeeds.
  - Preview appears in the form before submit.
  - Created item shows the uploaded image in the clothes list.

### TC-012 Edit Clothing Item

- Purpose: Verify item editing persists.
- Steps:
  1. Click `Edit` on an existing item.
  2. Change name, color, and season.
  3. Save.
  4. Refresh the page.
- Expected:
  - Updated values appear immediately.
  - Updated values remain after refresh.

### TC-013 Delete Clothing Item

- Purpose: Verify item deletion.
- Steps:
  1. Click `Delete` on an existing item.
  2. Confirm the browser confirmation dialog.
- Expected:
  - Item disappears from the list.
  - Item does not return after refresh.

### TC-014 Required Field Validation

- Purpose: Confirm required fields block invalid submit.
- Steps:
  1. Open `Add Item`.
  2. Leave name blank.
  3. Leave season empty.
  4. Try to submit.
- Expected:
  - Submit is blocked.
  - Validation messaging or browser-required behavior appears.

### TC-015 Invalid Image Upload

- Purpose: Confirm upload validation works.
- Steps:
  1. Open `Add Item`.
  2. Upload an unsupported file type.
  3. Upload a file larger than the allowed limit.
- Expected:
  - Unsupported file is rejected with a clear error.
  - Oversized file is rejected with a clear error.

## Filter Bar

### TC-020 Filter By Category

- Purpose: Verify category filtering.
- Steps:
  1. Create items across multiple categories.
  2. Select one category in the filter bar.
- Expected:
  - Only matching items remain visible.
  - Count text reflects filtered results.

### TC-021 Filter By Season

- Purpose: Verify season filtering.
- Steps:
  1. Select one season in the filter bar.
- Expected:
  - Only items containing that season remain visible.

### TC-022 Clear Filters

- Purpose: Verify filters reset correctly.
- Steps:
  1. Apply category and season filters.
  2. Click the clear/reset action.
- Expected:
  - All items return.
  - Filter controls reset to default state.

## Batch Upload

### TC-030 Batch Upload Valid Images

- Purpose: Verify normal batch upload flow.
- Steps:
  1. Click `Batch Upload`.
  2. Select 5 to 10 valid garment images.
  3. Wait for upload to complete and redirect to batch confirmation.
- Expected:
  - Upload progress updates.
  - Redirect goes to `/batch-confirm?batchId=...`.
  - Only the current batch appears in the confirmation page.

### TC-031 Current Batch Isolation

- Purpose: Verify older pending items do not leak into the current batch.
- Steps:
  1. Run one batch upload and leave some items unconfirmed.
  2. Return home.
  3. Run a second batch upload with a different set of images.
- Expected:
  - The second confirmation page only shows the second batch.
  - Previously uploaded pending items do not appear in the new batch.

### TC-032 AI Fallback Visibility

- Purpose: Verify batch upload still works when AI classification cannot use the image.
- Steps:
  1. Upload images that may fail standardized-image loading.
  2. Check each pending card.
- Expected:
  - Batch upload still finishes.
  - Category and color fall back to rule/default values if needed.
  - `rawPredictions` shows a readable fallback message instead of crashing the flow.

### TC-033 Batch Upload Invalid Files

- Purpose: Verify invalid files are skipped safely.
- Steps:
  1. Include one invalid type and one oversized image in the selection.
  2. Include several valid images at the same time.
- Expected:
  - Valid files still upload.
  - Invalid files do not break the whole batch.

## Batch Confirm Page

### TC-040 Pending Card Image Preview

- Purpose: Verify pending-item image display.
- Steps:
  1. Open the batch confirmation page after upload.
  2. Inspect several cards.
- Expected:
  - Image preview is shown.
  - If standardized image fails, original image is used.
  - If all image sources fail, a placeholder is shown instead of a broken card.

### TC-041 Bulk Category Update

- Purpose: Verify bulk edit on selected pending items.
- Steps:
  1. Select multiple pending items.
  2. Click one bulk category action.
- Expected:
  - All selected items update to the chosen category.
  - Updated values remain after refresh.

### TC-042 Confirm Single Pending Item

- Purpose: Verify one-by-one confirmation.
- Steps:
  1. Click `Confirm` on one pending item.
  2. Return to the clothes list if needed.
- Expected:
  - The item is created in clothes.
  - The pending item disappears from batch confirmation.

### TC-043 Skip Pending Item

- Purpose: Verify skip behavior.
- Steps:
  1. Click `Skip` on one pending item.
- Expected:
  - The card becomes visually skipped.
  - The item is not created in clothes.

### TC-044 Confirm All

- Purpose: Verify full batch confirmation.
- Steps:
  1. Ensure several pending items remain.
  2. Click `Confirm All`.
- Expected:
  - All pending items are created as clothes items.
  - The pending batch is cleared.
  - App navigates back to home.

### TC-045 Duplicate Warning

- Purpose: Verify duplicate hints appear without blocking action.
- Steps:
  1. Upload items with matching category/color or similar names to existing items.
- Expected:
  - Duplicate hint appears on matching pending items.
  - User can still skip or confirm manually.

## Template Management

### TC-050 Upload Personal Template

- Purpose: Verify template upload works.
- Steps:
  1. Switch to `Outfits`.
  2. Open `Manage Template`.
  3. Upload a valid full-body front image.
- Expected:
  - Template appears in the template list.
  - Uploaded image thumbnail renders.

### TC-051 Set Default Template

- Purpose: Verify default template selection.
- Steps:
  1. Upload at least two templates.
  2. Set one non-default template as default.
- Expected:
  - Only one template is marked `Default`.
  - Summary card and outfit flow recognize a default template exists.

### TC-052 Delete Template

- Purpose: Verify template deletion.
- Steps:
  1. Delete a non-default template.
  2. Delete the current default template.
- Expected:
  - Deleted template disappears.
  - If default is deleted, another template becomes default when applicable.

## Outfit CRUD

### TC-060 Create Outfit

- Purpose: Verify outfit creation from existing clothes.
- Steps:
  1. Switch to `Outfits`.
  2. Click `Create Outfit`.
  3. Select multiple clothing items.
  4. Save.
- Expected:
  - Outfit appears in outfit list.
  - Outfit card shows selected item count.
  - Board generation state starts or updates correctly.

### TC-061 Edit Outfit

- Purpose: Verify outfit edit flow.
- Steps:
  1. Edit an existing outfit.
  2. Change name and selected items.
  3. Save.
- Expected:
  - Outfit updates correctly.
  - Displayed item list reflects the edit.

### TC-062 Delete Outfit

- Purpose: Verify outfit deletion.
- Steps:
  1. Delete an existing outfit.
  2. Confirm in dialog if prompted.
- Expected:
  - Outfit disappears from the list.

## Outfit Board Generation

### TC-070 Generate Board Success Path

- Purpose: Verify board generation flow.
- Steps:
  1. Create or pick an outfit.
  2. Trigger board generation or retry if needed.
- Expected:
  - Status moves to `generating`.
  - On success, preview image appears.
  - Detail modal shows board state correctly.

### TC-071 Board Failure Handling

- Purpose: Verify board failure is visible and recoverable.
- Steps:
  1. Use data or environment that causes board generation to fail.
  2. Inspect the card and retry action.
- Expected:
  - Status becomes `failed`.
  - Error text is shown.
  - Retry button is visible and clickable.

## Try-On

### TC-080 Try-On With Default Template

- Purpose: Verify try-on generation when a default template exists.
- Steps:
  1. Ensure a default template is set.
  2. Open an outfit.
  3. Trigger `Generate Try-On`.
- Expected:
  - Try-on status changes to `generating`.
  - On success, try-on image becomes viewable.

### TC-081 Try-On Without Default Template

- Purpose: Verify missing-template guard.
- Steps:
  1. Remove all templates or ensure no default exists.
  2. Attempt to trigger try-on.
- Expected:
  - User is prompted to upload/set a template first.
  - No crash occurs.

### TC-082 Try-On Retry / Failure State

- Purpose: Verify failed try-on behavior.
- Steps:
  1. Trigger a try-on failure.
  2. Inspect outfit card and modal.
- Expected:
  - Failure state is visible.
  - Existing board view still works.
  - User can retry when supported.

## Data Persistence and Refresh

### TC-090 Refresh Persistence

- Purpose: Verify created data survives page refresh.
- Steps:
  1. Create at least one clothing item, one outfit, and one template.
  2. Refresh the browser.
- Expected:
  - All created records are still visible.

### TC-091 Restart Dev Server

- Purpose: Verify data survives `npm run dev` restart.
- Steps:
  1. Stop the dev server.
  2. Start it again.
  3. Reopen the app.
- Expected:
  - Existing records still load.
  - No unexpected reset occurs.

## Suggested Regression Focus After Fixes

- Batch upload should not show previous pending items in a new batch.
- Batch-confirm page should load in production build without `useSearchParams()` prerender failure.
- Uploaded clothing images should still display even if standardized images fail.
- AI fallback should not break upload completion.
- Windows local setup script should succeed after dependencies and Python are prepared.

## Quick Smoke Sequence

If you only have 10 to 15 minutes, run this subset:

1. TC-001
2. TC-010
3. TC-030
4. TC-031
5. TC-042
6. TC-050
7. TC-060
8. TC-070
9. TC-080
10. TC-090
