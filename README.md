# TaskFlow — Modern Real-Time To-Do Web Application

TaskFlow is a high-performance, dark-themed to-do list web application crafted with **vanilla HTML5, CSS3, and modern JavaScript**, backed by a cloud-hosted **Supabase PostgreSQL** database.

It uses zero frontend or backend frameworks, zero build tools, and zero bundlers. Everything runs natively in the browser via clean static files and the official Supabase JavaScript CDN client.

---

## Features

- **Real-Time Cloud Persistence**: Tasks are synchronized directly with a Supabase PostgreSQL database.
- **Modern Neon Dark Aesthetic**: Glassmorphism, electric cyan and neon purple accents, smooth micro-animations, and balanced typography.
- **Task Management**:
  - Add tasks via the input field or by pressing <kbd>Enter</kbd>.
  - Toggle completion status with optimistic UI updates.
  - Delete tasks permanently with a modal confirmation step.
  - Reject empty and whitespace-only submissions.
  - Prevent duplicate submissions while a request is in progress.
- **Task Filtering & Live Metrics**:
  - Live counters for Total, Pending, and Completed tasks.
  - Filter tabs to switch between *All*, *Pending*, and *Completed* views.
- **Safe DOM Manipulation**: All user task titles are injected strictly using safe DOM text APIs (`textContent`), completely avoiding unsafe `innerHTML` interpolation to safeguard against XSS.
- **Responsive Layout**: Designed for seamless use across desktops, tablets, and mobile devices.

---

## Project Structure

```text
TO-DO-LIST/
├── index.html     # Semantic HTML5 markup, layout, and CDN scripts
├── style.css      # Vanilla CSS3 styles, design tokens, and animations
├── script.js      # App logic, DOM manipulation, and Supabase CRUD operations
├── README.md      # Setup, database configuration, security, and deployment guide
└── .gitignore     # Files and local environment exclusions
```

---

## 1. Supabase Database Setup

### Step 1: Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **New Project**.
3. Choose an organization, choose a project name (e.g. `taskflow`), set a strong database password, and select your preferred region.
4. Click **Create new project** and wait ~1–2 minutes for the database to provision.

---

### Step 2: Create the `tasks` Table and Configure Row Level Security (RLS)

1. In the Supabase Dashboard, click on **SQL Editor** in the left sidebar.
2. Click **New Query**.
3. Paste the following SQL script and click **Run**:

```sql
-- 1. Create the 'tasks' table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Enable Row Level Security (RLS) on the table
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for public client access
-- Allows anyone with the public anon key to read tasks
CREATE POLICY "Public tasks can be viewed by anyone" 
  ON public.tasks 
  FOR SELECT 
  USING (true);

-- Allows anyone with the public anon key to insert new tasks
CREATE POLICY "Public tasks can be inserted by anyone" 
  ON public.tasks 
  FOR INSERT 
  WITH CHECK (true);

-- Allows anyone with the public anon key to update tasks (e.g., toggle completed)
CREATE POLICY "Public tasks can be updated by anyone" 
  ON public.tasks 
  FOR UPDATE 
  USING (true) 
  WITH CHECK (true);

-- Allows anyone with the public anon key to delete tasks
CREATE POLICY "Public tasks can be deleted by anyone" 
  ON public.tasks 
  FOR DELETE 
  USING (true);
```

---

### Step 3: Retrieve Project URL and Public Anon Key

1. In your Supabase Dashboard, navigate to **Project Settings** (the gear icon at the bottom of the left sidebar).
2. Click on **API** under the Configuration section.
3. Under **Project API keys**:
   - Copy the **Project URL** (format: `https://[your-project-ref].supabase.co`).
   - Copy the **`anon` `public` key** (starts with `ey...`).

> ⚠️ **CRITICAL SECURITY REQUIREMENT**:
> - **NEVER** expose the `service_role` secret key in your client-side frontend code! The `service_role` key bypasses all Row Level Security policies and grants full admin access to your entire database.
> - Only use the **`anon` `public` key** in `script.js`. The `anon` key is designed to be public and is constrained by the Row Level Security (RLS) policies created above.

> ℹ️ **Public Shared List vs. Private User Lists**:
> The RLS policies configured above allow **anyone with access to the web page to view, add, modify, and delete tasks from the shared list**. This is ideal for shared boards, team tasks, or demonstrations without requiring user registration.
>
> If you require private, user-isolated tasks, you would:
> 1. Enable **Supabase Auth** (email/password or OAuth).
> 2. Add a `user_id UUID REFERENCES auth.users(id)` column to the `tasks` table.
> 3. Update the RLS policies with `USING (auth.uid() = user_id)` so users can only access their own tasks.

---

## 2. Configuring the Application

Open [`script.js`](script.js) and locate the configuration section at the very top (lines 19–20):

