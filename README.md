# TaskFlow — Modern To-Do Web Application

TaskFlow is a high-performance, dark-themed to-do list web application crafted with **vanilla HTML5, CSS3, and modern JavaScript**. It uses browser **Local Storage** for instant persistence without requiring any database setup, API keys, or backend servers.

Anyone opening the website can immediately view starter tasks and manage their daily workflow right in their browser.

---

## Features

- **Zero Setup / Instant Access**: Works directly out of the box for anyone opening the webpage. No Supabase or database configuration required.
- **Local Browser Persistence**: Tasks are saved automatically to `localStorage` so changes persist across page reloads.
- **Starter Demo Tasks**: First-time visitors are welcomed with clear sample tasks to demonstrate all features.
- **Modern Neon Dark Aesthetic**: Glassmorphism, electric cyan and neon purple accents, smooth micro-animations, and balanced typography.
- **Task Management**:
  - Add tasks via the input field or by pressing <kbd>Enter</kbd>.
  - Toggle completion status with custom animated checkboxes.
  - Delete tasks with a confirmation modal.
  - Rejects empty and whitespace-only submissions.
- **Task Filtering & Live Metrics**:
  - Live counter cards for Total, Pending, and Completed tasks.
  - Filter tabs to switch between *All*, *Pending*, and *Completed* views with count badges.
- **Safe DOM Manipulation**: All user task titles are injected strictly using safe DOM text APIs (`textContent`), completely avoiding unsafe `innerHTML` interpolation to safeguard against XSS.
- **Responsive Layout**: Designed for seamless use across desktops, tablets, and mobile devices.

---

## Project Structure

```text
TO-DO-LIST/
├── index.html     # Semantic HTML5 markup and layout
├── style.css      # Vanilla CSS3 styles, design tokens, and animations
├── script.js      # App logic, DOM manipulation, and Local Storage CRUD operations
├── README.md      # Project overview and documentation
└── .gitignore     # Git exclusions
```

---

## Running Locally

Because TaskFlow is built with standard web technologies, there are no build steps or dependencies to install.

### Option 1: Open Directly
Double-click `index.html` in your file explorer to open it directly in any modern web browser.

### Option 2: Using VS Code Live Server
1. Open the project folder in VS Code.
2. Install the **Live Server** extension (if not already installed).
3. Right-click `index.html` and select **Open with Live Server**.

---

## Hosting Online

TaskFlow can be hosted for free on:
- **GitHub Pages**: Go to your repository settings → Pages → choose `main` branch.
- **Vercel** or **Netlify**: Simply link your Git repository; no build command is needed.
