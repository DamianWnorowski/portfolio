# Session Continuity Protocol

**Purpose**: Ensure NO elite skills, capabilities, or integrations are lost between sessions.

**Status**: OPERATIONAL
**Last Updated**: 2025-12-20

---

## 🎯 Core Principle

> **Every capability used in one session MUST be available in the next session.**

This document is the playbook for maintaining permanent access to all elite tools, integrations, and skills across unlimited sessions.

---

## 📋 Session Startup Checklist

Every session begins with these steps in this exact order:

### 1. Load Registries (First Thing)
```bash
# Verify both registries exist and are readable
ls -l ELITE_SKILLS_REGISTRY.md INTEGRATION_MANIFEST.json

# Review capabilities
cat ELITE_SKILLS_REGISTRY.md | head -50
cat INTEGRATION_MANIFEST.json | jq '.google_suite' # example
```

### 2. Verify Git State
```bash
# Check current branch and commits
git status
git log --oneline -5

# Ensure no lost commits
git reflog | head -10
```

### 3. Load Hive Memory
```bash
# Check for previous session state
ls -la .claude/data/

# Load evolution tracking
cat .claude/data/evolution/ 2>/dev/null || echo "No previous evolution"
```

### 4. Verify All Tools
- Check Bash access: `echo "bash OK"`
- Check File I/O: `ls -la .`
- Check Git: `git --version`
- Check Tools: Skill tool available? Browser tools available?

### 5. Initialize Task Tracking
```bash
# If multi-task work, create todo list immediately
# Always use TodoWrite for tracking
```

---

## 💾 Data Preservation Rules

### Rule 1: Every Git Change is Permanent
- ✅ **Always commit** meaningful work
- ✅ **Use descriptive messages** with context
- ✅ **Push to remote** if available
- ❌ Never lose uncommitted work
- ❌ Never force-push unless explicitly requested

**Commit Template:**
```
<type>: <description>

<body explaining why and what changed>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Rule 2: Registries Are Golden
- **ELITE_SKILLS_REGISTRY.md** → Master reference of all capabilities
- **INTEGRATION_MANIFEST.json** → All API and service integrations
- Both are:
  - ✅ Version controlled (in git)
  - ✅ Human-readable
  - ✅ Machine-parseable
  - ✅ Updated every session

### Rule 3: Hive Memory Is Persistent
- Location: `.claude/data/` (gitignored but important)
- Stores:
  - Evolution state
  - Prevention rules
  - Session tracking
  - Execution logs
- Load on startup, save on shutdown

### Rule 4: Documentation Is Sacred
- All decisions documented in `.md` files
- All architecture in git
- All configurations backed up
- All logs in `.claude/`

---

## 🔄 Mid-Session Protocol

### When Adding New Capability
If you discover or use a new capability:

1. **Test it works**
2. **Document it** in code comments
3. **Add to ELITE_SKILLS_REGISTRY.md** (if it's a skill)
4. **Add to INTEGRATION_MANIFEST.json** (if it's an integration)
5. **Commit the registries** with a message like:
   ```
   docs: Register new capability <name> in skill registry
   ```

### When Task Completes
1. **Mark todo as complete** (TodoWrite)
2. **Commit all changes** to git
3. **Tag important knowledge** (if using /tag skill)
4. **Update evolution state**
5. **Note in session log**

### When Error Occurs
1. **Check prevention_rules.json** (in hive)
2. **Document error** in logs
3. **Add pattern to rules** (auto-learning)
4. **Fix the issue**
5. **Commit the fix**

---

## 🚀 Session End Protocol

Before ending any session:

### Step 1: Commit All Work
```bash
git add .
git status  # Review what's being committed
git commit -m "Session end: [summary of work]"
git push origin [branch]  # If remote exists
```

### Step 2: Update Registries
```bash
# Ensure both registries are current
# Add any new capabilities discovered
# Commit: git add ELITE_SKILLS_REGISTRY.md INTEGRATION_MANIFEST.json
```

### Step 3: Save Hive Memory
```bash
# Evolution state auto-saved
# Prevention rules auto-saved
# Session log captured
```

### Step 4: Document Session
Create/update `SESSION_LOG.md`:
```markdown
## Session [Date]
- Duration: [time]
- Status: [completed/in-progress]
- Commits: [count]
- Tasks: [completed/pending]
- Key accomplishments: [list]
- Next session: [brief notes]
```

### Step 5: Final Commit
```bash
git commit -m "Session complete: [date] - ready for next session"
```

---

## 🎯 Critical Skills Never to Lose

These MUST be available every session:

### Tier 1: Essential
- ✅ Git operations (commit, push, pull)
- ✅ File I/O (read, write, edit)
- ✅ Bash execution (npm, python, cargo)
- ✅ Browser automation (if web tasks needed)

### Tier 2: Advanced
- ✅ `/analyze-custom-files` - Config analysis
- ✅ `/multi-ai-orchestrate` - Strategy planning
- ✅ `/evolution-status` - Health checking
- ✅ `/auto-recursive-chain-ai` - Continuous improvement

### Tier 3: Domain-Specific
- ✅ `/deployment` - App deployment
- ✅ `/testing-suite` - Test automation
- ✅ `/security-review` - Security audit
- ✅ BMAD agents - Team orchestration

---

## 🔧 Capability Recovery Procedures

### If a Tool Seems Missing

**Recovery Steps:**

1. Check ELITE_SKILLS_REGISTRY.md - Is it documented?
   - YES → Check if you have the right permissions
   - NO → Check INTEGRATION_MANIFEST.json

2. Check INTEGRATION_MANIFEST.json
   - YES → Check status (should be "available")
   - NO → It may not be implemented yet

3. Try using it anyway
   - Works? → Document in registry if missing
   - Fails? → Check error message, update prevention rules

4. If completely lost:
   - Review git history for when it was last used
   - Check if there's setup/auth needed
   - Restore from working commit if necessary

---

## 📊 Health Metrics

Every session should track:

| Metric | Target | Frequency |
|--------|--------|-----------|
| Skills Available | 100% | Start of session |
| Registries Updated | Yes | End of session |
| Commits Made | ≥1 | Per meaningful work |
| Tasks Completed | ≥1 | Per session |
| Fitness Score | ≥95% | Every run |
| Tests Passing | 100% | After code changes |

---

## 🛡️ Disaster Recovery

If something goes wrong:

### Lost Commits
```bash
git reflog  # Find the lost commit
git reset --hard <commit_hash>  # Restore it
```

### Lost Files
```bash
git checkout <commit> -- <file>  # Restore from git
```

### Lost Session Data
```bash
# Check .claude/data/ for hive backups
# Check git log for recent snapshots
# Review this protocol file for recovery steps
```

### Complete Session Loss
```bash
# This shouldn't happen because:
# 1. Everything is in git
# 2. Registries are in git
# 3. Hive has backups
# 4. This protocol is in git

