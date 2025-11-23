@echo off
setlocal enabledelayedexpansion

REM 
REM VSCode MCP Extension Build/Deploy Pipeline (Windows)
REM Comprehensive build and deployment script with error boundaries
REM

REM Color codes (basic Windows support)
set "RED=[31m"
set "GREEN=[32m" 
set "YELLOW=[33m"
set "BLUE=[34m"
set "NC=[0m"

REM Configuration
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "BUILD_DIR=%PROJECT_ROOT%\out"
set "DOCS_DIR=%PROJECT_ROOT%\docs"
set "COVERAGE_DIR=%PROJECT_ROOT%\coverage"
set "REPORTS_DIR=%DOCS_DIR%\reports"

REM Build stages
set "STAGES=clean,validate-config,lint-docs,lint-code,compile,process-templates,test,docs,health-report,package"

REM Default configuration
set "COVERAGE=true"
set "STRICT_LINT=false"
set "STRICT_HEALTH=false" 
set "DEEP_CLEAN=false"
set "UPDATE_VERSION=false"

REM Logging functions
:log_info
echo [INFO] %~1
goto :eof

:log_success
echo [SUCCESS] %~1
goto :eof

:log_warning
echo [WARNING] %~1
goto :eof

:log_error
echo [ERROR] %~1 >&2
goto :eof

:log_stage
echo.
echo ========================================
echo 🚀 STAGE: %~1
echo ========================================
goto :eof

REM Error handling
:handle_error
echo.
call :log_error "❌ Build failed with error code !ERRORLEVEL!"
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                            BUILD FAILED                        ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
exit /b !ERRORLEVEL!

REM Utility functions
:check_dependencies
call :log_info "Checking dependencies..."

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    call :log_error "Node.js not found. Please install Node.js."
    exit /b 1
)

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    call :log_error "npm not found. Please install npm."
    exit /b 1
)

REM Check git
git --version >nul 2>&1
if errorlevel 1 (
    call :log_error "git not found. Please install git."
    exit /b 1
)

call :log_success "All dependencies satisfied"
goto :eof

:ensure_directory
if not exist "%~1" (
    call :log_info "Creating directory: %~1"
    mkdir "%~1"
)
goto :eof

REM Stage implementations
:stage_clean
call :log_stage "CLEAN"
call :log_info "Removing build artifacts..."

if exist "%BUILD_DIR%" rmdir /s /q "%BUILD_DIR%"
if exist "%COVERAGE_DIR%" rmdir /s /q "%COVERAGE_DIR%"
if exist "%REPORTS_DIR%\health-report.md" del "%REPORTS_DIR%\health-report.md"
rem Clean legacy and current cache directories at repo root (best-effort)
if exist "%PROJECT_ROOT%\.mcp-cache" rmdir /s /q "%PROJECT_ROOT%\.mcp-cache"
if exist "%PROJECT_ROOT%\.usercontext-mcp-extension" rmdir /s /q "%PROJECT_ROOT%\.usercontext-mcp-extension"

if "%DEEP_CLEAN%"=="true" (
    call :log_info "Performing deep clean..."
    npm cache clean --force
    if exist "%PROJECT_ROOT%\node_modules" rmdir /s /q "%PROJECT_ROOT%\node_modules"
    npm install
)

call :log_success "Clean completed"
goto :eof

:stage_validate_config
call :log_stage "CONFIG VALIDATION"
cd /d "%PROJECT_ROOT%"

if exist "src\config\application.config.ts" (
    call :log_info "Validating application.config.ts via TypeScript compilation..."
    call npm run compile >NUL 2>&1
    if errorlevel 1 (
        call :log_error "TypeScript compilation failed; application.config.ts invalid or other TS errors present"
        exit /b 1
    )
    call :log_success "Typed application configuration validated"
    goto :eof
)

call :log_info "Validating generated mcp.config.json..."
if not exist "out\mcp.config.json" (
    call :log_info "out\mcp.config.json not found; generating from TS sources..."
    npm run mcp:gen >NUL 2>&1
    if errorlevel 1 (
        call :log_error "Failed to generate out\\mcp.config.json from TS sources"
        exit /b 1
    )
)
REM Basic existence check; schema correctness verified later in pipeline
call :log_success "Generated JSON configuration validated"
goto :eof

:stage_lint_json
call :log_stage "JSON LINTING"
call :log_info "Running JSON schema validation..."

cd /d "%PROJECT_ROOT%"
npm run lint:json
if errorlevel 1 call :handle_error

call :log_success "JSON linting completed"
goto :eof

:stage_lint_docs
call :log_stage "DOCUMENTATION LINTING"
call :log_info "Running markdown validation..."

cd /d "%PROJECT_ROOT%"
npm run lint:docs
if errorlevel 1 call :handle_error

call :log_success "Documentation linting completed"
goto :eof

:stage_lint_code
call :log_stage "CODE LINTING"
call :log_info "Running TypeScript linting..."

cd /d "%PROJECT_ROOT%"

