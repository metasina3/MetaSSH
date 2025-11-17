# Changelog

All notable changes to MetaSSH will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-XX

### Added
- Initial release of MetaSSH
- SSH terminal emulator with multiple concurrent sessions
- SFTP file manager with dual-pane browser
- Server management with encrypted credential storage
- Support for password and private key authentication
- Dark theme UI inspired by modern SSH clients
- Tabbed terminal interface
- Cross-platform support (Windows, Linux, macOS)
- Local file system browser
- File upload/download functionality
- Remote file operations (create, rename, delete)
- Settings page with theme and font size controls
- Search and filter for server list
- Responsive design

### Security
- AES-256 encryption for stored credentials
- Local-only data storage (no cloud sync)
- Secure IPC communication between processes

### Technical
- Built with Electron 28
- React 18 with TypeScript
- TailwindCSS for styling
- xterm.js for terminal emulation
- ssh2 for SSH/SFTP connections