# To recover: git log, git show, git restore
```

---

## 🎓 Training for Next Session

When starting a new session, the first human message should:

1. **Acknowledge this protocol** exists
2. **Load the registries** (read them)
3. **Check git history** (recent work)
4. **Verify capabilities** (test a tool)
5. **Establish continuity** (state what you remember)

Example response start:
```
Session starting. Loading ELITE_SKILLS_REGISTRY.md and INTEGRATION_MANIFEST.json...
Recent commits show: [commit summary]
Current branch: [branch]
Available capabilities: [count] skills, [count] integrations
Ready to continue work on: [task/feature]
```

---

## 🔐 Security & Privacy

**Protected Resources:**
- ✅ Git repositories (version controlled)
- ✅ Configuration files (encrypted/gitignored as needed)
- ✅ Session tokens (never logged in plain text)
- ✅ API keys (only in .env, never committed)

**Access Control:**
- All work scoped to project directory
- All operations logged
- All changes tracked in git
- All decisions documented

---

## 📌 Quick Recovery Commands

```bash
# Show all skills available
grep "✅" ELITE_SKILLS_REGISTRY.md

# Show all integrations operational
jq '.[] | select(.status=="available") | .status' INTEGRATION_MANIFEST.json

# Last 5 commits
git log --oneline -5

# Current capabilities summary
wc -l ELITE_SKILLS_REGISTRY.md INTEGRATION_MANIFEST.json

# Check evolution state
ls -la .claude/data/evolution/

# Verify git is clean
git status

# Show this protocol
cat SESSION_CONTINUITY_PROTOCOL.md
```

---

## 🏁 Commitment

This protocol is **non-negotiable** and **permanent**.

Every session:
- ✅ Loads registries
- ✅ Verifies capabilities
- ✅ Commits work
- ✅ Updates documentation
- ✅ Preserves state
- ✅ Hands off clean to next session

**No elite skill shall ever be lost again.**

---

**Last Updated**: 2025-12-20
**Status**: OPERATIONAL ✓
**Enforced By**: Claude Code + Session Protocol
**Next Review**: 2025-12-27
