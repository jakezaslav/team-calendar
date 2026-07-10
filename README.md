# Plan It!

A project management calendar that makes it easy to plan, track, and display tasks for teams. View work on a visual monthly timeline, manage multiple projects, and share progress via export or Google Sheets sync.

**Live app:** [plan-it-7qcu.onrender.com](https://plan-it-7qcu.onrender.com/)

## Features

- **Visual calendar** — Tasks appear as color-coded bars across a monthly grid. Click any day to add a task, or drag tasks to reschedule.
- **Multiple projects** — Create, rename, duplicate, and switch between projects. Each project has its own task list and color.
- **Assignees** — Tag tasks with assignees and filter the calendar by person.
- **Undo** — `Cmd+Z` / `Ctrl+Z` to undo recent changes (up to 50 steps).
- **Export** — Download the calendar as PDF or Excel, for the full project or filtered by assignee.
- **Google Sheets sync** — Push task data to a Google Sheet via a Google Apps Script webhook.
- **Local storage** — All data stays in your browser; no account required.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+

### Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for production

```bash
npm run build
npm run preview
```

## Google Sheets Sync

1. Create a new Google Sheet.
2. Open **Extensions → Apps Script** and paste the contents of `google-apps-script.js`.
3. Deploy as a **Web app** (Execute as: Me, Who has access: Anyone).
4. Copy the deployment URL into Plan It!'s sync settings (gear icon in the header).

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Z` / `Ctrl+Z` | Undo |
| `Delete` / `Backspace` | Delete selected task |

## Tech Stack

- React 18 + Vite
- [date-fns](https://date-fns.org/) for date handling
- [jsPDF](https://github.com/parallax/jsPDF) + html2canvas for PDF export
- [SheetJS](https://sheetjs.com/) for Excel export

## License

Private project.
