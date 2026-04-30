# obratemplate

A quick-start template for using [Superpowers](https://github.com/obra/superpowers) with **GitHub Copilot** (VSCode / GitHub Copilot coding agent).

Superpowers is a software development methodology for AI coding agents, built on composable skills. This template vendors the full `skills/` library and wires it up for GitHub Copilot via `.github/copilot-instructions.md`.

## What's Included

- **`skills/`** — All Superpowers skills, vendored from [obra/superpowers](https://github.com/obra/superpowers)
- **`.github/copilot-instructions.md`** — Persistent instructions that activate the skills system for GitHub Copilot

## How to Use This Template

### Option 1: Use as a GitHub Template Repository

Click **"Use this template"** at the top of this page to create a new repository with these files pre-installed.

### Option 2: Copy into an Existing Project

```bash
# Copy the skills directory and copilot instructions into your project
cp -r skills/ /path/to/your/project/
cp -r .github/ /path/to/your/project/
```

Then commit both directories.

## How It Works

Once the files are in your repository, **GitHub Copilot will automatically read `.github/copilot-instructions.md`** on every request in VS Code and the GitHub Copilot coding agent. This file tells Copilot:

- Where to find the vendored skills (`skills/` directory)
- When to invoke each skill
- How to map Copilot tool names to skill tool references
- The core process rules (TDD, systematic debugging, verification before completion, etc.)

### The Basic Workflow

1. **brainstorming** — Before writing code, explore requirements, propose approaches, get approval
2. **writing-plans** — Break approved design into bite-sized TDD tasks with exact file paths and code
3. **subagent-driven-development** or **executing-plans** — Execute the plan task by task with review checkpoints
4. **test-driven-development** — RED→GREEN→REFACTOR on every task
5. **systematic-debugging** — Root cause investigation before any fix
6. **verification-before-completion** — Run commands, see output, THEN claim success
7. **requesting-code-review** — Review after each task or before merging
8. **finishing-a-development-branch** — Merge, PR, or discard with structured options

### Skills Available

| Skill | Purpose |
|-------|---------|
| `using-superpowers` | Introduction — read first |
| `brainstorming` | Design before implementation |
| `writing-plans` | Detailed implementation plans |
| `executing-plans` | Batch plan execution with checkpoints |
| `subagent-driven-development` | Fresh subagent per task with two-stage review |
| `test-driven-development` | RED-GREEN-REFACTOR cycle |
| `systematic-debugging` | 4-phase root cause process |
| `verification-before-completion` | Evidence before success claims |
| `requesting-code-review` | Pre-review checklist |
| `receiving-code-review` | Responding to feedback |
| `using-git-worktrees` | Isolated development branches |
| `finishing-a-development-branch` | Merge/PR decision workflow |
| `dispatching-parallel-agents` | Concurrent subagent workflows |
| `writing-skills` | Create new skills |

## Keeping Skills Up to Date

To update the vendored skills to the latest version from [obra/superpowers](https://github.com/obra/superpowers):

```bash
curl -sL https://codeload.github.com/obra/superpowers/tar.gz/refs/heads/main | \
  tar -xz --strip-components=1 superpowers-main/skills
```

## Credits

Skills are from [obra/superpowers](https://github.com/obra/superpowers) by [Jesse Vincent](https://blog.fsck.com) / [Prime Radiant](https://primeradiant.com), licensed under MIT.
