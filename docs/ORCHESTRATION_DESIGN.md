# Orchestration Design Document

> A portable design specification for building CLI tools with layered orchestration.
> Originally implemented in TypeScript, designed for replication in Python or other languages.

---

## Executive Summary

This document describes a **Command-Feature-Utility (CFU) Layered Architecture** for CLI tools that need to orchestrate multiple operations with clear separation of concerns. The design emphasizes:

- **Explicit orchestration** through command handlers
- **Immutable configuration** passed through the call stack
- **Stateless feature functions** that perform discrete operations
- **Result-based error handling** without exceptions for control flow

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLI ENTRY POINT                                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  • Parse arguments (flags + positional args)                          │  │
│  │  • Route to command handler                                           │  │
│  │  • Handle exit codes                                                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             COMMAND LAYER                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  init   │ │  sync   │ │validate │ │ status  │ │  reset  │ │ generate│   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │
│       │           │           │           │           │           │         │
│  Responsibilities:                                                          │
│  • Load configuration                                                       │
│  • Orchestrate 1+ features                                                  │
│  • Aggregate results                                                        │
│  • Return CommandResult                                                     │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             FEATURE LAYER                                   │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐                   │
│  │ template-      │ │ path-routing-  │ │ drift-         │                   │
│  │ installer      │ │ generator      │ │ checker        │  ...              │
│  └────────┬───────┘ └────────┬───────┘ └────────┬───────┘                   │
│           │                  │                  │                           │
│  Responsibilities:                                                          │
│  • Perform ONE discrete operation                                           │
│  • Use utilities for I/O                                                    │
│  • Return FeatureResult<T>                                                  │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             UTILITY LAYER                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ config   │ │ template │ │   fs     │ │  path    │ │  logger  │  ...     │
│  │ utils    │ │ loader   │ │  utils   │ │ scanner  │ │          │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                             │
│  Responsibilities:                                                          │
│  • Pure functions with no side effects (except I/O)                         │
│  • Composable, reusable operations                                          │
│  • No business logic                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Pattern

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│   CLI    │───▶│  Config  │───▶│ Command  │───▶│ Feature  │───▶│  Result  │
│  Input   │    │  Build   │    │ Handler  │    │ Execute  │    │  Output  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │               │               │               │
     ▼               ▼               ▼               ▼               ▼
  argv[]      ContextConfig    CommandOpts    FeatureResult   CommandResult
  flags{}      (immutable)     + Config         <T>             + exitCode
```

### Unidirectional Flow

1. **Input**: CLI receives `argv` and parses into flags + positional args
2. **Configuration**: Build immutable config from defaults + overrides
3. **Command**: Handler receives options, orchestrates features
4. **Feature**: Performs operation, returns typed result
5. **Output**: Command aggregates results, CLI sets exit code

---

## Core Types

### Result Types (The Heart of Error Handling)

```
┌─────────────────────────────────────┐
│         FeatureResult<T>            │
├─────────────────────────────────────┤
│  success: boolean                   │  ← Did the operation succeed?
│  details?: string                   │  ← Human-readable explanation
│  payload?: T                        │  ← Typed operation-specific data
└─────────────────────────────────────┘
          │
          │ wrapped by
          ▼
┌─────────────────────────────────────┐
│         CommandResult<T>            │
├─────────────────────────────────────┤
│  success: boolean                   │  ← Overall command success
│  message?: string                   │  ← User-facing message
│  data?: T                           │  ← Feature result or aggregated data
└─────────────────────────────────────┘
```

### Configuration Type

```
┌─────────────────────────────────────────────────────────────────┐
│                    ContextManagerConfig                         │
├─────────────────────────────────────────────────────────────────┤
│  rootDir: string        │ Project root (absolute path)          │
│  templateDir: string    │ Source templates directory            │
│  docsDir: string        │ Output documentation directory        │
├─────────────────────────────────────────────────────────────────┤
│  paths: ConfigPaths     │ ┌─────────────────────────────────┐   │
│                         │ │ templates: string               │   │
│                         │ │ docs: string                    │   │
│                         │ │ bin: string                     │   │
│                         │ │ cache?: string                  │   │
│                         │ └─────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  flags: ConfigFlags     │ ┌─────────────────────────────────┐   │
│                         │ │ dryRun: boolean                 │   │
│                         │ │ verbose: boolean                │   │
│                         │ │ force: boolean                  │   │
│                         │ │ interactive: boolean            │   │
│                         │ └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Design Patterns Used

