# FocusFlow Workspace

Create a hyper-detailed, enterprise-grade, single-user productivity workspace application called "OmniFocus Matrix" built as a desktop-first Progressive Web App (PWA). The app must run entirely in the browser using client-side storage (IndexedDB or robust localStorage fallback) to guarantee absolute offline functionality without requiring an internet connection or an external database. 

Aesthetic & Theme: Apply an ultra-premium, dark-mode minimalist aesthetic inspired by the "Incredible" iOS app. Use a dark slate canvas (#0B0F19), deep charcoals for cards (#151B2C), clean neon accents for status indicators (Focus Red: #FF4A5A, Break Green: #10B981, Interactive Blue: #3B82F6), and crisp white/gray typography. 

Structure the layout with a persistent, left-side vertical navigation panel providing instant routing across 7 primary modular dashboards:

---

### ARCHITECTURAL STORAGE & STATE SPECIFICATIONS
Ensure the relational state machine maps across local storage variables using the following exact structures:
- `Projects`: [id, name, color_hex, description, archived_status]
- `Tasks`: [id, project_id, title, notes, priority_level (Low/Medium/High), due_date, completed_boolean, estimated_pomodoros, completed_pomodoros, daily_grouping_bucket ("Inbox", "Today", "Tomorrow", "This Week", "Backlog")]
- `Habits`: [id, title, frequency_days[], streak_count, current_year_history_map (date string to boolean)]
- `TimeLogs`: [id, task_id/project_id, category_string, start_time, end_time, method_used ("Pomodoro" or "Stopwatch" or "Manual"), total_distractions, intensity_score (1-5), final_reflection_text]
- `DistractionBrainDump`: [id, timestamp, raw_thought_text, core_category]
- `Reminders`: [id, reference_type ("Task" or "Habit"), reference_id, fire_time_string, repeat_boolean]
- `AdvancedNotes`: [id, project_id, title, raw_content, markdown_html, created_at, updated_at, category_tag, absolute_privacy_flag]
- `CustomBinauralAudio`: [id, file_name, data_url_string]

---

### TAB 1: FOCUS COMMAND CENTER (Focus To-Do + Engross Fusion)
This is the core execution workspace. Split this view into a 2-column dashboard layout (Left Column: Timer & Controls | Right Column: Active Context & Brain Dump).

*   **Advanced Pomodoro Engine:**
    *   Visual ring timer showing standard cycles: Work (25m), Short Break (5m), Long Break (15m), with adjustment sliders to change intervals customly (1 to 180 minutes).
    *   State Controls: Play, Pause, Skip Cycle, Reset.
    *   Integrated Audio Matrix: A custom audio toggle bar containing ambient tracks playing locally: Mechanical Ticking, Rain Sound, White Noise, and Lofi Beats. Volume slider included.
*   **Custom Binaural Beats Break Matrix:**
    *   A dedicated module within the break interface that triggers automatically when the timer switches to "Short Break" or "Long Break" state.
    *   Includes a file uploader drop-down slot: "Import Custom Binaural Beats (.mp3/.wav)". When a user uploads a file, it saves directly into client storage (`CustomBinauralAudio`) as a persistent base64 audio data string.
    *   An automation toggle switch: "Autoplay custom binaural beats as soon as break starts". When enabled, the application immediately starts looping the user's uploaded audio file the exact second the focus timer transitions into a break cycle, helping them relax instantly, and shuts off immediately when the next work block begins.
*   **Active Context Binder:**
    *   A dynamic header showing the current task selected from the Task Hub. If no task is selected, display an amber warning badge stating "No Active Focus Target Selected".
*   **Engross Distraction Shield Mechanism:**
    *   A highly prominent, massive crimson button labeled: **"REPORT DISTRACTION / MY MIND WANDERED"**.
    *   *Click Action:* Instantly increments an on-screen session counter ("Distractions tracking this session: X"). Simultaneously freezes focus context and slides down a smooth text entry frame containing the prompt: *"Capture the exact intrusive thought to eject it from your head:"*
    *   The user types their distraction note. Hitting enter clears the text field, saves the note into the `DistractionBrainDump` collection with an automated timestamp, closes the box, and resumes focus momentum immediately.
*   **Incredible-Style End of Session Reflection Modal:**
    *   When the countdown hits 0:00 or a session is intentionally ended by the user, block the screen with an overlay. The session cannot be logged until these 3 inputs are fulfilled:
        1.  **Intensity Matrix Slider:** A scale from 1 (Completely distracted/brain fog) to 5 (Absolute flow state/hyper-focus).
        2.  **Goal Tracking Check:** A binary selection: "Did you achieve your intended milestone for this block?" (Yes/No).
        3.  **Post-Session Summary Note:** A text area labeled "Quick Summary / Lessons Learned from this block" to write down conclusions.

---

### TAB 2: MECHANICAL TIME & CLOCK HUB (Dedicated Chronometer & Toggl Tracker)
A workspace completely detached from strict Pomodoro limitations, optimized for continuous open tracking and standard temporal observation.

*   **Macro Digital Wall Clock Display:**
    *   A beautifully designed, large central clock component rendering hours, minutes, and seconds in real-time, accompanied by the full current date, day of the week, and timezone indicators.
*   **Toggl Track Style Live Stopwatch Engine:**
    *   A horizontal text input bar running across the top of the interface: *"What objective are you executing right now?"*
    *   Includes a dynamic project drop-down menu with color dots to bind the text to a specific folder.
    *   A neon blue "Start Tracking" play button. When clicked, it initiates a count-up timer formatting running duration as `HH:MM:SS`. 
    *   Clicking "Stop" immediately prompts the same Intensity Matrix and Summary Note inputs from Tab 1 before appending a fresh record to the `TimeLogs` matrix.
*   **Independent Generic Countdown Timer:**
    *   A manual dial input selector supporting hours, minutes, and seconds for arbitrary time tracking independent of Pomodoro work constraints.

---

### TAB 3: TOGGL-STYLE INTERACTIVE CALENDAR TIMELINE (Live Grid Planner)
An advanced visual scheduling tool bridging structural planning with retroactive historical logging.

*   **24-Hour Visual Grid Calendar Interface:**
    *   A detailed vertical or horizontal timeline block rendering a full day view separated into 30-minute rows (from 00:00 to 24:00).
    *   Historical logs from `TimeLogs` are fetched and displayed as colored container blocks mapped precisely over the hours they occurred, displaying the Task Title, Project Name, and an icon showing the tracking type used.
*   **Click-to-Track Action Matrix:**
    *   Users can click directly on any blank empty hour slot on the timeline calendar grid.
    *   *Interaction:* Clicking an empty slot instantly displays an popover dialogue containing the configuration options:
        1.  *Option 1: Add Historical Block:* Manually set Title, Project, exact custom Start/End times to retroactively log hours skipped earlier.
        2.  *Option 2: Initiate Live Focus Session:* Instantly routes the application state to Tab 1 (Focus Zone) automatically loading this grid selection as the priority target.

---

### TAB 4: ADVANCED TASK MANAGER & PROJECT GROUPS (With Daily Planning Buckets)
A comprehensive task board split into multi-column workflows based on temporal scheduling and distinct nested projects.

*   **Project Grouping Infrastructure:**
    *   Left column sidebar within this tab showing all active Projects folders. Clicking a project instantly filters all tasks to just that folder. Includes an "All Projects" master view.
*   **Daily Time-Bucket Drag & Drop columns:**
    *   Display tasks grouped into five distinct operational execution columns:
        1. **Inbox / Backlog:** Unscheduled tasks to be triaged.
        2. **Today:** The absolute critical priority list for the current day.
        3. **Tomorrow:** Fast lane preparation for the next cycle.
        4. **This Week:** Medium-term operational deadlines.
    *   Users can instantly move tasks between these daily groups using dropdown selectors or intuitive navigation buttons on the cards.
*   **Tomato Estimation Matrix:**
    *   Inside every task card, an adjustment selector allows the user to click little tomato icons to assign an "Estimated Pomodoros Required" count (1 to 10 tomatoes). As tasks are tracked via Tab 1, fill the tomato graphics with color to visually map Estimated vs. Actual Pomodoro blocks consumed.

---

### TAB 5: POWER-NOTE LAB & DISCRETE THOUGHT ENGINE (Comprehensive Note-Taking App)
A complete, heavy-duty note-taking system optimized to explicitly segregate completely different mental modes, academic topics, and deeply separated categories of thought.

*   **Explicit Categorization Matrix (Dual Filtering):**
    *   **Project Binding:** Every single note must be grouped inside a root Project folder (e.g., "Physics Class", "Startup Project", "Personal Musings").
    *   **Thought Mode Tagging:** Every note must carry a prominent structural tag designating the *exact type of thinking* it represents:
        *   `[Study/Theory]` - Technical concepts, textbook derivations, mathematical proofs.
        *   `[Fleeting Thought]` - Quick creative ideas or insights that spark mid-session.
        *   `[Deep Reflection]` - Extended introspective journals about focus trends or long-term growth.
        *   `[Action Plan]` - Structured checklists, protocols, step-by-step master operational lists.
*   **Rich Text Editor Panel:**
    *   A massive writing area featuring a robust text editor supporting Markdown primitives (Bold, Italics, H1/H2/H3 headers, inline Code blocks, syntax-highlighted blocks for formulas or scripts, and bulleted nested lists).
* Quick Meta-Toggles: Floating action buttons to immediately convert a block of text into an explicit "Warning Callout Card" or a "Key Takeaway Block".

Split Screen Navigation Feed:

A left pane displaying a list of note cards sorted by "Last Updated", featuring highly visible colored chips highlighting the Thought Mode Tagging and parent Project name so users can immediately distinguish completely separated categories of thoughts at a glance.

TAB 6: DISTRACTION JOURNAL & BRAIN DUMP FEED

The analytical dumping ground designed to offload intrusive thoughts securely to ensure deep focus preservation.

Chronological Thought Logger:

A beautiful grid feed presenting all distraction logs collected mid-session from the Tab 1 Engross action.

Each entry lists the exact date/time, the specific task being worked on when the distraction occurred, and the raw written text of the intrusive thought.

Intrusive Analytics Categorization System:

Allows users to attach categorical labels to entries via a simple drop-down menu (e.g., "Digital Temptation", "Internal Anxiety", "External Noise", "Random Ideas").

Includes a global search box at the top to filter past brain-dump logs by keyword string or structural tag criteria.

TAB 7: GRANULAR ANALYTICS DASHBOARD (Mega Detailed Summaries)

A data-heavy visual analysis interface rendering execution statistics. Use charts, cards, and data visualization primitives.

Core Performance Metrics Cards:

Total Focus Yield: Aggregate hours tracked grouped by Daily, Weekly, and Monthly frames.

Task Velocity: Total tasks successfully marked completed vs. total estimated pomodoros consumed.

Distraction Density Analyzer:

A visual metric module calculating the average number of mind-wanders reported, outputting a precise numerical rating: "Your Average Distractions per Hour".

Intensity-Duration Curve Tracker:

A line graph plotting session length along the X-axis against the user's logged 1-5 Focus Intensity Rating along the Y-axis. This serves to mathematically map the exact minute threshold where user cognitive endurance collapses during extended 90-minute Pomodoros.

Thought Mode Distribution Chart:

A dynamic graphical breakdown showing what percentage of your written notes belong to [Study/Theory], [Fleeting Thought], [Deep Reflection], or [Action Plan], providing visual proof of where your mental bandwidth is being deployed.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/95f4730a-b6ec-58af-8bf8-ef1bf4314dd1).

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
