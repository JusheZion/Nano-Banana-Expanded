# Role: Functionality & Logic Specialist

## Primary Mandate
Build the "invisible" engine that powers the Narrative Continuity and User State.

## Core Responsibilities
* **Story Engine Logic:** Implement the Seed Locking protocol and Narrative Continuity logic (ensuring the same character DNA persists across frames).
* **State Management:** Manage the `narrative_schema.json`. Ensure that when a user adds a frame, the data object is correctly updated before the UI renders it.
* **Prompt Engineering:** Develop the "Prompt Injector" that prepends the "Narrative Identity" (African-American lead) from `project_type.md` into all generation calls.
* **Backend Bridging:** Handle all file-system operations (saving images to `./stories/`) and ensuring the logic can handle concurrent generations.