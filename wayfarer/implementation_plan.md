# Wayfarer Fullscreen Glassmorphism & Dashboard Overhaul Plan

This plan transforms Wayfarer into an immersive fullscreen dashboard. The 3D space visualizer (**The Void**) will render in the background across the entire viewport, while glassmorphic UI widgets float on top. Additionally, we will introduce a **Quick Chat / Model Tester** interface to verify NVIDIA NIM/local configurations, format report outputs professionally, and add a **Past Deep Searches** tracker.

## Proposed Changes

---

### 1. Visual Layout Overhaul (Fullscreen 3D Background)

#### [MODIFY] [index.css](file:///wsl.localhost/Ubuntu/home/tarun/Wayfarer/frontend/src/index.css)
- **Background Visualizer**: Position `.void-background` absolutely underneath the interface. Make the container translucent and let it stretch to `100vw` and `100vh`.
- **Glassmorphism Enhancements**: Update `.panel-card`, `.app-header`, and inputs to use a premium frosted-glass design (`backdrop-filter: blur(30px) saturate(160%)`, lighter margins, and dynamic border glowing states).
- **Professional Report Typography**: Implement a clean academic styling for reports (`.report-container`), including styled callouts, table columns, and formatted citations.

#### [MODIFY] [App.jsx](file:///wsl.localhost/Ubuntu/home/tarun/Wayfarer/frontend/src/App.jsx)
- Render `<TheVoid>` as a fixed background element.
- Restructure the main UI elements to overlay cleanly on top.
- Maintain states for the new views:
  - Active tab / view mode: **Deep Research** vs. **Quick Chat / Model Test**.
  - Local Storage state for tracking and loading **Past Deep Searches**.

---

### 2. New Features

#### [NEW] [QuickChat.jsx](file:///wsl.localhost/Ubuntu/home/tarun/Wayfarer/frontend/src/components/QuickChat.jsx)
- A conversational panel where users can send messages directly to the configured LLM engine (Local Server or NVIDIA NIM).
- This serves as a quick connection checker and validation chat box for cloud models.

#### [NEW] [PastSearches.jsx](file:///wsl.localhost/Ubuntu/home/tarun/Wayfarer/frontend/src/components/PastSearches.jsx)
- Lists past research topics and allows clicking one to load its finished report instantly.
- Saves research runs automatically to browser local storage.

#### [MODIFY] [main.py](file:///wsl.localhost/Ubuntu/home/tarun/Wayfarer/backend/app/main.py)
- Create a REST endpoint `@app.post("/api/chat")` to handle standard quick chats from the Quick Chat panel, routing to the appropriate provider (local or NVIDIA) based on the user's selected configuration.

## Verification Plan

### Manual Verification
1. Start servers: `./start.sh`.
2. Open `http://localhost:3000`.
3. Confirm the 3D Void runs behind all UI containers, responding to mouse movements.
4. Verify that dropdowns, panels, and forms look clean and glassmorphic.
5. In the **Quick Chat** box:
   - Select "NVIDIA NIM Cloud", enter a prompt, and verify response streaming/retrieval.
   - Select "Local Server" and check status.
6. Run a deep research task, wait for completion, and verify the report is saved to the **Past Deep Searches** list.
7. Verify reports follow professional layouts.
