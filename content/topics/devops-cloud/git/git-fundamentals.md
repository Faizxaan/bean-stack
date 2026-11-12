---
id: dv-git-fundamentals
title: Git Fundamentals
track: devops-cloud
section: git
order: 1
difficulty: Beginner
importance: 5
tags: [Git, Version Control]
prerequisites: []
related: [dv-git-branching-merging, dv-cicd-pipelines]
status: complete
lastUpdated: 2026-11-12
summary: How Git tracks changes as snapshots, what the working tree staging area and repository are, and the everyday commands every Java developer uses.
---

## Overview

Git is the version control system almost every Java team uses, and it is the foundation for everything else in this track: pull requests, code review, continuous integration, and safe releases all assume you can use Git well. At its heart, Git does not store a list of file differences.

It stores snapshots. Each commit is a snapshot of your whole project at a point in time, plus a message, an author, a timestamp, and a pointer to the previous commit. That design is what makes branching cheap, history readable, and mistakes recoverable.

For a Java developer, Git is not a separate "DevOps skill" that lives apart from coding. You commit a Spring Boot feature, push it, open a pull request, and a CI pipeline builds and tests exactly that commit. If you understand commits, the staging area, and remotes, the rest of the DevOps track becomes much easier to follow.

## Theory

### Snapshots, not diffs

Many older version control tools stored the changes between versions. Git stores a snapshot of every file in each commit, using content-addressed storage: a file's content is hashed, and identical content is stored only once. Two commits that share an unchanged file point at the same stored content. This is why checking out an old commit is fast and why Git can compare any two states of the project quickly.

Each commit has a SHA-1 (in newer Git, optionally SHA-256) hash computed from its content, parent, author, and message. Change any of those and the hash changes, which makes history tamper-evident: you cannot silently rewrite a commit without changing its identity.

### The three areas

Every Git working copy has three areas, and most confusion about Git comes from mixing them up:

- **Working tree:** the files you actually edit in your editor.
- **Staging area (index):** a holding area for the exact changes you want in your next commit. You add files here deliberately with `git add`.
- **Repository (.git directory):** the committed history, including every commit object, branch pointer, and tag.

A file moves from working tree to staging area with `git add`, from staging area to repository with `git commit`, and from repository back to your working tree with `git checkout` or `git switch`. Nothing is lost when you stage: staging only records what the next commit will contain.

### Local and remote

Git is distributed. Your local repository is a complete copy of history, so you can commit, branch, and inspect history offline. A remote, usually called `origin`, is just another copy, typically hosted on GitHub or GitLab. `git push` sends your commits to a remote; `git fetch` downloads new commits without changing your working files; `git pull` fetches and then merges (or rebases, depending on configuration) into your current branch.

### Branches are pointers

A branch is not a copy of the code. It is a lightweight, movable pointer to a commit. Creating a branch costs almost nothing, which is why Git workflows branch freely for every feature, fix, and experiment. The special pointer `HEAD` records which branch (and therefore which commit) you currently have checked out. The next topic covers branching and merging in depth.

## Key Concepts

- **Commit:** a snapshot plus metadata (author, message, parent). Commits form a directed history graph, not a straight line, once branches and merges appear.
- **Staging area (index):** lets you craft a commit from part of your changes, so one commit holds one logical change even if you edited several things.
- **HEAD:** a pointer to the current branch and commit. "Detached HEAD" means HEAD points directly at a commit rather than a branch; commits made there can be lost if you switch away without creating a branch.
- **Remote and origin:** a remote is a named reference to another repository. `origin` is simply the conventional name for the remote you cloned from.
- **Merge vs rebase:** merging combines histories and preserves both lines of work; rebasing replays your commits on top of another branch to produce a linear history. Both are covered in the branching topic.
- **.gitignore:** a file listing patterns Git should never track, such as `target/`, `*.class`, `*.jar`, IDE folders, and local environment files. Ignoring build output keeps the repository clean and small.
- **Tag:** a fixed pointer to a commit, usually marking a release such as `v1.2.0`. Unlike a branch, a tag does not move when you commit.

## Code Examples

### Starting a repository and making your first commit

```bash
git init
git add .
git commit -m "Initial commit: Spring Boot hello service"
git log --oneline
```

Explanation: `git init` creates the `.git` directory. `git add .` stages everything in the current directory. `git commit` records the snapshot. `git log --oneline` shows one line per commit so you can verify the history.

### Cloning and working with a remote

```bash
git clone https://github.com/<your-org>/<your-repo>.git
cd <your-repo>
git status
git remote -v
```

