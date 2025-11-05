# Google Apps Script Dev Container Project

This repository provides a complete, pre-configured development environment for Google Apps Script using **VS Code Dev Containers**. It allows any developer to start coding immediately with all tools, extensions, and configurations (including Git authentication) set up automatically.

## Features

This environment comes pre-configured with:

- **Node.js v20:** A stable environment for running your tools.
- **Google `clasp`:** The official command-line tool for Google Apps Script is pre-installed globally.
- **GAS Autocomplete:** `npm` packages for `@types/google-apps-script` are included in `package.json` to provide full IntelliSense and autocomplete for Apps Script services (like `SpreadsheetApp`).
- **Seamless Git Auth:** The container automatically and securely mounts your local **`.ssh`** keys and **`.gitconfig`**. You can `git push` and `git pull` from inside the container without any setup.
- **Pre-installed VS Code Extensions:**
  - **ESLint:** For code linting and finding errors.
  - **Prettier:** For automatic code formatting.
  - **Material Icon Theme:** For easier file navigation.
- **VS Code Settings:**
  - `*.gs` files are automatically recognized as JavaScript.
  - **Format on Save** is enabled by default.

## Prerequisites

To use this project, you must have the following installed on your local machine:

1.  **Visual Studio Code**
2.  **Docker Desktop** (or another compatible container runtime)
3.  The [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension for VS Code.
4.  Your host machine must have its `~/.ssh` keys and `~/.gitconfig` file set up for this to work.

## Getting Started

1.  **Clone this Repository**

    ```bash
    git clone [https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git](https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git)
    cd YOUR-REPOSITORY
    ```

2.  **Open in Dev Container**

    - Open the project folder in VS Code.
    - A pop-up will appear in the bottom-right corner: "Folder contains a Dev Container configuration file. Reopen in Container?"
    - Click **"Reopen in Container"**. (The first time you do this, it will take a minute to build the container).

3.  **Log in to `clasp` (One-Time Setup)**
    - Run the `clasp login` command
      ```bash
      clasp login
      ```

You are now authenticated and ready to work!

## Common Workflow

All commands are run from the VS Code terminal.

### To Create a New Project

1.  Create your code locally (e.g., `Code.gs`, `appsscript.json`).
2.  Run `clasp create` to make a new project on Google Drive and link it:
    ```bash
    PROJECT_NAME="YOUR_PROJECT_NAME"
    ```
    ```bash
    clasp create --title $PROJECT_NAME --rootDir ./src
    clasp push
    ```

### To Link an Existing Project

1.  Go to your Apps Script project's **Settings** ⚙️ and copy the **Script ID**.
2.  Run `clasp clone` to pull the code:
    ```bash
    SCRIPT_ID="YOUR_SCRIPT_ID"
    clasp clone $SCRIPT_ID --rootDir ./src
    ```

### To Push/Pull Changes

- **Upload** your local code to the cloud:
  ```bash
  clasp push
  ```
- **Download** cloud code to your local machine:
  ```bash
  clasp pull
  ```