```javascript
// =============================================================================
// 1. Supabase Database Configuration
// =============================================================================

const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Replace `'https://YOUR_PROJECT_ID.supabase.co'` with your actual Supabase Project URL and `'YOUR_SUPABASE_ANON_KEY'` with your actual public `anon` key.

Save the file.

---

## 3. Running the Website Locally

Because TaskFlow is composed entirely of static files (`index.html`, `style.css`, `script.js`), you do not need any build tool (no Vite, no Webpack, no npm packages).

### Option A: Using a Lightweight Local HTTP Server (Recommended)
While you can double-click `index.html` in file explorer, modern browsers may apply cross-origin restrictions (`file://` protocol limitations) when interacting with external CDN scripts and network APIs. Running a minimal local static server is the standard best practice:

- **Using Python 3 (installed by default on most systems):**
  ```bash
  python -m http.server 8000
  ```
  Then open `http://localhost:8000` in your web browser.

- **Using Node `npx` (if Node.js is installed):**
  ```bash
  npx serve .
  ```

- **Using VS Code Live Server extension:**
  Right-click `index.html` inside VS Code and choose **"Open with Live Server"**.

---

## 4. Testing the Application

Verify all features once your Supabase URL and anon key are configured:

1. **Adding a Task**:
   - Type a task title into the input field and click **Add Task** or press <kbd>Enter</kbd>.
   - Verify that the task immediately appears at the top of the list and the input clears.
   - Verify that attempting to submit an empty or whitespace-only task displays an error message.
2. **Completing a Task**:
   - Click the circular checkbox next to a task.
   - Verify that the item transitions into the completed style (strikethrough text, muted color, cyan checkmark) and the Pending/Completed counters update.
3. **Filtering**:
   - Click the **Pending** tab to view only incomplete tasks.
   - Click the **Completed** tab to view completed tasks.
   - Click **All** to return to the full list.
4. **Deleting a Task**:
   - Click the trash icon on any task.
   - A confirmation modal will appear.
   - Click **Delete Task** to confirm. Verify that the task is permanently removed.
5. **Persistence**:
   - Refresh the browser (<kbd>F5</kbd> or <kbd>Ctrl</kbd>+<kbd>R</kbd>).
   - Verify that all tasks, completion states, and timestamps reload accurately from Supabase.

---

## 5. Troubleshooting Common Issues

| Issue / Error | Cause | Solution |
| :--- | :--- | :--- |
| **"Credentials Required" badge** | `SUPABASE_URL` or `SUPABASE_ANON_KEY` are still set to default placeholders in `script.js`. | Open `script.js` and paste your actual Supabase Project URL and public `anon` key. |
| **"Failed to load tasks: new row violates row-level security policy"** | RLS is enabled on the `tasks` table, but the public policies were not executed. | Run the 4 `CREATE POLICY` statements in the Supabase SQL Editor (see Step 2). |
| **"relation \"public.tasks\" does not exist"** | The `tasks` table has not yet been created in Supabase. | Run the `CREATE TABLE public.tasks (...)` SQL block in your Supabase SQL Editor. |
| **"Failed to load Supabase library from CDN"** | Network issue or ad blocker blocking `cdn.jsdelivr.net`. | Check your internet connection or verify that CDN scripts are allowed. |
| **Changes not persisting on page reload** | The Supabase credentials are wrong or network request failed. | Open browser DevTools (<kbd>F12</kbd>) -> **Console** to view the specific PostgreSQL error code. |

---

## 6. Deployment to GitHub & Static Hosting

### Upload to GitHub
1. Initialize Git in the project directory (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: TaskFlow to-do application"
   ```
2. Create a new repository on [GitHub](https://github.com/new).
3. Link and push your repository:
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
   git push -u origin main
   ```

### Deploy to Netlify (Free & Instant)
1. Go to [https://app.netlify.com](https://app.netlify.com) and log in.
2. Click **Add new site** > **Import an existing project**.
3. Select **GitHub** and authorize access to your repository.
4. Deployment settings:
   - **Build command:** *(leave empty)*
   - **Publish directory:** `.` (root directory)
5. Click **Deploy site**. Your static app will be live on a secure HTTPS URL in seconds!

### Deploy to Vercel (Free & Instant)
1. Go to [https://vercel.com](https://vercel.com) and log in.
2. Click **Add New...** > **Project**.
3. Import your GitHub repository.
4. Under **Framework Preset**, select **Other**.
5. Leave the build command and output directory default.
6. Click **Deploy**.

---

## Quick Step-by-Step Checklist to Get Running

- [x] Files created (`index.html`, `style.css`, `script.js`, `README.md`, `.gitignore`).
- [ ] Create a Supabase project at [supabase.com](https://supabase.com).
- [ ] Execute the table creation and RLS SQL script in the Supabase SQL editor.
- [ ] Paste your `SUPABASE_URL` and `SUPABASE_ANON_KEY` at lines 19–20 of `script.js`.
- [ ] Open `index.html` in your browser (or run `python -m http.server 8000`).
- [ ] Enjoy your real-time cloud-backed TaskFlow to-do app!
