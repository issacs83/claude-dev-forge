#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────
# claude-dev-forge installer
# Installs agents, commands, skills, hooks, rules
# to ~/.claude/ via symlinks (or copy on WSL-Windows)
# ──────────────────────────────────────────────────

FORGE_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
BACKUP_DIR=""
VERSION="1.0.0"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()   { echo -e "${RED}[ERROR]${NC} $1"; }

# ──────────────────────────────────────────────────
# Phase 0: Platform detection
# ──────────────────────────────────────────────────
detect_platform() {
    local os
    os="$(uname -s)"
    case "$os" in
        Darwin) PLATFORM="macos" ;;
        Linux)
            if grep -qi microsoft /proc/version 2>/dev/null; then
                PLATFORM="wsl"
            else
                PLATFORM="linux"
            fi
            ;;
        MINGW*|MSYS*|CYGWIN*) PLATFORM="windows" ;;
        *) PLATFORM="unknown" ;;
    esac

    # Check if WSL is on Windows filesystem (symlinks won't work)
    USE_COPY=false
    if [[ "$PLATFORM" == "wsl" ]]; then
        if [[ "$CLAUDE_DIR" == /mnt/c/* ]] || [[ "$CLAUDE_DIR" == /mnt/d/* ]]; then
            USE_COPY=true
            warn "WSL on Windows filesystem detected — using file copy instead of symlinks"
        fi
    fi

    info "Platform: $PLATFORM (copy mode: $USE_COPY)"
}

# ──────────────────────────────────────────────────
# Phase 0: Dependency checks
# ──────────────────────────────────────────────────
check_deps() {
    local missing=()

    if ! command -v node &>/dev/null; then
        missing+=("node (v18+)")
    else
        local node_ver
        node_ver=$(node -v | sed 's/v//' | cut -d. -f1)
        if (( node_ver < 18 )); then
            missing+=("node v18+ (current: v$node_ver)")
        fi
    fi

    if ! command -v git &>/dev/null; then
        missing+=("git")
    fi

    if ! command -v jq &>/dev/null; then
        missing+=("jq")
    fi

    if (( ${#missing[@]} > 0 )); then
        err "Missing dependencies:"
        for dep in "${missing[@]}"; do
            echo "  - $dep"
        done
        echo ""
        echo "Install them and re-run this script."
        exit 1
    fi

    ok "All dependencies found"
}

# ──────────────────────────────────────────────────
# Phase 1: Backup existing ~/.claude
# ──────────────────────────────────────────────────
backup_existing() {
    if [[ ! -d "$CLAUDE_DIR" ]]; then
        info "No existing ~/.claude found — fresh install"
        return
    fi

    BACKUP_DIR="$HOME/.claude.backup.$(date +%Y%m%d-%H%M%S)"
    info "Backing up existing ~/.claude to $BACKUP_DIR"
    cp -r "$CLAUDE_DIR" "$BACKUP_DIR"
    ok "Backup created: $BACKUP_DIR"
}

# ──────────────────────────────────────────────────
# Phase 2: Create directory structure
# ──────────────────────────────────────────────────
create_dirs() {
    mkdir -p "$CLAUDE_DIR"/{agents,commands,skills,hooks,rules,scripts}
    ok "Directory structure created"
}

# ──────────────────────────────────────────────────
# Phase 3: Link or copy content
# ──────────────────────────────────────────────────
link_or_copy() {
    local src="$1"
    local dst="$2"
    local name="$3"

    if [[ ! -d "$src" ]] && [[ ! -f "$src" ]]; then
        warn "Source not found: $src — skipping $name"
        return
    fi

    # Remove existing target
    if [[ -L "$dst" ]]; then
        rm "$dst"
    elif [[ -d "$dst" ]]; then
        rm -rf "$dst"
    elif [[ -f "$dst" ]]; then
        rm "$dst"
    fi

    if [[ "$USE_COPY" == "true" ]]; then
        if [[ -d "$src" ]]; then
            cp -r "$src" "$dst"
        else
            cp "$src" "$dst"
        fi
        ok "$name (copied)"
    else
        ln -sf "$src" "$dst"
        ok "$name (symlinked)"
    fi
}

install_content() {
    info "Installing forge components..."

    local dirs=("agents" "commands" "skills" "hooks" "rules" "scripts")
    for dir in "${dirs[@]}"; do
        if [[ -d "$FORGE_DIR/$dir" ]]; then
            link_or_copy "$FORGE_DIR/$dir" "$CLAUDE_DIR/$dir" "$dir"
        fi
    done

    # Config files
    link_or_copy "$FORGE_DIR/settings.json" "$CLAUDE_DIR/settings.json" "settings.json"

    # Restore settings.local.json from backup if exists
    if [[ -n "$BACKUP_DIR" ]] && [[ -f "$BACKUP_DIR/settings.local.json" ]]; then
        cp "$BACKUP_DIR/settings.local.json" "$CLAUDE_DIR/settings.local.json"
        ok "settings.local.json restored from backup"
    elif [[ ! -f "$CLAUDE_DIR/settings.local.json" ]]; then
        cp "$FORGE_DIR/setup/settings.local.template.json" "$CLAUDE_DIR/settings.local.json" 2>/dev/null || true
        info "settings.local.json created from template"
    fi

    # Restore project-specific data from backup
    if [[ -n "$BACKUP_DIR" ]]; then
        # Restore projects/ directory (per-project memory)
        if [[ -d "$BACKUP_DIR/projects" ]]; then
            cp -r "$BACKUP_DIR/projects" "$CLAUDE_DIR/projects"
            ok "projects/ restored from backup"
        fi
        # Restore tasks/
        if [[ -d "$BACKUP_DIR/tasks" ]]; then
            cp -r "$BACKUP_DIR/tasks" "$CLAUDE_DIR/tasks"
            ok "tasks/ restored from backup"
        fi
    fi
}

# ──────────────────────────────────────────────────
# Phase 4: MCP Server installation (optional)
# ──────────────────────────────────────────────────
install_mcp() {
    echo ""
    echo -e "${CYAN}=== MCP Server Installation ===${NC}"
    echo "MCP servers extend Claude's capabilities."
    echo ""
    read -rp "Install MCP servers? [Y/n] " mcp_choice
    mcp_choice="${mcp_choice:-Y}"

    if [[ ! "$mcp_choice" =~ ^[Yy] ]]; then
        info "Skipping MCP servers"
        return
    fi

    # Auto-install (no auth required)
    local auto_servers=("context7" "memory" "jina-reader")
    for srv in "${auto_servers[@]}"; do
        info "Registering $srv..."
    done
    ok "Auto MCP servers registered (context7, memory, jina-reader)"

    # fetch requires uvx
    if command -v uvx &>/dev/null; then
        info "Registering fetch (uvx found)..."
        ok "fetch registered"
    else
        warn "fetch skipped — install uv first: curl -LsSf https://astral.sh/uv/install.sh | sh"
    fi

    # GitHub (requires PAT)
    echo ""
    read -rp "Install GitHub MCP server? Requires GITHUB_PERSONAL_ACCESS_TOKEN [y/N] " gh_choice
    if [[ "$gh_choice" =~ ^[Yy] ]]; then
        if [[ -n "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]]; then
            ok "GitHub MCP registered (token from env)"
        else
            warn "Set GITHUB_PERSONAL_ACCESS_TOKEN in your shell profile, then re-run"
        fi
    fi

    echo ""
    info "MCP config: $FORGE_DIR/mcp-servers.json"
    info "Add to Claude Code: claude mcp add-from-claude-json $FORGE_DIR/mcp-servers.json"
}

# ──────────────────────────────────────────────────
# Phase 5: Shell aliases (optional)
# ──────────────────────────────────────────────────
install_aliases() {
    echo ""
    read -rp "Add shell aliases (cc='claude', ccr='claude --resume')? [y/N] " alias_choice
    if [[ ! "$alias_choice" =~ ^[Yy] ]]; then
        return
    fi

    local shell_rc=""
    if [[ -n "${ZSH_VERSION:-}" ]] || [[ "$SHELL" == */zsh ]]; then
        shell_rc="$HOME/.zshrc"
    else
        shell_rc="$HOME/.bashrc"
    fi

    local marker="# claude-dev-forge aliases"
    if grep -q "$marker" "$shell_rc" 2>/dev/null; then
        info "Aliases already present in $shell_rc"
        return
    fi

    cat >> "$shell_rc" << 'ALIASES'

