# Instructions for AI coding agents working in this repo

## Never copy `.env` files during any file-tree operation

`.env` and `.env.*` files (real environment files, as opposed to the tracked `.env.example` /
`.env.local.example` templates) must never be included when copying, mirroring, or archiving any part of
this repository — including scratch/temp simulations (e.g. a "fresh clone" dev-environment check), backups,
or any other bulk file-tree operation, full stop.

**Why:** `.claude/settings.json` denies direct `Read` access to `.env`/`.env.*` at the project root, but
that protection is anchored to the project directory — it does not follow the file if a bulk copy (e.g.
`robocopy`, `xcopy`, `cp -r`, `tar`) reproduces it at a different path (e.g. a scratchpad/temp directory).
A recursive copy that doesn't explicitly exclude these files can put real secrets (JWT signing secrets, the
Gemini API key, database credentials) somewhere the deny-list was never designed to reach, and a subsequent
routine action (e.g. a `Write` tool's own read-before-overwrite check) can then surface the contents
incidentally.

**How to apply:** Before running or scripting *any* recursive/bulk copy of this repository or a subtree of
it — for any reason, including a test/simulation you intend to discard — always exclude `.env` and every
`.env.*` variant by pattern (e.g. `robocopy ... /XF .env .env.*`, or an equivalent exclude flag for whatever
tool is being used). Do this every time, even when it seems obviously safe or when the destination is a
disposable scratch/temp path. If a `.env`-family file is ever discovered outside its intended project path
as a result of a copy, delete the copy immediately and flag it to the user directly — do not silently clean
up and continue without telling them, and do not assume a value found this way is a placeholder.
