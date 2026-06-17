# Specification: Sales Invoices Display Issue

## Problem Statement
The sales invoices page is displaying empty/not showing invoice data, despite having 68 invoice records in the database. Users cannot view or open invoices from the sales invoices interface.

## Expected Behavior
The sales invoices page should:
1. Display all 68 invoice records from the database
2. Allow users to click/open individual invoices to view details
3. Show proper invoice data including invoice number, date, customer, amount, status
4. Load invoices without errors when navigating to the sales invoices view

## Current Behavior
- Sales invoices page shows empty state or no data
- Invoice records exist in database (68 records confirmed)
- Users cannot interact with or open invoices
- Likely data fetching or rendering issue in the frontend

## Technical Context
- Application: O2 Company Frontend (React 19 + TypeScript + Vite)
- State Management: Custom Context API (`src/store.tsx`)
- Routing: Programmatic navigation via `activeView` state in `App.tsx`
- Data Fetching: Axios HTTP requests with service layer abstraction
- Mock data is used for development/testing

## Acceptance Criteria
1. [ ] Sales invoices page loads and displays invoice data from database/mock data
2. [ ] All 68 invoice records are visible in the invoices list
3. [ ] Users can click on an invoice to view detailed information
4. [ ] No JavaScript errors occur when loading the sales invoices view
5. [ ] Invoice data includes essential fields: number, date, customer, amount, status
6. [ ] Loading states and error handling are properly implemented

## Steps to Reproduce
1. Start the development server: `npm run dev`
2. Navigate to the sales invoices section (likely through POS or administration menu)
3. Observe that invoice list is empty despite database having records
4. Attempt to click/open an invoice - observe failure or no response

## Possible Root Causes
1. API endpoint not returning invoice data correctly
2. State management not properly updating with fetched invoice data
3. Component not rendering invoice data due to prop issues or conditional rendering
4. Mock data not being initialized or loaded correctly
5. Routing/navigation issue preventing proper view loading
6. Authentication/authorization blocking invoice data access
7. Data transformation/parsing error between API response and UI display

## Notes
- Application uses mock data extensively for development - may need to verify mock data initialization
- Financial and accounting modules are fully featured - invoice functionality should be implemented
- Check both frontend data fetching and backend API (if connected) for issues
- Focus on sales invoices specifically mentioned, not other invoice types