Explanation: `git clone` copies the remote repository and sets up `origin` for you. `git status` is the command to run whenever you are unsure what state you are in; it shows staged, unstaged, and untracked files and which branch you are on.

### The everyday edit, stage, commit cycle

```bash
git status
git diff
git add src/main/java/com/example/OrderService.java
git diff --cached
git commit -m "Validate order total before saving"
git push origin main
```

Explanation: `git diff` shows unstaged changes, while `git diff --cached` shows what is staged and therefore what the next commit will contain. Staging one file at a time lets you keep unrelated changes out of a commit. Pushing sends the commit to the remote branch of the same name.

### Inspecting history and undoing safely

```bash
git log --oneline --graph --all
git show HEAD
git restore src/main/java/com/example/OrderService.java
git restore --staged src/main/java/com/example/OrderService.java
```

Explanation: `git restore` without `--staged` discards unstaged working-tree changes for a file, which is destructive, so use it deliberately. With `--staged` it only unstages, leaving your edits intact. `git show HEAD` displays the latest commit and its changes.

### A sensible .gitignore for a Java project

```bash
cat > .gitignore << 'EOF'
target/
*.class
*.jar
*.war
.idea/
*.iml
.vscode/
.DS_Store
EOF
git add .gitignore
git commit -m "Ignore build output and IDE files"
```

Explanation: build output is regenerated by Maven or Gradle, so it never belongs in version control. Committing it bloats the repository and causes needless conflicts. IDE files are personal; sharing them creates churn when teammates use different editors.

## Best Practices

- Write commits as one logical change with a clear message: a short summary line in the imperative mood ("Fix null check in order validation"), with a body explaining why when the reason is not obvious.
- Commit early and often on your own branch. Small commits are easier to review, revert, and bisect than one giant commit at the end of a feature.
- Check `git status` and `git diff --cached` before every commit so you never commit debug code, credentials, or unrelated files by accident.
- Never commit secrets, passwords, or private keys. Use environment variables or a secret store instead, and rotate any secret that reaches Git history, since removing it from the latest commit does not remove it from history.
- Keep `target/`, `*.class`, and `*.jar` out of the repository with `.gitignore` from day one.
- Pull or fetch regularly so your branch does not drift far from the main branch; long-lived divergence is what makes merges painful.

## Common Mistakes

- Committing everything with `git add .` without reviewing: this sweeps in debug files, local configuration, and sometimes secrets.
- Committing build output (`target/`, jars) because no `.gitignore` was created, then fighting merge conflicts on generated files.
- Working directly on `main` and pushing half-finished work, instead of a feature branch that can be reviewed and tested first.
- Treating `git pull` as magic: it fetches and merges, so if you have uncommitted changes that conflict, the pull will stop and ask you to resolve them. Fetching first and inspecting with `git log` avoids surprises.
- Using `git push --force` on a shared branch. Force-pushing rewrites history other people may already have based work on; it is acceptable on your own short-lived branch, never casually on a shared one.
- Writing vague messages like "fix" or "changes" that make `git log` useless when someone later hunts a regression with `git bisect`.

## Interview Importance

Git is asked about at every level, often as a warm-up that interviewers use to judge day-to-day engineering habits. At junior levels, expect the three areas, `add` versus `commit`, and how to undo a change. At mid and senior levels, expect branching strategy, merge versus rebase, resolving conflicts, and what to do when a bad commit or a secret reaches a shared branch. The strongest answers connect Git to the team's workflow: commits become pull requests, pull requests trigger CI, and tags mark releases.

## Interview Questions

- **What is the difference between `git fetch` and `git pull`?** Fetch downloads new commits without touching your working files; pull fetches and then merges (or rebases) into your current branch.
- **What is the staging area for?** It lets you choose exactly which changes go into the next commit, so each commit holds one logical change.
- **Why is Git called distributed?** Every clone contains the full history, so you can commit, branch, and inspect history without a server; the remote is a convention, not a requirement.
- **How do you undo the last commit but keep your changes?** Use `git reset --soft HEAD~1`, which moves the branch pointer back one commit while leaving staged and working-tree changes intact. For discarding changes entirely, prefer `git restore` on specific files rather than a hard reset you have not thought through.

## Revision Summary

- Git stores snapshots, addressed by content hash, not a chain of diffs.
- Working tree to staging area (`git add`) to repository (`git commit`); remotes sync with push, fetch, and pull.
- Branches are cheap pointers to commits; HEAD points at the current branch.
- Stage deliberately, commit small logical changes with clear messages, never commit secrets or build output.
- `git status` is the command to run whenever you are unsure of the state of your working copy.
