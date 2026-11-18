# Quality bar

What "good enough to ship" means in this project. You own this file: the factory's agents read it and may not change it.
The Reviewer treats a change that misses a bar as something to fix, and the factory refuses a change that lowers a check
(a skipped test, a silenced warning, a lowered threshold) unless the Builder gives a reason you then judge.

## Always

- The gate commands in `factory.config.json` pass.
- New behaviour comes with a test that fails without it.
- No check is silenced, skipped or loosened to get to green.
- No secret is written into a file.

## This project's bars

Change a value, or delete a line you do not want. "Hold" means: where the project is today is the floor, and a change
may not go below it.

- Largest change in one task: 400 lines
- Test coverage: hold (put the coverage command and its threshold in the gate; lowering the threshold is refused)
- Accessibility of user-facing screens: WCAG 2.1 AA
- Performance: hold (no screen or endpoint slower than today)
- Dependencies: no new one for what a few lines do
