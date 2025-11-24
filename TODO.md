# TODO

## Current Sprint - Phase 5 Planning

- [ ] Review and document current architecture patterns
- [ ] Define standard object response pattern for all logic
- [ ] Identify config-driven design opportunities in codebase
- [ ] Plan data-driven architecture refactor approach

## Next - Phase 5 Core Features

### Data-Driven Design
- [ ] Establish shared object response pattern utility
- [ ] Review old codebase config patterns (`_ARCHIVE/erik-example-json-rpc/src/config`)
- [ ] Implement config-driven design top-down
- [ ] Make user-context more data-driven (priority)

### Enhanced User-Context
- [ ] Create default user-context with example data
- [ ] Implement context schema migration system
- [ ] Add context relationship validation
- [ ] Design VS Code UI for editing context
- [ ] Build onboarding solution for user-context creation
- [ ] Support local + global caching options
- [ ] Add tools for read/update user-context

### VS Code Extension Enhancements
- [ ] Add status bar integration
- [ ] Implement settings for customization (data-driven)
- [ ] Improve error messages
- [ ] Better UI/UX for commands

### New Skills Development
- [ ] Communication skill (unified messaging to user/LLM)
- [ ] HandleData skill (DB, API, XML, JSON, CSV operations)
- [ ] Clarification skill (context-aware request clarification)
- [ ] Workflow skill (multi-step orchestration)
- [ ] Validation skill (schema validation, auto-correction)

## Backlog - Phase 5 Polish

### Testing
- [ ] Integration tests (end-to-end)
- [ ] Performance tests
- [ ] Error scenario tests
- [ ] More Evalite scenarios

### Documentation
- [ ] Update README.md (setup, usage)
- [ ] Create CONTRIBUTING.md (dev guide)
- [ ] Create API.md (skill API docs)
- [ ] Write user guide for extension

### DevX Improvements
- [ ] Better logging/debugging
- [ ] Hot reload for skills
- [ ] Skill scaffolding CLI

### Security Hardening
- [ ] Input validation everywhere
- [ ] Sandboxing for skills
- [ ] Rate limiting
- [ ] Audit logging

## Reference Links

- Old codebase agents: `_ARCHIVE/erik-example-json-rpc/src/agent`
- Config patterns: `_ARCHIVE/erik-example-json-rpc/src/config`
- Shared logic: `_ARCHIVE/erik-example-json-rpc/src/shared`
- User context examples: `_ARCHIVE/erik-example-json-rpc/src/userContext`