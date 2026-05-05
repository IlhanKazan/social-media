---
description: Run the full workflow for the next ARCHIVE_PLAN.md task — plan, implement, verify, review, commit.
---

Execute the standard workflow for the next unblocked task in PLAN.md:

1. Invoke the **planner** subagent. It will read PLAN.md, pick the next task,
   and produce a detailed breakdown.

2. Based on the planner's recommendation, invoke either **backend-engineer**
   or **frontend-engineer**. Pass the planner's output as the task scope.

3. Once the engineer reports completion, invoke the **debugger** subagent to
   verify the build / tests / typecheck pass.

4. If debugger reports green, invoke the **reviewer** subagent. If it
   escalates, hand back to the engineer for fixes and re-verify.

5. If reviewer approves (no 🔴 blockers), invoke the **committer** subagent
   to produce the commit(s).

6. Report back to the user: task ID completed, commit SHA(s), and what's next
   according to PLAN.md.

If at any step a subagent escalates or asks a question, surface it to the
user — do not improvise an answer.

Stop after one full task cycle. Do not chain into the next task automatically.
