# copilot-instructions

rule: concision > grammar
rule: smallest delta always
rule: zero drift
rule: semantic git commits only
rule: ask if unclear, never assume

authority:
1 CONTEXT-SESSION.md
2 TODO.md
3 .instructions/decision-tree.md (on demand)

workflow:
read TODO.md
update CONTEXT-SESSION.md
route via decision-tree
execute smallest safe change
verify minimal
semantic commit
update TODO.md
purge notes

validation:
if CONTEXT focus != TODO P1 → escalate
if decision unknown → conflict node
if verify fails twice → recovery node