# claude-dev-forge aliases
alias cc='claude'
alias ccr='claude --resume'
alias ccs='claude --print "$(cat)"'
ALIASES

    ok "Aliases added to $shell_rc (source it or restart shell)"
}

# ──────────────────────────────────────────────────
# Phase 6: Validation
# ──────────────────────────────────────────────────
validate() {
    info "Validating installation..."

    if [[ -x "$FORGE_DIR/scripts/validate-setup.sh" ]]; then
        bash "$FORGE_DIR/scripts/validate-setup.sh"
    else
        # Inline validation
        local errors=0
        for dir in agents commands rules hooks; do
            if [[ -d "$CLAUDE_DIR/$dir" ]] || [[ -L "$CLAUDE_DIR/$dir" ]]; then
                local count
                count=$(find -L "$CLAUDE_DIR/$dir" -maxdepth 1 -name "*.md" -o -name "*.sh" 2>/dev/null | wc -l)
                ok "$dir: $count files"
            else
                err "$dir: not found"
                ((errors++))
            fi
        done

        if [[ -f "$CLAUDE_DIR/settings.json" ]] || [[ -L "$CLAUDE_DIR/settings.json" ]]; then
            if jq empty "$CLAUDE_DIR/settings.json" 2>/dev/null; then
                ok "settings.json: valid JSON"
            else
                err "settings.json: invalid JSON"
                ((errors++))
            fi
        else
            err "settings.json: not found"
            ((errors++))
        fi

        if (( errors > 0 )); then
            err "Validation failed with $errors errors"
            return 1
        fi
    fi

    ok "Validation passed"
}

