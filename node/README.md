## How to Run the Project

### 1. Clone the repository

```bash
git clone <repository-url>
cd linkedin-job-monitor
```

### 2. Install dependencies

Make sure Node.js is installed, then run:

```bash
npm install
```

### 3. Create the `.env` file

Copy `.env.example`:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Open `.env` and replace the example values with the required configuration.

### 4. Add Google credentials

Place the Google service account credential file in the project root:

```text
google-credentials.json
```

The project should look like:

```text
linkedin-job-monitor/
├── src/
├── .env
├── google-credentials.json
├── package.json
└── README.md
```

Make sure the service account has access to the Google Sheet.

### 5. Run the project

```bash
npm start
```

The program will run the first monitoring cycle immediately and then continue monitoring LinkedIn jobs at the configured interval.

### 6. Stop the program

Press:

```text
Ctrl + C
```