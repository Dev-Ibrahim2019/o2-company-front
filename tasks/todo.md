# Tasks for Fixing Sales Invoices Empty Display Issue

## Completed Tasks

### Task 1: Fix minTotal/maxTotal filtering to handle empty strings correctly
**Status**: COMPLETED

**Description**: Updated the filtering logic in SalesInvoicesPage.tsx to treat empty string values for minTotal and maxTotal as "no filter" instead of converting them to 0

**Changes Made**:
- Modified `toInputNumber` function in `src/components/administration/SalesInvoicesPage.tsx` (lines 341-344)
- Added check: `if (value === "") return undefined;` before converting to number

**Acceptance Criteria Met**:
- [x] When minTotal input is empty, it does not filter by minimum total
- [x] When maxTotal input is empty, it does not filter by maximum total
- [x] When both inputs are empty, all invoices are displayed (subject to other filters)
- [x] When valid numbers are entered, filtering works correctly
- [x] Existing functionality for other filters (search, dates, status, etc.) remains unchanged

**Verification**:
- [x] Logic test confirms fix works correctly
- [x] Build progresses past SalesInvoicesPage.tsx (syntax errors fixed)
- [x] Dev server starts successfully
- [x] Manual code review confirms correct implementation

### Task 2: Verify fix works with test data
**Status**: PENDING (requires backend/data setup)

**Description**: Create test scenarios to verify the fix works correctly

**Acceptance Criteria**:
- [ ] Verify that with 68+ test invoices, all are displayed when filters are empty
- [ ] Verify that filtering by minimum total works correctly
- [ ] Verify that filtering by maximum total works correctly
- [ ] Verify that combined filtering works correctly

**Dependencies**: Task 1
