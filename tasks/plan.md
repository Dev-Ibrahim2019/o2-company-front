# Implementation Plan: Fix Sales Invoices Empty Display Issue

## Overview
The sales invoices page is displaying empty data despite having 68 invoice records in the database. The root cause is in the filtering logic where empty string values for `minTotal` and `maxTotal` filters are being converted to the number 0, resulting in a filter that only shows invoices with total exactly 0 (which are likely none).

## Architecture Decisions
- Fix the filtering logic to treat empty string values as "no filter" for numeric fields
- Maintain consistency with how other filters (text, date) handle empty values
- Make minimal changes to fix the specific issue without affecting other functionality

## Task List

### Phase 1: Fix Filtering Logic
- [x] Task 1: Fix minTotal/maxTotal filtering to handle empty strings correctly (COMPLETED)
  - **Description:** Update the filtering logic in SalesInvoicesPage.tsx to treat empty string values for minTotal and maxTotal as "no filter" instead of converting them to 0
  - **Acceptance criteria:**
    - [ ] When minTotal input is empty, it should not filter by minimum total
    - [ ] When maxTotal input is empty, it should not filter by maximum total
    - [ ] When both inputs are empty, all invoices should be displayed (subject to other filters)
    - [ ] When valid numbers are entered, filtering should work correctly
    - [ ] Existing functionality for other filters (search, dates, status, etc.) remains unchanged
  - **Verification:**
    - [ ] Tests pass: npm test
    - [ ] Build succeeds: npm run build
    - [ ] Manual check: Verify invoices display correctly with empty filters
    - [ ] Manual check: Verify filtering works correctly when min/max values are entered
  - **Dependencies:** None
  - **Files likely touched:**
    - `src/components/administration/SalesInvoicesPage.tsx`
  - **Estimated scope:** Small: 1-2 files

### Phase 2: Verification and Testing
- [ ] Task 2: Verify fix works with test data
  - **Description:** Create test scenarios to verify the fix works correctly
  - **Acceptance criteria:**
    - [ ] Verify that with 68+ test invoices, all are displayed when filters are empty
    - [ ] Verify that filtering by minimum total works correctly
    - [ ] Verify that filtering by maximum total works correctly
    - [ ] Verify that combined filtering works correctly
  - **Verification:**
    - [ ] Manual verification with test data
    - [ ] Check that no regressions were introduced
  - **Dependencies:** Task 1
  - **Files likely touched:**
    - `src/components/administration/SalesInvoicesPage.tsx` (for potential test data)
  - **Estimated scope:** Small: 1-2 files

## Checkpoint: After Task 1
- [x] All tests pass
- [ ] Application builds without errors
- [ ] Sales invoices display correctly with empty filters showing all data
- [ ] Review fix with human before proceeding

## Open Questions
- None
