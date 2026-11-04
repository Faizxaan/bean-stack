---
id: dv-git-branching-merging
title: Git Branching and Merging
track: devops-cloud
section: git
order: 2
difficulty: Intermediate
importance: 5
tags: [Git, Branching, Merging]
prerequisites: [dv-git-fundamentals]
related: [dv-cicd-pipelines]
status: complete
lastUpdated: 2026-11-04
summary: How branches, merges, rebases, and pull requests work in practice, and how Java teams keep a main branch releasable.
---

## Overview

Branching is the feature that makes Git workflows possible. Because a branch is just a pointer to a commit, creating one is instant, and a team can give every feature, bug fix, and experiment its own branch without copying any code. Work happens in isolation, gets reviewed through a pull request, is checked by CI, and only then joins the main branch. This topic explains the mechanics of branching, merging, and rebasing, and the team conventions that keep those mechanics from turning into chaos.

For a Java developer, this is daily work, not theory. You will branch for a Spring Boot endpoint, rebase onto the latest main, resolve a conflict in a service class, and open a pull request that a teammate reviews before merge. Interviewers care about this topic because it reveals whether you can work safely in a shared codebase.

## Theory

### What a branch really is

A branch is a file containing the hash of the commit it points to. When you commit on a branch, Git creates a new commit whose parent is the old branch tip, then moves the branch pointer forward. Switching branches with `git switch` simply moves HEAD to another pointer and updates your working tree to match that commit. Nothing is copied or duplicated, which is why branching is cheap in Git and expensive in older systems that copied directories.

### Fast-forward and three-way merges

When you merge branch B into branch A, Git finds the merge base: the most recent commit shared by both branches. Two cases follow:

- **Fast-forward:** if A has not moved since the branch point, Git just moves A's pointer forward to B's tip. No new commit is created, and history stays linear.
- **Three-way merge:** if both branches moved, Git compares the merge base against each tip, combines the changes, and creates a merge commit with two parents. That merge commit preserves the fact that two lines of work were combined.

Many teams disable fast-forward merges for pull requests (`--no-ff`) so every merged feature leaves a visible merge commit, making history easier to read and revert as a unit.

### Merge versus rebase

Merging preserves history exactly as it happened, including the branch structure. Rebasing rewrites history: it takes your commits, temporarily sets them aside, moves your branch to the tip of another branch, and replays your commits on top, one by one. The result is a linear history that reads like a clean sequence, but the rewritten commits get new hashes and are no longer the commits you originally made.

The standard rule is: rebase your own private, unshared branch freely; never rebase a branch other people have already based work on, because rewriting shared history forces everyone else to repair their copies. Merge when you want to preserve the record of how work actually happened, such as merging a reviewed pull request into main.

### Conflicts

A conflict happens when two branches change the same lines, or one deletes a file the other modifies, and Git cannot decide which change wins. Git marks the conflicted region in the file with markers, and a human must choose or combine the changes, stage the result, and complete the merge or rebase. Conflicts are normal, not a sign of failure; they are Git telling you two people edited the same logic and a person needs to decide the correct outcome. In Java code, conflicts most often appear in service classes, configuration files, and `pom.xml` or `build.gradle` dependency sections.

### Pull requests and branching strategies

A pull request (merge request on GitLab) is a hosted-platform workflow built on top of branches: you push a branch, open a request to merge it into main, teammates review the diff, CI runs tests, and the branch merges only when checks pass. Common strategies include:

- **Trunk-based development:** short-lived branches, merged into main within a day or two, with feature flags for unfinished work. Favoured by teams that deploy frequently.
- **Git Flow:** long-lived `develop` and `main` branches plus feature, release, and hotfix branches. More ceremony, suited to scheduled releases.
- **GitHub Flow:** one main branch, feature branches, pull requests, and deploy from main. Simple and widely used for services.

The strategy matters less than the discipline: main stays releasable, every merge is reviewed and tested, and branches are deleted after merging so the branch list stays readable.

## Key Concepts

- **Merge base:** the latest commit common to both branches; the reference point for a three-way merge.
- **Merge commit:** a commit with two parents, recording that two lines of work were combined.
- **Rebase:** replaying commits onto a new base to linearise history; rewrites commit hashes, so only for unshared branches.
- **Cherry-pick:** applying a single commit from one branch onto another, useful for pulling a hotfix into a release branch without merging everything.
- **Stash:** temporarily shelving uncommitted changes so you can switch branches or pull, then restoring them with `git stash pop`.
- **Protected branch:** a hosting rule that forbids direct pushes to main and requires reviews and passing CI before merging.
- **Detached HEAD:** HEAD pointing at a commit instead of a branch; fine for inspecting history, risky for committing, since those commits have no branch keeping them reachable.

## Code Examples

### Creating and switching branches

```bash
git switch -c feature/order-validation
git branch
git switch main
git branch -d feature/order-validation
```

Explanation: `git switch -c` creates a branch and switches to it in one step. `git branch` lists local branches with the current one starred. `git branch -d` deletes a branch only if it is fully merged, which protects you from deleting unmerged work; `-D` forces deletion.

