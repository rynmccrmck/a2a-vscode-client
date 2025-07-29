# Change Log

## [0.1.3] - 2025-01-28

### Added

- Complete A2A protocol support for all event types (status-update, artifact-update, task-update)
- Collapsible artifact display with structured headers and content
- Task update notifications with detailed metadata
- Enhanced status update display with expandable details
- Clean toggle switch for streaming mode (replaces tab interface)

### Improved

- Standardized message layouts with consistent headers and icons
- Better visual hierarchy for different message types
- Streaming mode now defaults to enabled
- More intuitive artifact naming and status indicators

### Fixed

- Artifact updates now properly display with append/replace modes
- Status details consistently appear below message content
- Task ID tracking and display throughout conversation lifecycle

## [0.1.2] - 2025-01-27

### Added

- Enhanced status message display with badge indicators
- Basic artifact detection and preliminary display support
- Improved task lifecycle tracking

### Improved

- Better error handling for malformed streaming responses
- More consistent message formatting across different event types
- Enhanced debug logging for development

### Fixed

- Status update parsing for complex message structures
- Memory leaks in streaming event handlers
- Task ID persistence across page refreshes

## [0.1.1] - 2025-01-26

### Added

- Streaming event type detection and basic routing
- Enhanced message part parsing (text/data/file parts)
- Basic collapsible UI components

### Improved

- More robust JSON-RPC response handling
- Better typescript type safety in A2A service
- Cleaner separation between UI and service layers

### Fixed

- Race conditions in streaming message processing
- CSS styling conflicts between different message types
- Agent connection state management edge cases

## [0.1.0] - 2025-08-01

### Added

- Initial release
- A2A agent connection and chat
- Agent card viewer
- Basic error handling and logging
