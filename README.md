# Sejong City Library Web Archiver (Google Apps Script)

This repository contains a Google Apps Script designed to automatically scrape and archive the HTML content of the [Sejong City Library's traffic sensor page](https://lib.sejong.go.kr/main/site/sensor/traffic.do).

The project has two parts:

1. **Backend Archiver:** A script that runs on a schedule, fetches the library's page using ScraperAPI, and saves a timestamped HTML file to a Google Drive folder.

2. **Frontend Web App:** A simple web interface that allows you to browse and view the HTML files that have been archived.


## Key Features

- **Scheduled Archiving:** Designed to be run on a time-based trigger (e.g., every 15 minutes).

- **KST Time-Aware Logic:** The script includes a smart time-check and will **only** execute the scrape logic during specific "operating hours" based on the **Asia/Seoul (KST)** timezone.

- **API-Powered Fetching:** Uses ScraperAPI to help bypass potential IP blocks or anti-scraping measures.

- **Archived Data Viewer:** Includes a deployable web app to easily view the saved HTML files from your Google Drive.

- **Organized Storage:** Saves all files to a specific Google Drive folder (default: `SJLIB`) with a KST-timestamped filename (e.g., `2025-11-05_12-30-01_PageContent_Code-200.html`).


## 1. Backend: How the KST Time-Check Works

The script will only perform the web scrape if the current time in KST (Asia/Seoul) is within the following windows:

- **Weekdays (Mon-Fri):** 9:00 AM (09:00) – 10:00 PM (22:00) KST

- **Weekends (Sat-Sun):** 9:00 AM (09:00) – 6:00 PM (18:00) KST

If the script is triggered outside of these hours, it will simply log a "Skipping execution" message and exit, consuming minimal resources.


## 2. Frontend: Web App Viewer

The repository includes an `index.html` and `sidebar.html` file, which create a web app to view your archived data.

- The **sidebar** (`sidebar.html`) loads a list of all archived HTML files from your Google Drive folder.

- The **main page** (`index.html`) provides a content area.

- When you click a file in the sidebar, the app fetches the content of that HTML file and displays it in the main content area, allowing you to see the "snapshot" of the library page as it was at that specific time.

***


## Setup and Deployment (Complete)

Follow these steps to set up both the backend archiver and the frontend web app.


### Step 1: Configuration (Required)

Before this script will work, you **must** set your ScraperAPI key.

1. Sign up for an account at [ScraperAPI.com](https://www.scraperapi.com/) to get an API key.

2. Open your Google Apps Script project.

3. Go to **Project Settings** ⚙️ on the left-hand menu.

4. Scroll down to the **Script Properties** section and click **Add script property**.

5. Set the following:

   - **Property:** `SCRAPERAPI_API_KEY`

   - **Value:** `your_scraperapi_key_goes_here`

6. Click **Save script properties**.

> **Note:** You can also change the `targetUrl` and `folderName` variables directly at the top of the script file if needed.


### Step 2: `clasp` Workflow (Recommended)

This workflow assumes you are using `clasp` and the Dev Container environment.

1. **Clone & Open:**

   - Clone this repository.

   - Open the folder in VS Code.

   - When prompted, click **"Reopen in Container"**.

2. **Authenticate `clasp`:**

   - Open the VS Code terminal (it's now inside the container).

   - Run `clasp login` and follow the prompts to log in to your Google account.

   Bash

       clasp login

3. **Create or Link Project:**

   - **To create a new project:**

     Bash

         clasp create --title "Sejong Library Scraper" --rootDir ./src

   - **To link an existing project:**

     1. Go to your Apps Script project's **Settings** ⚙️ and copy the **Script ID**.

     2. Run `clasp clone`:

     Bash

         SCRIPT_ID="YOUR_SCRIPT_ID"
         clasp clone $SCRIPT_ID --rootDir ./src

4. **Set Configuration:**

   - Go to the Apps Script project in your browser (you can run `clasp open`).

   - Follow the **Configuration (Required)** steps above to add your `SCRAPERAPI_API_KEY`.

5. **Push Code:**

   - Push your local files to the cloud:

   Bash

       clasp push


### Step 3: Deploy the Web App

To use the web app viewer, you must create a deployment.

1. In the Apps Script web editor, click the **Deploy** button in the top-right corner.

2. Select **New deployment**.

3. Click the **Select type** gear icon ⚙️ and choose **Web app**.

4. In the "Who has access" dropdown, select **Only myself** (or "Anyone with Google account" if you want to share it within your organization).

5. Click **Deploy**.

6. **Copy the Web app URL.** This is the link you will use to access your archive viewer.


### Step 4: Set the Automated Trigger

Finally, set up the script to run automatically.

1. Run the `setupTrigger` function once from your terminal:

   Bash

       clasp run setupTrigger

2. **Alternatively (and recommended for first-time permissions):**

   - In the Apps Script web editor, select the `setupTrigger` function from the dropdown menu.

   - Click the **Run** button.

   - You will be prompted to **grant permissions**. This is necessary for the script to create triggers and save files to your Drive.

That's it! The script will now run every 15 minutes to archive the webpage, and you can view the results at any time using your deployed Web app URL.


## Development Environment (VS Code Dev Container)

This repository provides a complete, pre-configured development environment for Google Apps Script using **VS Code Dev Containers**. It allows any developer to start coding immediately with all tools, extensions, and configurations set up automatically.


### Prerequisites

To use this environment, you must have the following installed on your local machine:

1. **Visual Studio Code**

2. **Docker Desktop** (or another compatible container runtime)

3. The [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension for VS Code.

4. Your host machine must have its `~/.ssh` keys and `~/.gitconfig` file set up (for seamless Git authentication).


### Common `clasp` Workflow

All commands are run from the VS Code terminal inside the Dev Container.

- **Upload** your local code to the cloud:

  Bash

      clasp push

- **Download** cloud code to your local machine:

  Bash

      clasp pull

- **Open** the cloud project in your browser:

  Bash

      clasp open

- **Run** a specific function remotely (like `setupTrigger`):

  Bash

      clasp run setupTrigger