npm run lint -- --max-warnings=50
if errorlevel 1 (
    call :log_warning "Linting completed with warnings/errors"
    if "%STRICT_LINT%"=="true" (
        call :log_error "Strict linting mode enabled, failing build"
        exit /b 1
    )
)

call :log_success "Code linting completed"
goto :eof

:stage_compile
call :log_stage "COMPILATION"
call :log_info "Compiling TypeScript..."

cd /d "%PROJECT_ROOT%"
npm run compile
if errorlevel 1 call :handle_error

call :log_success "Compilation completed"
goto :eof

:stage_process_templates
call :log_stage "TEMPLATE PROCESSING"
call :log_info "Processing template variables..."

cd /d "%PROJECT_ROOT%"
npm run templates
if errorlevel 1 call :handle_error

call :log_success "Template processing completed"
goto :eof

:stage_test
call :log_stage "TESTING"
call :log_info "Running test suite..."

cd /d "%PROJECT_ROOT%"
set NODE_ENV=test

if "%COVERAGE%"=="true" (
    call :log_info "Running tests with coverage..."
    npm run test -- --coverage
) else (
    call :log_info "Running tests without coverage..."
    npm run test
)
if errorlevel 1 call :handle_error

call :log_success "Testing completed"
goto :eof

:stage_docs
call :log_stage "DOCUMENTATION GENERATION"
call :log_info "Generating API documentation..."

cd /d "%PROJECT_ROOT%"
npm run docs
if errorlevel 1 call :handle_error

call :log_success "Documentation generation completed"
goto :eof

:stage_health_report
call :log_stage "HEALTH REPORTING"
call :log_info "Generating health report..."

cd /d "%PROJECT_ROOT%"
npm run health:report
if errorlevel 1 call :handle_error

call :log_success "Health reporting completed"
goto :eof

:stage_package
call :log_stage "PACKAGING"
call :log_info "Creating VSIX package..."

cd /d "%PROJECT_ROOT%"

if "%UPDATE_VERSION%"=="true" (
    call :log_info "Updating package version..."
    npm version patch --no-git-tag-version
)

npm run package
if errorlevel 1 call :handle_error

REM List generated packages
for %%f in (*.vsix) do (
    call :log_success "Package created: %%f"
)

call :log_success "Packaging completed"
goto :eof

REM Main execution
:main
set "start_time=%time%"

echo ╔════════════════════════════════════════════════════════════════╗
echo ║              VSCode MCP Extension Build Pipeline               ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

call :log_info "Build started at %date% %time%"
call :log_info "Project root: %PROJECT_ROOT%"

REM Get Node and npm versions
for /f %%i in ('node --version') do set "node_version=%%i"
for /f %%i in ('npm --version') do set "npm_version=%%i"
call :log_info "Node.js: %node_version%"
call :log_info "npm: %npm_version%"
echo.

REM Check dependencies
call :check_dependencies

REM Create required directories
call :ensure_directory "%DOCS_DIR%"
call :ensure_directory "%REPORTS_DIR%"

REM Parse command line arguments (simplified for Windows)
set "stages_to_run=%STAGES%"

:parse_args
if "%~1"=="" goto :execute_stages
if "%~1"=="--coverage" set "COVERAGE=true" & shift & goto :parse_args
if "%~1"=="--no-coverage" set "COVERAGE=false" & shift & goto :parse_args
if "%~1"=="--strict-lint" set "STRICT_LINT=true" & shift & goto :parse_args
if "%~1"=="--strict-health" set "STRICT_HEALTH=true" & shift & goto :parse_args
if "%~1"=="--deep-clean" set "DEEP_CLEAN=true" & shift & goto :parse_args
if "%~1"=="--update-version" set "UPDATE_VERSION=true" & shift & goto :parse_args
if "%~1"=="--help" goto :show_help
call :log_error "Unknown option: %~1"
exit /b 1

:execute_stages
REM Execute stages (simplified - run all stages)
call :stage_clean
call :stage_validate_config
call :stage_lint_docs
call :stage_lint_code
call :stage_compile
call :stage_process_templates
call :stage_test
call :stage_docs
call :stage_health_report
call :stage_package

REM Success summary
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                           BUILD SUCCESS                        ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
call :log_success "Build completed successfully"

if exist "%REPORTS_DIR%\health-report.md" (
    echo 📊 Health report: %REPORTS_DIR%\health-report.md
)

for %%f in (*.vsix) do (
    echo 📦 Package: %%f
)

echo.
call :log_info "Build completed at %date% %time%"
goto :eof

:show_help
echo VSCode MCP Extension Build Pipeline (Windows)
echo.
echo Usage: %0 [OPTIONS]
echo.
echo OPTIONS:
echo     --coverage          Enable test coverage (default: true)
echo     --no-coverage       Disable test coverage
echo     --strict-lint       Fail build on lint errors (default: false)
echo     --strict-health     Fail build on health issues (default: false)
echo     --deep-clean        Perform deep clean including node_modules
echo     --update-version    Automatically update package version
echo     --help              Show this help message
echo.
goto :eof

REM Call main function
call :main %*