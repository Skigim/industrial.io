---
name: requesting-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
---

# Requesting Code Review

Dispatch a general-purpose subagent with a tight, skill-specific prompt to catch issues before they cascade. The reviewer gets precisely crafted context — only the diff and requirements relevant to the change, never your session's history. This keeps the reviewer focused on the work product, not your thought process, and preserves your own context for continued work.

**Core principle:** Review early, review often.

## When to Request Review

**Mandatory:**
- After each task in subagent-driven development
- After completing major feature
- Before merge to main

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing complex bug

## How to Request

**1. Get git SHAs:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Dispatch a general-purpose subagent with this prompt template:**

Fill in all placeholders before dispatching. Pass only the BASE/HEAD SHAs and the requirements — the reviewer generates the diff itself by running the `git diff` commands shown below. Do not include your session history or unrelated codebase context. The reviewer subagent must have read access to the repository so it can run `git diff` against the provided SHAs.

```
Task tool (general-purpose):
  description: "Code review: {DESCRIPTION}"
  prompt: |
    You are reviewing code changes for production readiness.

    ## Context Isolation

    You have been given exactly the information you need. Do not attempt to read
    additional files beyond what is provided unless a specific file path is
    referenced in the diff. Do not assume knowledge from any prior session context.

    ## What Was Implemented

    {DESCRIPTION}

    ## Requirements/Plan

    {PLAN_OR_REQUIREMENTS}

    ## Git Range to Review

    **Base:** {BASE_SHA}
    **Head:** {HEAD_SHA}

    Run these commands to get the diff:
    ```bash
    git diff --stat {BASE_SHA}..{HEAD_SHA}
    git diff {BASE_SHA}..{HEAD_SHA}
    ```

    ## Review Checklist

    **Code Quality:**
    - Clean separation of concerns?
    - Proper error handling?
    - DRY principle followed?
    - Edge cases handled?

    **Architecture:**
    - Sound design decisions?
    - Security concerns?

    **Testing:**
    - Tests actually test logic (not mocks)?
    - Edge cases covered?
    - All tests passing?

    **Requirements:**
    - All plan requirements met?
    - No scope creep?

    ## Output Format

    ### Strengths
    [What's well done? Be specific.]

    ### Issues

    #### Critical (Must Fix)
    [Bugs, security issues, data loss risks, broken functionality]

    #### Important (Should Fix)
    [Architecture problems, missing features, poor error handling, test gaps]

    #### Minor (Nice to Have)
    [Code style, optimization opportunities, documentation improvements]

    **For each issue:**
    - File:line reference
    - What's wrong
    - Why it matters
    - How to fix (if not obvious)

    ### Assessment

    **Ready to merge?** [Yes/No/With fixes]

    **Reasoning:** [Technical assessment in 1-2 sentences]
```

**Placeholders:**
- `{WHAT_WAS_IMPLEMENTED}` - What you just built
- `{PLAN_OR_REQUIREMENTS}` - What it should do (paste only the relevant task or requirements section)
- `{BASE_SHA}` - Starting commit
- `{HEAD_SHA}` - Ending commit
- `{DESCRIPTION}` - Brief summary

**3. Act on feedback:**
- Fix Critical issues immediately
- Fix Important issues before proceeding
- Note Minor issues for later
- Push back if reviewer is wrong (with reasoning)

## Example

```
[Just completed Task 2: Add verification function]

You: Let me request code review before proceeding.

BASE_SHA=$(git log --oneline | grep "Task 1" | head -1 | awk '{print $1}')
HEAD_SHA=$(git rev-parse HEAD)

[Dispatch general-purpose subagent with inline prompt]
  DESCRIPTION: Added verifyIndex() and repairIndex() with 4 issue types
  PLAN_OR_REQUIREMENTS: Task 2 from docs/superpowers/plans/deployment-plan.md (paste task text)
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661

[Subagent returns]:
  Strengths: Clean architecture, real tests
  Issues:
    Important: Missing progress indicators
    Minor: Magic number (100) for reporting interval
  Assessment: Ready to proceed

You: [Fix progress indicators]
[Continue to Task 3]
```

## Integration with Workflows

**Subagent-Driven Development:**
- Review after EACH task
- Catch issues before they compound
- Fix before moving to next task

**Executing Plans:**
- Review after each batch (3 tasks)
- Get feedback, apply, continue

**Ad-Hoc Development:**
- Review before merge
- Review when stuck

## Red Flags

**Never:**
- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback
- Pass your full session history or entire codebase to the reviewer subagent

**If reviewer wrong:**
- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification

