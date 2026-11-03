# STUDIO Management Platform — Finalized Implementation Blueprint

## 1. Core Architecture Specifications

### A. Studio Locations (Two Fixed Entities — No "Add Branch")
* **Artè Lume Studio** — Jubilee Hills, Hyderabad (AL-HYD • HDFC Bank)
* **Vizag Studio** — Siripuram, Visakhapatnam (AL-VZG • ICICI Bank)
* The `+ Add New Studio Branch` button is **permanently eliminated**.
* The overarching software is branded as **"STUDIO"** (Studio Architectural Operations Portal).
* Quotation and challan prefixes are 100% editable by the Studio Owner in Settings.

### B. Role Access Matrix
* **👑 Studio Owner**: Master authority across both studios, P&L, bank passbooks, staff delegation, prefix & theme customization.
* **🛡️ Administrator**: Full access to financial logs, purchases, expenses, and quotations.
* **💼 Sales Person**: Can create and edit quotations, **adjust pricing and discounts/margins**, allocate shipments, and issue client proposals.
* **🚚 Delivery Person**: **Strictly locked out of Quotation Builder**. Cannot edit quotation pricing or line items. Can view assigned delivery challans, update dispatch/delivered status, and collect on-site delivery payment receipts.

### C. Unique Dedicated Invite Codes & Password Setup
* Owner pre-assigns staff member with studio location and role.
* System automatically generates a **unique invite code** (e.g. `AL-HYD-7281`, `AL-VZG-3921`).
* On login, staff enters their invite code, confirms their display name, and creates their password.
* The system automatically isolates their view to their assigned studio location.

### D. Activity Notifications with Creator Names
* Whenever a staff member creates a quotation, issues a delivery challan, or records a payment receipt, the system tags their name and records an activity notification:
  * *"Vikram Sharma created Quotation #AL-012 for Ar. Rajesh"*
  * *"Kishore Kumar dispatched Delivery Challan #DC-104"*
  * *"Sneha Rao recorded payment receipt ₹1,50,000 for Vizag Villa"*
* Displayed in real time via toast notifications and in an Activity Log for the Studio Owner.

### E. Offline-First Resilience
* All data writes (quotations, challans, payments, settings) are saved synchronously to **`localStorage` first**, ensuring flawless offline operation without an internet connection.
* When online, changes asynchronously replicate to Firestore in the background.

---

## 2. Implementation Execution Steps
1. **Settings Cleanup (`src/App.tsx`)**:
   * Remove `addNewBranch` and the `+ Add New Studio Branch` button.
   * Lock branches array to Artè Lume Studio (Hyderabad) and Vizag Studio (Siripuram).
   * Ensure Prefix input is prominent, editable, and bound to `quotePrefix`.
2. **Delivery Role Lockdown (`src/App.tsx`)**:
   * In sidebar, hide "Quotation Builder" and "+ New Quotation" if `currentRole === 'delivery'`.
   * In quotations list, hide "Edit" button if `currentRole === 'delivery'`.
   * Allow Sales Person full capability to edit pricing, discounts, and margins.
3. **Activity Notifications & Creator Tagging (`src/App.tsx` & `src/types.ts`)**:
   * Track `createdBy: string` and `createdAt: string` on Quotations, Challans, and Payments.
   * Add activity notification dispatcher with person's name.
4. **AuthGate Enhancement (`src/components/AuthGate.tsx`)**:
   * Enhance staff login with Dedicated Invite Code input, staff name prompt, and password setup.
5. **Verify & Compile**:
   * Run `lint_applet` and `compile_applet`.
