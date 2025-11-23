#!/bin/bash

# 
# VSCode MCP Extension Build/Deploy Pipeline
# Comprehensive build and deployment script with error boundaries
#

set -e  # Exit on any error
set -u  # Exit on undefined variables
set -o pipefail  # Exit if any command in pipeline fails

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly BUILD_DIR="${PROJECT_ROOT}/out"
readonly DOCS_DIR="${PROJECT_ROOT}/docs"
readonly COVERAGE_DIR="${PROJECT_ROOT}/coverage"
readonly REPORTS_DIR="${DOCS_DIR}/reports"

# Build stages
readonly STAGES=(
    "clean"
    "validate-config"
    "lint-docs" 
    "lint-code"
    "compile"
    "process-templates"
    "test"
    "docs"
    "health-report"
    "package"
)

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_stage() {
    echo
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}🚀 STAGE: $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Error handling
handle_error() {
    local exit_code=$?
    local line_number=$1
    local command="$2"
    
    echo
    log_error "❌ Build failed at line ${line_number} with exit code ${exit_code}"
    log_error "Failed command: ${command}"
    echo
    
    # Cleanup on error
    if [[ "${CLEANUP_ON_ERROR:-true}" == "true" ]]; then
        log_info "Cleaning up temporary files..."
        cleanup_temp_files
    fi
    
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                            BUILD FAILED                        ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo
    
    exit $exit_code
}

# Set up error handling
trap 'handle_error ${LINENO} "$BASH_COMMAND"' ERR

# Cleanup function
cleanup_temp_files() {
    log_info "Removing temporary files..."
    rm -rf "${PROJECT_ROOT}/.tmp" 2>/dev/null || true
    rm -rf "${PROJECT_ROOT}/node_modules/.cache" 2>/dev/null || true
}

# Utility functions
check_dependencies() {
    log_info "Checking dependencies..."
    
    local deps=("node" "npm" "git")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_error "Required dependency not found: $dep"
            exit 1
        fi
    done
    
    # Check Node.js version
    local node_version=$(node --version | cut -d'v' -f2)
    local min_version="18.0.0"
    
    if ! version_gte "$node_version" "$min_version"; then
        log_error "Node.js version $node_version is below minimum required version $min_version"
        exit 1
    fi
    
    log_success "All dependencies satisfied"
}

version_gte() {
    # Compare version numbers
    printf '%s\n%s\n' "$2" "$1" | sort -V -C
}

ensure_directory() {
    local dir="$1"
    if [[ ! -d "$dir" ]]; then
        log_info "Creating directory: $dir"
        mkdir -p "$dir"
    fi
}

# Stage implementations
stage_clean() {
    log_stage "CLEAN"
    log_info "Removing build artifacts..."
    
    rm -rf "$BUILD_DIR"
    rm -rf "$COVERAGE_DIR"
    rm -rf "${REPORTS_DIR}/health-report.md"
    rm -rf "${PROJECT_ROOT}/.mcp-cache"
    
    # Clean npm cache if requested
    if [[ "${DEEP_CLEAN:-false}" == "true" ]]; then
        log_info "Performing deep clean..."
        npm cache clean --force
        rm -rf "${PROJECT_ROOT}/node_modules"
        npm install
    fi
    
    log_success "Clean completed"
}

stage_validate_config() {
    log_stage "CONFIG VALIDATION"
    cd "$PROJECT_ROOT"

    # Prefer typed application config compiled by TypeScript; ensure it compiles
    if [[ -f "src/config/application.config.ts" ]]; then
        log_info "Validating application.config.ts via TypeScript compilation..."
        npm run -s compile > /dev/null 2>&1 || {
            log_error "TypeScript compilation failed; application.config.ts invalid or other TS errors present"
            exit 1
        }
        log_success "Typed application configuration validated"
        return
    fi
}

stage_lint_json() {
    log_stage "JSON LINTING"
    log_info "Running JSON schema validation..."
    
    cd "$PROJECT_ROOT"
    npm run lint:json
    
    log_success "JSON linting completed"
}

stage_lint_docs() {
    log_stage "DOCUMENTATION LINTING"
    log_info "Running markdown validation..."
    
    cd "$PROJECT_ROOT"
    npm run lint:docs
    
    log_success "Documentation linting completed"
}

stage_lint_code() {
    log_stage "CODE LINTING"
    log_info "Running TypeScript linting..."
    
    cd "$PROJECT_ROOT"
    
    # Run with warnings allowed for now
    if ! npm run lint -- --max-warnings=50; then
        log_warning "Linting completed with warnings/errors"
        if [[ "${STRICT_LINT:-false}" == "true" ]]; then
            log_error "Strict linting mode enabled, failing build"
            exit 1
        fi
    fi
    
    log_success "Code linting completed"
}

stage_compile() {
    log_stage "COMPILATION"
    log_info "Compiling TypeScript..."
    
    cd "$PROJECT_ROOT"
    npm run compile
    
    log_success "Compilation completed"
}

stage_process_templates() {
    log_stage "TEMPLATE PROCESSING"
    log_info "Processing template variables..."
    
    cd "$PROJECT_ROOT"
    npm run templates
    
    log_success "Template processing completed"
}

stage_test() {
    log_stage "TESTING"
    log_info "Running test suite..."
    
    cd "$PROJECT_ROOT"
    
    # Set test environment
    export NODE_ENV=test
    
    if [[ "${COVERAGE:-true}" == "true" ]]; then
        log_info "Running tests with coverage..."
        npm run test -- --coverage
    else
        log_info "Running tests without coverage..."
        npm run test
    fi
    
    log_success "Testing completed"
}