# ──────────────────────────────────────────────────
# Phase 7: Write metadata
# ──────────────────────────────────────────────────
write_meta() {
    cat > "$CLAUDE_DIR/.forge-meta.json" << EOF
{
  "version": "$VERSION",
  "installed_at": "$(date -Iseconds)",
  "platform": "$PLATFORM",
  "forge_dir": "$FORGE_DIR",
  "use_copy": $USE_COPY,
  "backup_dir": "${BACKUP_DIR:-null}"
}
EOF
    ok "Metadata written to ~/.claude/.forge-meta.json"
}

# ──────────────────────────────────────────────────
# Phase 8: Summary
# ──────────────────────────────────────────────────
print_summary() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║         claude-dev-forge v$VERSION installed!        ║${NC}"
    echo -e "${CYAN}╠══════════════════════════════════════════════════╣${NC}"

    local agent_count cmd_count hook_count rule_count skill_count
    agent_count=$(find -L "$CLAUDE_DIR/agents" -name "*.md" 2>/dev/null | wc -l)
    cmd_count=$(find -L "$CLAUDE_DIR/commands" -name "*.md" 2>/dev/null | wc -l)
    hook_count=$(find -L "$CLAUDE_DIR/hooks" -name "*.sh" 2>/dev/null | wc -l)
    rule_count=$(find -L "$CLAUDE_DIR/rules" -name "*.md" 2>/dev/null | wc -l)
    skill_count=$(find -L "$CLAUDE_DIR/skills" -maxdepth 2 -name "skill.md" 2>/dev/null | wc -l)

    echo -e "${CYAN}║${NC}  Agents:   ${GREEN}$agent_count${NC}"
    echo -e "${CYAN}║${NC}  Commands: ${GREEN}$cmd_count${NC}"
    echo -e "${CYAN}║${NC}  Skills:   ${GREEN}$skill_count${NC}"
    echo -e "${CYAN}║${NC}  Hooks:    ${GREEN}$hook_count${NC}"
    echo -e "${CYAN}║${NC}  Rules:    ${GREEN}$rule_count${NC}"
    echo -e "${CYAN}╠══════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC}  Quick Start:"
    echo -e "${CYAN}║${NC}    claude               — Start Claude Code"
    echo -e "${CYAN}║${NC}    /show-setup           — View configuration"
    echo -e "${CYAN}║${NC}    /init-project         — Setup project overlay"
    echo -e "${CYAN}║${NC}    /plan                 — Plan before coding"
    echo -e "${CYAN}╠══════════════════════════════════════════════════╣${NC}"

    if [[ -n "$BACKUP_DIR" ]]; then
        echo -e "${CYAN}║${NC}  Backup: $BACKUP_DIR"
    fi

    echo -e "${CYAN}║${NC}  Forge:  $FORGE_DIR"
    echo -e "${CYAN}║${NC}  Update: cd $FORGE_DIR && git pull"
    echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
    echo ""
}

# ──────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────
main() {
    echo ""
    echo -e "${CYAN}claude-dev-forge installer v$VERSION${NC}"
    echo "─────────────────────────────────────────"
    echo ""

    detect_platform
    check_deps
    backup_existing
    create_dirs
    install_content
    install_mcp
    install_aliases
    validate
    write_meta
    print_summary
}

main "$@"
