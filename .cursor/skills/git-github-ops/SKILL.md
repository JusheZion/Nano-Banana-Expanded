---
name: git-github-ops
description: Safely manages git fetch, pull, and push operations for the current repository. Use when the user asks to sync with GitHub, push local commits, pull remote changes, or check git status/branch information.
---

# Git & GitHub Operations Helper

This skill defines how to safely run git operations (status, fetch, pull, push) for this project’s repository.
It assumes the remote `origin` is already configured (here: `https://github.com/JusheZion/Nano-Banana-Expanded.git`).

## When to Use This Skill

Use this skill whenever:

- The user says they want to **push** changes to GitHub.
- The user wants to **pull** or **sync** with GitHub.
- The user asks about **git status**, **current branch**, or **what will be pushed**.
- The user mentions **merge conflicts**, **diverged branches**, or **“up to date with origin?”**.

Do **not** use this skill:

- To rewrite history (rebase, reset, force-push) unless the user explicitly requests it.
- To change git configuration (user.name, user.email, hooks, etc.).

## Core Safety Rules

1. **Never modify git config**
   - Do not run `git config` commands.
2. **Never use destructive commands by default**
   - Avoid `git reset --hard`, `git push --force`, or branch deletion unless the user explicitly asks and understands the risk.
3. **Always show the user what will happen**
   - Before pushing, summarize which commits/files are going up.
   - Before pulling, state which branch you’re pulling and from which remote.
4. **Prefer fast-forward merges**
   - Use `git pull --ff-only` unless the user asks for a merge or rebase strategy.

## Standard Workflows

### 1. Check Repository State

When the user asks “what’s the status” or before push/pull, run:

```bash
git status
git branch --show-current
git remote -v
```

Then:

- Report:
  - Current branch name.
  - Whether there are **unstaged changes**, **staged changes**, or the working tree is clean.
  - Whether the branch is **ahead/behind** `origin/<branch>`.

### 2. Prepare to Push Local Changes

Use this when the user wants to push their work to GitHub.

1. **Confirm branch and cleanliness**
   - Run `git status`.
   - If there are **unstaged changes** that the user hasn’t asked to commit, either:
     - Ask whether to include them, or
     - Restrict the commit to files they explicitly mention.
2. **Show diff (optional but recommended)**
   - `git diff` for unstaged changes.
   - `git diff --cached` for staged changes.
3. **Create commit (only when user requests)**
   - Stage appropriate files: `git add <paths>`.
   - Commit with a clear message: `git commit -m "<message>"`.
4. **Push to origin**
   - First push on this branch:
     - `git push -u origin <branch>`
   - Subsequent pushes:
     - `git push`
5. **Report result**
   - Confirm the push succeeded and mention the branch and remote.

### 3. Fetch & Pull Remote Changes

Use this when the user wants to update from GitHub.

1. **Ensure a clean working tree**
   - Run `git status`.
   - If there are uncommitted changes:
     - Explain that pulling with a dirty tree can cause complications.
     - Either:
       - Help the user commit/stash first, or
       - Only proceed if they explicitly accept the risk.
2. **Fetch remote refs**

```bash
git fetch --all --prune
```

3. **Pull current branch**

```bash
git pull --ff-only
```

4. **If pull fails with “non-fast-forward”**
   - Explain that local and remote histories have diverged.
   - Offer options:
     - Rebase onto origin (e.g., `git pull --rebase`) if user wants a linear history.
     - Merge (plain `git pull`) if user is comfortable with merge commits.
     - Or resolve manually before proceeding.

### 4. Handling Merge Conflicts (High-Level)

When a conflict occurs:

1. Run:

```bash
git status
```

2. Identify conflicted files and communicate them clearly.
3. For each file the user wants help with:
   - Open the file.
   - Explain the `<<<<<<<`, `=======`, `>>>>>>>` sections.
   - Propose a resolved version and apply it if the user agrees.
4. After resolving all conflicts:

```bash
git add <resolved files>
git commit   # completes the merge or rebase
```

5. Finally, push:

```bash
git push
```

## Interaction Guidelines

- Always operate in the project root: `/Users/apoaaron/.gemini/antigravity/Nano Banana Expanded`.
- Before running any git command that changes history or remote state, **summarize** what will happen in plain language.
- If the user seems unsure about git, favor:
  - **Status and explanation first**, then
  - Ask for confirmation before commit/push/pull.

## Examples

### Example: User says “push my latest changes”

1. Run `git status` and report:
   - Current branch.
   - Which files are modified.
2. Ask (if not specified):
   - “Do you want to commit all modified files, or only specific ones?”
3. After committing:
   - Run `git push`.
4. Confirm:
   - “Pushed branch `<branch>` to `origin` on GitHub.”

### Example: User says “pull latest from GitHub”

1. Run `git status`:
   - If dirty: ask whether to commit/stash first.
2. Run:

```bash
git fetch --all --prune
git pull --ff-only
```

3. Report whether:
   - The branch is now up to date, or
   - There were conflicts (and handle them as above).

