# decision-tree

purpose:
deterministic next action routing

nodes:
0 path → branch/path.md
1 classify → branch/classify.md
2 plan → branch/plan.md
3 prereq → branch/prereq.md
4 execute → branch/execute.md
5 verify → branch/verify.md
6 commit → branch/commit.md
7 reconcile → branch/reconcile.md
8 recovery → branch/recovery.md
9 conflict → branch/conflict.md

flow:
start → path (if ambiguous → conflict)
path → classify → plan → prereq
prereq pass → execute → verify
verify pass → commit → reconcile → done
verify fail once → execute (retry)
verify fail twice → recovery
any unknown → conflict

rule:
stop first match
never skip verify
ask if unclear
