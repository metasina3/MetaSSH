# MetaSSH

<div align="center">

![MetaSSH](https://img.shields.io/badge/MetaSSH-v1.0.0-cyan?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey?style=for-the-badge)

**A modern, open-source SSH/SFTP desktop client built with Electron, React, and TypeScript**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Development](#-development) • [Contributing](#-contributing)

</div>

---

## ✨ Features

### 🔐 Secure Connection Management
- **Multiple Server Profiles**: Save and manage unlimited SSH server configurations
- **Dual Authentication**: Support for both password and private key authentication
- **AES-256 Encryption**: All credentials are encrypted at rest using industry-standard encryption
- **Local Storage**: All data stored locally - no cloud account required

### 🖥️ Terminal Emulator
- **Multiple Concurrent Sessions**: Open and manage multiple SSH terminal sessions simultaneously
- **Tabbed Interface**: Clean tab-based UI for easy session management
- **xterm.js Integration**: Full-featured terminal emulator with proper shell support
- **Auto-resize**: Terminal automatically adjusts to window size

### 📁 SFTP File Manager
- **Dual-Pane Browser**: Side-by-side local and remote file browsing
- **Drag & Drop Ready**: Intuitive file transfer interface
- **File Operations**: Upload, download, rename, delete, and create directories
- **Cross-Platform**: Works seamlessly on Windows, Linux, and macOS

### 🎨 Modern UI/UX
- **Dark Theme**: Beautiful dark interface inspired by modern SSH clients
- **Responsive Design**: Adapts to different screen sizes
- **Intuitive Navigation**: Clean sidebar navigation with clear visual hierarchy
- **Search & Filter**: Quickly find servers in your list

### ⚙️ Settings & Customization
- **Theme Control**: Toggle dark mode
- **Font Size**: Adjustable terminal font size
- **Data Management**: Export/import configurations (coming soon)
- **Backup**: Secure backup of your server configurations

## 🚀 Installation

### Prerequisites
- Node.js 18+ and npm
- Git (for cloning)

### Build from Source

1. **Clone the repository**
   ```bash
   git clone https://github.com/metasina3/MetaSSH.git
   cd MetaSSH
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run electron:dev
   ```

4. **Build for production**
   ```bash
   npm run build
   npm run electron:build
   ```

   The built application will be in the `release/` directory.

### Pre-built Binaries

Pre-built binaries for Windows, Linux, and macOS will be available in the [Releases](https://github.com/metasina3/MetaSSH/releases) section.

## 📖 Usage

### Adding a Server

1. Click **"Add Server"** on the Server List page
2. Fill in the connection details:
   - **Name**: A friendly name for your server
   - **Host**: Server hostname or IP address
   - **Port**: SSH port (default: 22)
   - **Username**: SSH username
   - **Authentication**: Choose Password or Private Key
3. Click **"Create"** to save

### Connecting via Terminal

1. Navigate to the **Servers** page
2. Click the **Play** icon next to your server
3. A new terminal tab will open with an active SSH connection
4. Start typing commands - they'll execute on the remote server

### Using SFTP File Manager

1. Navigate to the **SFTP** page
2. Select a server from the dropdown
3. Browse local files (left pane) and remote files (right pane)
4. **Upload**: Select a local file and click "Upload"
5. **Download**: Select a remote file and click "Download"
6. **Manage Files**: Use the toolbar buttons to create folders, rename, or delete files

### Managing Multiple Sessions

- Open multiple terminal tabs by connecting to different servers
- Each session runs independently
- Switch between tabs to manage multiple connections
- Sessions remain active when navigating between pages

## 🛠️ Development

### Project Structure

```
MetaSSH/
├── electron/           # Electron main process
│   ├── main.ts        # Main process entry point
│   ├── preload.ts     # Preload script
│   └── utils/         # Backend utilities
│       ├── sshSessionManager.ts
│       ├── sftpManager.ts
│       ├── serverStore.ts
│       └── encryption.ts
├── src/               # React frontend
│   ├── components/    # React components
│   ├── pages/         # Page components
│   └── types/         # TypeScript types
└── dist-electron/     # Compiled Electron code
```

### Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS
- **Backend**: Electron 28, Node.js
- **SSH/SFTP**: ssh2 library
- **Terminal**: xterm.js
- **Routing**: React Router

### Development Commands

```bash
# Start development server
npm run electron:dev

# Build React app
npm run build:react

# Build Electron main process
npm run build:electron

# Build everything
npm run build

# Create production build
npm run electron:build
```

### Code Style

- TypeScript strict mode enabled
- ESLint for code quality
- Prettier for formatting (recommended)
- Component-based architecture

## 🔒 Security

- **Encryption**: All passwords and passphrases are encrypted using AES-256
- **Local Storage**: All data is stored locally on your machine
- **No Telemetry**: MetaSSH does not collect or send any data
- **Open Source**: Full source code available for security audits

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Add comments for complex logic
- Test your changes thoroughly
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [ssh2](https://github.com/mscdex/ssh2) - SSH2 client library
- [xterm.js](https://xtermjs.org/) - Terminal emulator
- [Electron](https://www.electronjs.org/) - Cross-platform desktop framework
- [React](https://react.dev/) - UI library
- [TailwindCSS](https://tailwindcss.com/) - CSS framework

## 📧 Contact

- **GitHub**: [@metasina3](https://github.com/metasina3)
- **Project**: [MetaSSH](https://github.com/metasina3/MetaSSH)

## 🗺️ Roadmap

- [ ] Master password protection
- [ ] Server grouping and tags
- [ ] Connection profiles (jump hosts)
- [ ] Port forwarding
- [ ] Terminal themes
- [ ] Command history
- [ ] Session recording
- [ ] Import/Export configurations
- [ ] Keyboard shortcuts
- [ ] Plugin system

---

<div align="center">

**Made with ❤️ by the MetaSSH team**

⭐ Star this repo if you find it useful!

</div>