### 1. Command Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                     Command Registry                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   command_map = {                                               │
│       "init": init_command,                                     │
│       "sync": sync_command,                                     │
│       "validate": validate_command,                             │
│       "status": status_command,                                 │
│       "reset": reset_command,                                   │
│   }                                                             │
│                                                                 │
│   handler = command_map.get(command_name)                       │
│   result = await handler(options)                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Purpose**: Decouple command invocation from execution. Easy to add new commands.

### 2. Builder Pattern (Configuration)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Config Builder Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   build_config(options)                                         │
│       │                                                         │
│       ├──▶ resolve_root(cwd, overrides, defaults)               │
│       │         └──▶ rootDir                                    │
│       │                                                         │
│       ├──▶ resolve_paths(rootDir, overrides, defaults)          │
│       │         └──▶ { templates, docs, bin, cache }            │
│       │                                                         │
│       ├──▶ resolve_flags(overrides, defaults)                   │
│       │         └──▶ { dryRun, verbose, force, interactive }    │
│       │                                                         │
│       └──▶ return ContextManagerConfig                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Purpose**: Construct complex configuration with sensible defaults and optional overrides.

### 3. Pipeline Pattern (Template Processing)

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    Load      │───▶│    Parse     │───▶│   Render     │───▶│    Write     │
│  Directory   │    │   Files      │    │  Templates   │    │   Output     │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
   path[]           TemplateFile[]      TemplateFile[]         files on
                    { path, content }   (with context)          disk
```

**Purpose**: Transform data through discrete, composable stages.

---

## Execution Flow Examples

### Example 1: Init Command

```
┌─────────────────────────────────────────────────────────────────┐
│                    init_command(options)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. config = load_default_config(cwd)                           │
│         │                                                       │
│         └──▶ Build config with defaults                         │
│                                                                 │
│  2. result = install_templates(config)                          │
│         │                                                       │
│         ├──▶ load_templates_from_directory(".github")           │
│         │         │                                             │
│         │         ├──▶ list_directory()                         │
│         │         └──▶ read_file() × N                          │
│         │                                                       │
│         └──▶ write_template_files(".bin/templates", files)      │
│                   │                                             │
│                   ├──▶ ensure_dir()                             │
│                   └──▶ write_file() × N                         │
│                                                                 │
│  3. return CommandResult { success, message, data }             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Example 2: Validate Command (Multi-Feature)

```
┌─────────────────────────────────────────────────────────────────┐
│                   validate_command(options)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. config = load_default_config(cwd)                           │
│                                                                 │
│  2. routing_result = generate_path_routing({                    │
│         base_dir: config.root_dir,                              │
│         docs_dir: config.docs_dir,                              │
│         template_dir: config.paths.templates                    │
│     })                                                          │
│         │                                                       │
│         ├──▶ scan_top_level_paths(base_dir)                     │
│         └──▶ build_routing_map(paths)                           │
│                                                                 │
│  3. validation = validate_structure(routing_result)             │
│         │                                                       │
│         └──▶ check for missing docs/templates                   │
│                                                                 │
│  4. return CommandResult {                                      │
│         success: validation.success,                            │
│         message: validation.details,                            │
│         data: { missing: [...] }                                │
│     }                                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
project/
├── cli.py                          # Entry point
├── commands/                       # Command handlers (orchestrators)
│   ├── __init__.py
│   ├── init_command.py
│   ├── sync_command.py
│   ├── validate_command.py
│   ├── status_command.py
│   └── reset_command.py
├── features/                       # Feature implementations
│   ├── __init__.py
│   ├── template_installer.py
│   ├── template_merger.py
│   ├── path_routing_generator.py
│   ├── structure_validator.py
│   └── drift_checker.py
├── utils/                          # Utility functions
│   ├── __init__.py
│   ├── config_utils.py
│   ├── template_loader.py
│   ├── template_writer.py
│   ├── fs_utils.py
│   └── logger.py
├── types/                          # Type definitions (or use dataclasses)
│   ├── __init__.py
│   ├── config_types.py
│   ├── command_types.py
│   ├── feature_types.py
│   └── template_types.py
└── configs/                        # Configuration defaults
    └── defaults.py
```

---

## Python Implementation Guide

### Core Types (using dataclasses)

```python
# types/feature_types.py
from dataclasses import dataclass
from typing import TypeVar, Generic, Optional, List

T = TypeVar('T')

@dataclass
class FeatureResult(Generic[T]):
    """Base result type for all feature operations."""
    success: bool
    details: Optional[str] = None
    payload: Optional[T] = None

@dataclass
class InstallTemplatesResult(FeatureResult):
    template_count: Optional[int] = None

@dataclass
class ValidateStructureResult(FeatureResult):
    missing: Optional[List[str]] = None

@dataclass
class StatusResult(FeatureResult):
    drifted: Optional[List[str]] = None
```