### Merging a feature branch

```bash
git switch main
git pull origin main
git merge --no-ff feature/order-validation
git push origin main
git branch -d feature/order-validation
```

Explanation: updating main first keeps the merge base recent and reduces conflicts. `--no-ff` creates a merge commit even when a fast-forward would be possible, so the feature remains visible as a unit in history. Deleting the branch after merging keeps the branch list clean.

### Rebasing a feature branch onto the latest main

```bash
git switch feature/order-validation
git fetch origin
git rebase origin/main
git push --force-with-lease origin feature/order-validation
```

Explanation: rebasing replays your commits on top of the latest main, so the final history reads linearly. Because rebase rewrites hashes, you must force-push the rewritten branch; `--force-with-lease` is the safe form because it refuses to overwrite work someone else pushed since your last fetch.

### Resolving a merge conflict

```bash
git merge feature/payment-refactor
git status
```

Explanation: `git status` lists the conflicted files. Open each one, find the conflict markers, decide the correct combined code, remove the markers, then finish with the commands below.

```bash
git add src/main/java/com/example/PaymentService.java
git commit
git log --oneline --graph -5
```

Explanation: staging a resolved file marks that conflict as resolved. Committing completes the merge, and the graph view confirms the merge commit with its two parents. Never commit a file that still contains conflict markers; searching for `<<<<<<<` before committing catches that mistake.

### Stashing work to switch branches quickly

```bash
git stash push -m "WIP order validation"
git switch main
git stash pop
```

Explanation: stashing shelves uncommitted changes so you can switch branches cleanly, for example to fix an urgent bug on main. `git stash pop` restores the changes and drops the stash entry; if the restore conflicts, resolve it the same way as a merge conflict.

### Picking a single hotfix commit onto another branch

```bash
git switch release-1.2
git cherry-pick a1b2c3d
git log --oneline -3
```

Explanation: cherry-pick copies one commit's changes onto the current branch as a new commit. Use the commit hash from `git log`. It is the right tool when a fix belongs on a release branch but the rest of the feature branch must not be merged there.

## Best Practices

- Keep branches short-lived and focused on one feature or fix; a branch that lives for weeks accumulates conflicts and becomes hard to review.
- Rebase your private feature branch onto main before opening or updating a pull request, so CI tests the code as it will actually land.
- Open small pull requests. A reviewer can properly review a few hundred lines; a thousand-line pull request gets skimmed and bugs slip through.
- Protect main: require pull requests, at least one approval, and passing CI before merging, and forbid direct pushes.
- Delete merged branches promptly, both locally and on the remote, so `git branch -a` stays readable.
- Never force-push a shared branch. If history on a shared branch is wrong, fix it forward with a revert commit rather than rewriting history others depend on.
- Resolve conflicts by understanding both changes, not by picking one side blindly. In Java code, blindly keeping one side can silently drop a validation or a null check.

## Common Mistakes

- Rebasing a shared branch and then wondering why teammates' pulls fail or duplicate commits appear.
- Force-pushing with `--force` instead of `--force-with-lease`, overwriting a teammate's push.
- Committing on a detached HEAD, switching away, and losing the commit because no branch points at it.
- Letting a feature branch drift for weeks, then facing a huge conflict that is hard to resolve correctly.
- Resolving a conflict by deleting both sides' changes or leaving conflict markers in the file, then committing it.
- Merging main into a feature branch repeatedly (merge bubbles) instead of rebasing, producing a tangled history that is hard to read and revert.
- Opening a pull request that mixes a feature, a refactor, and unrelated formatting changes, making review slow and risky.

## Interview Importance

Branching and merging questions separate developers who have worked in a team from those who have only used Git alone. Expect questions on merge versus rebase, fast-forward merges, conflict resolution, and what to do when bad code reaches main. Strong answers show judgement, not just commands: when to rebase, when to merge, why main is protected, and how you would recover from a bad merge without rewriting shared history. Senior candidates should also be able to discuss branching strategy trade-offs for a team that deploys daily versus one that ships scheduled releases.

## Interview Questions

- **What is the difference between merge and rebase?** Merge combines histories and creates a merge commit, preserving the branch structure; rebase replays commits onto a new base for a linear history but rewrites commit hashes, so it is only safe on unshared branches.
- **What is a fast-forward merge?** When the target branch has not moved since the branch point, Git simply moves its pointer forward instead of creating a merge commit.
- **How do you resolve a merge conflict?** Open the conflicted files, read both sides around the markers, write the correct combined code, remove the markers, stage the files, and commit to complete the merge.
- **A bad commit reached main. How do you fix it?** Revert it with a new commit that undoes its changes, rather than rewriting main's history, because teammates may already have based work on it.

## Revision Summary

- Branches are cheap pointers; HEAD tracks the current branch.
- Fast-forward moves a pointer; three-way merge creates a merge commit with two parents.
- Rebase linearises private history; merge preserves shared history. Never rebase a shared branch.
- Conflicts are resolved by a human choosing the correct combined code, then staging and committing.
- Keep branches short, small, reviewed, and deleted after merging; keep main protected and releasable.
