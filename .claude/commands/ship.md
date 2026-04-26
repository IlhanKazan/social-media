---
description: Review and commit the current uncommitted changes.
---

Run reviewer → committer for whatever is currently uncommitted in the
working tree.

1. First check `git status` to confirm there are changes to review.
2. Invoke the **reviewer** subagent against the current diff.
3. If reviewer approves, invoke the **committer** subagent.
4. If reviewer flags blockers, surface them to the user — do NOT auto-fix
   and do NOT commit.

Do not run the engineer agents. This command is for finalizing work that is
already done.
