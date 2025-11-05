# Sejong City Library Web Archiver (Google Apps Script)

This repository contains a Google Apps Script designed to automatically scrape and archive the HTML content of the [Sejong City Library's traffic sensor page](https://lib.sejong.go.kr/main/site/sensor/traffic.do "null").

The script uses **ScraperAPI** to fetch the page content and saves a timestamped HTML file to a specified folder in your Google Drive.

## Key Features

- **Scheduled Archiving:** Designed to be run on a time-based trigger (e.g., every 15 minutes).

- **KST Time-Aware Logic:** The script includes a smart time-check and will **only** execute the scrape logic during specific "operating hours" based on the **Asia/Seoul (KST)** timezone. This prevents unnecessary API calls outside of peak times.

- **API-Powered Fetching:** Uses ScraperAPI to help bypass potential IP blocks or anti-scraping measures.

- **Automated Setup:** Includes a `setupTrigger` function to automatically clear old triggers and create a new 15-minute trigger.

- **Organized Storage:** Saves all files to a specific Google Drive folder (default: `SJLIB`) with a KST-timestamped filename (e.g., `2025-11-05_12-30-01_PageContent_Code-200.html`).

## How the KST Time-Check Works

The script will only perform the web scrape if the current time in KST (Asia/Seoul) is within the following windows:

- **Weekdays (Mon-Fri):** 9:00 AM (09:00) – 10:00 PM (22:00) KST

- **Weekends (Sat-Sun):** 9:00 AM (09:00) – 6:00 PM (18:00) KST

If the script is triggered outside of these hours, it will simply log a "Skipping execution" message and exit, consuming minimal resources.

## Configuration (Required)

Before this script will work, you **must** set your ScraperAPI key.

1. Sign up for an account at [ScraperAPI.com](https://www.scraperapi.com/ "null") to get an API key.

2. Open your Google Apps Script project.

3. Go to **Project Settings** ⚙️ on the left-hand menu.

4. Scroll down to the **Script Properties** section and click **Add script property**.

5. Set the following:

   - **Property:** `SCRAPERAPI_API_KEY`

   - **Value:** `your_scraperapi_key_goes_here`

6. Click **Save script properties**.

You can also change the `targetUrl` and `folderName` variables directly at the top of the `saveHtmlToDriveInFolder` function in the script file.

## Quick Start & Deployment

This workflow assumes you are using `clasp` and the Dev Container environment (see below).

1.  **Clone & Open:**

    - Clone this repository.

    - Open the folder in VS Code.

    - When prompted, click **"Reopen in Container"**.

2.  **Authenticate `clasp`:**

    - Open the VS Code terminal (it's now inside the container).

    - Run `clasp login` and follow the prompts to log in to your Google account.

      ```
      clasp login
      ```

3.  **Create the Project:**

    ```
    clasp create --title "Sejong Library Scraper" --rootDir ./src
    ```

4.  **Set Configuration:**

    - Go to the Apps Script project in your browser (you can run `clasp open`).

    - Follow the **Configuration** steps above to add your `SCRAPERAPI_API_KEY` as a Script Property.

5.  **Push Code & Set Trigger:**

    - Push your local files to the cloud:

          clasp push

    - Run the `setupTrigger` function from your terminal to start the automation:

          clasp run setupTrigger

      > **Note:** The first time you run this, you may need to grant permissions. It's recommended to run `setupTrigger` **at least once from the Apps Script web editor** to ensure all necessary authorizations are approved.

That's it! The script will now run every 15 minutes and archive the webpage according to the KST time rules.

## Development Environment (VS Code Dev Container)

This repository provides a complete, pre-configured development environment for Google Apps Script using **VS Code Dev Containers**. It allows any developer to start coding immediately with all tools, extensions, and configurations set up automatically.

### Prerequisites

To use this environment, you must have the following installed on your local machine:

1. **Visual Studio Code**

2. **Docker Desktop** (or another compatible container runtime)

3. The [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers "null") extension for VS Code.

4. Your host machine must have its `~/.ssh` keys and `~/.gitconfig` file set up (for seamless Git authentication).

### Getting Started (in Container)

1.  **Clone this Repository**

    git clone [https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git](https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git)
    cd YOUR-REPOSITORY

2.  **Open in Dev Container**

    - Open the project folder in VS Code.

    - A pop-up will appear in the bottom-right corner: "Folder contains a Dev Container configuration file. Reopen in Container?"

    - Click **"Reopen in Container"**. (The first time you do this, it will take a minute to build the container).

3.  **Log in to `clasp` (One-Time Setup)**

    - Once the container is loaded, open the VS Code terminal.

    - Run the `clasp login` command:

          clasp login

You are now authenticated and ready to work.

### Common `clasp` Workflow

All commands are run from the VS Code terminal inside the Dev Container.

- **Upload** your local code to the cloud:

      clasp push

- **Download** cloud code to your local machine:

      clasp pull

- **Open** the cloud project in your browser:

      clasp open

- **Run** a specific function remotely (like `setupTrigger`):

      clasp run setupTrigger

  > **Note:** Functions that require special permissions (like `setupTrigger`) must be run at least once from the Apps Script web editor to provide the necessary authorization.