stage_docs() {
    log_stage "DOCUMENTATION GENERATION"
    log_info "Generating API documentation..."
    
    cd "$PROJECT_ROOT"
    npm run docs
    
    log_success "Documentation generation completed"
}

stage_health_report() {
    log_stage "HEALTH REPORTING"
    log_info "Generating health report..."
    
    cd "$PROJECT_ROOT"
    npm run health:report
    
    # Check if health report indicates issues
    if [[ -f "${REPORTS_DIR}/health-report.md" ]]; then
        local issue_count=$(grep -c "❌" "${REPORTS_DIR}/health-report.md" 2>/dev/null || echo "0")
        if [[ $issue_count -gt 0 ]]; then
            log_warning "Health report indicates $issue_count issues"
            if [[ "${STRICT_HEALTH:-false}" == "true" ]]; then
                log_error "Strict health mode enabled, failing build"
                exit 1
            fi
        fi
    fi
    
    log_success "Health reporting completed"
}

stage_package() {
    log_stage "PACKAGING"
    log_info "Creating VSIX package..."
    
    cd "$PROJECT_ROOT"
    
    # Ensure package.json is up to date
    if [[ "${UPDATE_VERSION:-false}" == "true" ]]; then
        log_info "Updating package version..."
        npm version patch --no-git-tag-version
    fi
    
    npm run package
    
    # List generated packages
    local packages=$(ls *.vsix 2>/dev/null || true)
    if [[ -n "$packages" ]]; then
        log_success "Packages created:"
        for pkg in $packages; do
            local size=$(du -h "$pkg" | cut -f1)
            log_info "  📦 $pkg ($size)"
        done
    else
        log_error "No packages were created"
        exit 1
    fi
    
    log_success "Packaging completed"
}

# Main execution
main() {
    local start_time=$(date +%s)
    
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              VSCode MCP Extension Build Pipeline               ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo
    
    log_info "Build started at $(date)"
    log_info "Project root: $PROJECT_ROOT"
    log_info "Node.js: $(node --version)"
    log_info "npm: $(npm --version)"
    echo
    
    # Check dependencies
    check_dependencies
    
    # Create required directories
    ensure_directory "$DOCS_DIR"
    ensure_directory "$REPORTS_DIR"
    
    # Parse command line arguments
    local stages_to_run=("${STAGES[@]}")
    local skip_stages=()
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --stages)
                IFS=',' read -ra stages_to_run <<< "$2"
                shift 2
                ;;
            --skip)
                IFS=',' read -ra skip_stages <<< "$2"
                shift 2
                ;;
            --coverage)
                export COVERAGE=true
                shift
                ;;
            --no-coverage)
                export COVERAGE=false
                shift
                ;;
            --strict-lint)
                export STRICT_LINT=true
                shift
                ;;
            --strict-health)
                export STRICT_HEALTH=true
                shift
                ;;
            --deep-clean)
                export DEEP_CLEAN=true
                shift
                ;;
            --update-version)
                export UPDATE_VERSION=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Remove skipped stages
    for skip in "${skip_stages[@]}"; do
        stages_to_run=("${stages_to_run[@]/$skip}")
    done
    
    # Execute stages
    local completed_stages=()
    for stage in "${stages_to_run[@]}"; do
        if [[ -n "$stage" ]]; then
            case $stage in
                clean) stage_clean ;;
                validate-config) stage_validate_config ;;
                lint-json) stage_lint_json ;;
                lint-docs) stage_lint_docs ;;
                lint-code) stage_lint_code ;;
                compile) stage_compile ;;
                process-templates) stage_process_templates ;;
                test) stage_test ;;
                docs) stage_docs ;;
                health-report) stage_health_report ;;
                package) stage_package ;;
                *)
                    log_error "Unknown stage: $stage"
                    exit 1
                    ;;
            esac
            completed_stages+=("$stage")
        fi
    done
    
    # Cleanup
    cleanup_temp_files
    
    # Success summary
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                           BUILD SUCCESS                        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo
    log_success "Build completed successfully in ${duration}s"
    log_success "Completed stages: ${completed_stages[*]}"
    
    if [[ -f "${REPORTS_DIR}/health-report.md" ]]; then
        echo -e "${BLUE}📊 Health report: ${REPORTS_DIR}/health-report.md${NC}"
    fi
    
    if ls *.vsix &>/dev/null; then
        echo -e "${BLUE}📦 Packages: $(ls *.vsix | tr '\n' ' ')${NC}"
    fi
    
    echo
    log_info "Build completed at $(date)"
}

show_help() {
    cat << EOF
VSCode MCP Extension Build Pipeline

Usage: $0 [OPTIONS]

OPTIONS:
    --stages STAGES     Comma-separated list of stages to run (default: all)
                       Available: ${STAGES[*]}
    
    --skip STAGES       Comma-separated list of stages to skip
    
    --coverage          Enable test coverage (default: true)
    --no-coverage       Disable test coverage
    
    --strict-lint       Fail build on lint errors (default: false)
    --strict-health     Fail build on health issues (default: false)
    
    --deep-clean        Perform deep clean including node_modules
    --update-version    Automatically update package version
    
    --help              Show this help message

EXAMPLES:
    $0                                    # Run all stages
    $0 --stages compile,test             # Run only compile and test
    $0 --skip test,docs                  # Run all stages except test and docs
    $0 --strict-lint --strict-health     # Run with strict mode
    $0 --deep-clean                      # Perform deep clean build

ENVIRONMENT VARIABLES:
    CLEANUP_ON_ERROR    Cleanup temp files on error (default: true)
    NODE_ENV           Node environment (default: development)

EOF
}

# Execute main function with all arguments
main "$@"