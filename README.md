# Remix of Time Weaver

Build a responsive, local-first style Time Tracking web application inspired by Kimai. The UI should be clean, modern, dark-mode first, and highly scannable. 

### 1. Core Data Models & Relationships

- CUSTOMERS: ID, Name, Company Name, Currency, Global Hourly Rate, Is Active (Boolean)

- PROJECTS: ID, Customer ID (Belongs to Customer), Name, Budget (Monetary/Hours), Is Active (Boolean)

- ACTIVITIES: ID, Project ID (Optional - can be global or project-specific), Name, Custom Hourly Rate (Optional)

- TIMESHEETS: ID, Project ID, Activity ID, User ID, Description/Notes, Start Time (Timestamp), End Time (Timestamp), Duration (Seconds), Hourly Rate Applied, Billable (Boolean)

### 2. Main Dashboard & Active Timer (Top Priority)

- At the top of the main dashboard, feature a prominent "Active Timer" bar.

- It must have a text input for "What are you working on?", and dropdowns to select Customer -> Project -> Activity (dependent dropdowns).

- Include a prominent "Start" button. When active, show a live running clock (HH:MM:SS) and a red "Stop" button.

- Below the active timer, show a dashboard summary: Total Hours Worked This Week, Total Billable Earnings, and a simple bar chart/breakdown of hours spent per Project.

### 3. Essential Views / Pages (Sidebar Navigation)

- **Dashboard:** The active timer, quick stats, and a list of the "Recent Timesheet Entries" for the current week with the ability to edit or delete rows inline.

- **Timesheets (History):** A searchable, filterable table of all past time entries. Filterable by Date Range, Customer, Project, and Billable status. Include a manual "Add Entry" form for back-logging time.

- **Management (Tabs or separate views):**

  - **Customers:** A CRUD interface to add/edit customers and toggle their active status.

  - **Projects:** A CRUD interface to create projects linked to customers. Include a visual progress bar showing "Hours Logged vs. Project Budget".

  - **Activities:** A CRUD interface to manage tasks/activities.

### 4. Logic & Edge Cases

- When a user selects a Customer in the timer or forms, the Project dropdown should filter to only show projects belonging to that customer.

- **Rate Hierarchy:** When calculating earnings for a timesheet entry, use the Activity Rate if it exists. If not, fallback to the Customer's Global Hourly Rate. If neither exists, default to a standard rate of 0.

- If a user closes the app while a timer is running, the timer state (Start Time) should persist in local storage/database so it computes correctly when they reopen it.

### 5. UI/UX Style Guide

- Use a clean, professional, developer-friendly layout. A fixed sidebar for navigation and a spacious main content area.

- Use distinct visual states for "Billable" vs "Non-billable" items (e.g., a green dollar-sign badge for billable).

- Ensure all tables are cleanly formatted with explicit column alignments (text left, monetary values right).

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/046e180b-a255-47b9-a430-fe140be8204d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