```python
# types/command_types.py
from dataclasses import dataclass
from typing import TypeVar, Generic, Optional, Dict, Any, Callable, Awaitable

T = TypeVar('T')

@dataclass
class CommandOptions:
    """Input options for command handlers."""
    cwd: Optional[str] = None
    args: List[str] = None
    flags: Optional[Dict[str, Any]] = None

@dataclass
class CommandResult(Generic[T]):
    """Result returned by command handlers."""
    success: bool
    message: Optional[str] = None
    data: Optional[T] = None

# Type alias for command handlers
CommandHandler = Callable[[CommandOptions], Awaitable[CommandResult]]
```

```python
# types/config_types.py
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class ConfigPaths:
    templates: str
    docs: str
    bin: str
    cache: Optional[str] = None

@dataclass
class ConfigFlags:
    dry_run: bool = False
    verbose: bool = False
    force: bool = False
    interactive: bool = False

@dataclass
class ContextManagerConfig:
    root_dir: str
    template_dir: str
    docs_dir: str
    paths: ConfigPaths
    flags: ConfigFlags = field(default_factory=ConfigFlags)
```

### CLI Entry Point

```python
# cli.py
import sys
import asyncio
from typing import Dict

from commands import (
    init_command,
    sync_command,
    validate_command,
    status_command,
    reset_command,
)
from types.command_types import CommandHandler, CommandOptions, CommandResult
from utils.logger import log_error, log_info

# Command registry (Command Pattern)
command_map: Dict[str, CommandHandler] = {
    "init": init_command,
    "sync": sync_command,
    "validate": validate_command,
    "status": status_command,
    "reset": reset_command,
}

def parse_flags(args: list[str]) -> dict[str, str | bool]:
    """Parse --flag and --flag=value arguments."""
    flags = {}
    for arg in args:
        if arg.startswith("--"):
            key_value = arg[2:].split("=", 1)
            key = key_value[0]
            value = key_value[1] if len(key_value) > 1 else True
            flags[key] = value
    return flags

async def run() -> None:
    args = sys.argv[1:]

    if not args:
        log_error("No command provided")
        sys.exit(1)

    command_name = args[0]
    rest = args[1:]

    handler = command_map.get(command_name)
    if not handler:
        log_error(f"Unknown command: {command_name}")
        sys.exit(1)

    flags = parse_flags(rest)
    positional = [arg for arg in rest if not arg.startswith("--")]

    options = CommandOptions(
        cwd=os.getcwd(),
        args=positional,
        flags=flags
    )

    result = await handler(options)

    if result.message:
        log_info(result.message)

    if not result.success:
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run())
```

### Command Handler Example

```python
# commands/init_command.py
from types.command_types import CommandHandler, CommandOptions, CommandResult
from types.feature_types import InstallTemplatesResult
from utils.config_utils import load_default_config
from features.template_installer import install_templates
from utils.logger import log_info

async def init_command(options: CommandOptions) -> CommandResult:
    """Initialize project by installing templates."""

    # 1. Load configuration
    config = load_default_config(options.cwd)

    # 2. Execute feature
    result: InstallTemplatesResult = await install_templates(config)

    # 3. Log details
    if result.details:
        log_info(result.details)

    # 4. Return command result
    return CommandResult(
        success=result.success,
        message=result.details,
        data=result
    )
```

### Feature Implementation Example

```python
# features/template_installer.py
from pathlib import Path
from types.config_types import ContextManagerConfig
from types.feature_types import InstallTemplatesResult
from utils.template_loader import load_templates_from_directory
from utils.template_writer import write_template_files

async def install_templates(config: ContextManagerConfig) -> InstallTemplatesResult:
    """Install templates from source to working directory."""

    source_dir = Path(config.root_dir) / ".github"
    target_dir = Path(config.root_dir) / config.paths.templates

    # Load templates
    templates = await load_templates_from_directory(source_dir)

    # Write templates
    await write_template_files(target_dir, templates.files, context={})

    return InstallTemplatesResult(
        success=True,
        details="Templates installed from .github",
        template_count=len(templates.files)
    )
```

### Configuration Builder

```python
# utils/config_utils.py
from pathlib import Path
from typing import Optional
from types.config_types import ContextManagerConfig, ConfigPaths, ConfigFlags
from configs.defaults import CONFIG_DEFAULTS

def resolve_root(cwd: str, overrides: dict, defaults: dict) -> str:
    root_dir = overrides.get("root_dir", defaults["root_dir"])
    return str(Path(cwd).resolve() / root_dir)

def resolve_paths(root_dir: str, overrides: dict, defaults: dict) -> ConfigPaths:
    paths = overrides.get("paths", {})
    return ConfigPaths(
        templates=str(Path(root_dir) / paths.get("templates", defaults["paths"]["templates"])),
        docs=str(Path(root_dir) / paths.get("docs", defaults["paths"]["docs"])),
        bin=str(Path(root_dir) / paths.get("bin", defaults["paths"]["bin"])),
        cache=str(Path(root_dir) / paths.get("cache", defaults["paths"]["cache"]))
               if paths.get("cache") or defaults["paths"].get("cache") else None
    )

def resolve_flags(overrides: dict, defaults: dict) -> ConfigFlags:
    flags = overrides.get("flags", {})
    return ConfigFlags(
        dry_run=flags.get("dry_run", defaults["flags"]["dry_run"]),
        verbose=flags.get("verbose", defaults["flags"]["verbose"]),
        force=flags.get("force", defaults["flags"]["force"]),
        interactive=flags.get("interactive", defaults["flags"]["interactive"])
    )

def build_config(
    cwd: Optional[str] = None,
    overrides: Optional[dict] = None
) -> ContextManagerConfig:
    """Build configuration with defaults and overrides."""
    cwd = cwd or str(Path.cwd())
    overrides = overrides or {}
    defaults = CONFIG_DEFAULTS

    root_dir = resolve_root(cwd, overrides, defaults)

    return ContextManagerConfig(
        root_dir=root_dir,
        template_dir=str(Path(root_dir) / overrides.get("template_dir", defaults["template_dir"])),
        docs_dir=str(Path(root_dir) / overrides.get("docs_dir", defaults["docs_dir"])),
        paths=resolve_paths(root_dir, overrides, defaults),
        flags=resolve_flags(overrides, defaults)
    )

def load_default_config(cwd: Optional[str] = None) -> ContextManagerConfig:
    """Convenience function to load config with defaults."""
    return build_config(cwd=cwd)
```

### Configuration Defaults

```python
# configs/defaults.py

CONFIG_DEFAULTS = {
    "root_dir": ".",
    "template_dir": ".github",
    "docs_dir": ".docs",
    "paths": {
        "templates": ".bin/templates",
        "docs": ".docs",
        "bin": ".bin",
        "cache": ".cache"
    },
    "flags": {
        "dry_run": False,
        "verbose": False,
        "force": False,
        "interactive": False
    }
}
```

---

## Key Design Principles

### 1. Explicit Over Implicit
- Configuration is passed explicitly, never global
- Dependencies are injected through function parameters
- No hidden state or side effects

### 2. Composition Over Inheritance
- Features are functions, not classes
- Commands compose features
- Utilities are pure, composable functions

### 3. Result Types Over Exceptions
- Operations return Result objects with success flag
- Details explain what happened
- Payload carries typed data
- Exceptions are for truly exceptional cases only

### 4. Immutable Configuration
- Config is built once and passed through
- No mutation during execution
- Predictable, deterministic behavior

### 5. Single Responsibility
- CLI: Parse args, route commands, handle exit
- Commands: Orchestrate features, aggregate results
- Features: Perform ONE operation
- Utilities: Provide reusable primitives

---

## Command-Feature Mapping Reference

| Command     | Features Used                              | Output Type              |
|-------------|--------------------------------------------|--------------------------|
| `init`      | template-installer                         | template_count           |
| `sync`      | template-merger                            | updated_files[]          |
| `validate`  | path-routing-generator, structure-validator| missing[]                |
| `status`    | drift-checker                              | drifted[]                |
| `reset`     | template-reset                             | reset_files[]            |
| `generate`  | path-routing-generator                     | routing_map, routes[]    |

---

## Extension Points

### Adding a New Command

1. Create `commands/new_command.py`
2. Implement `async def new_command(options: CommandOptions) -> CommandResult`
3. Register in `command_map` in `cli.py`

### Adding a New Feature

1. Create `features/new_feature.py`
2. Define result type in `types/feature_types.py`
3. Implement `async def new_feature(config: Config) -> FeatureResult`

### Adding Configuration Options

1. Extend type in `types/config_types.py`
2. Add default in `configs/defaults.py`
3. Handle in `utils/config_utils.py`

---

## Summary

This architecture provides:

- **Clarity**: Each layer has a single purpose
- **Testability**: Pure functions, explicit dependencies
- **Extensibility**: Easy to add commands/features
- **Reliability**: Result types prevent silent failures
- **Maintainability**: Small, focused modules

The key insight is that **commands orchestrate, features execute, utilities support**. This separation allows complex CLI tools to remain comprehensible and maintainable as they grow.
