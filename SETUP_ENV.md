# Setting Up Environment Variables for Backend

## Problem
You're getting the error: `OPENAI_API_KEY not found in environment variables`

## Solution

### Step 1: Create `.env` file in the backend directory

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a `.env` file:
   ```bash
   touch .env
   ```

   Or on Windows:
   ```cmd
   type nul > .env
   ```

### Step 2: Add your OpenAI API Key

Open the `.env` file and add:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

**Important**: Replace `sk-your-actual-api-key-here` with your actual OpenAI API key.

### Step 3: Get an OpenAI API Key (if you don't have one)

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (it starts with `sk-`)
5. Paste it in your `.env` file

### Step 4: Restart your backend server

After creating/updating the `.env` file:

1. Stop your backend server (Ctrl+C)
2. Restart it:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

## File Structure

Your backend directory should look like this:
```
backend/
  ├── .env          ← Create this file
  ├── main.py
  ├── models.py
  ├── database.py
  └── services/
      └── openai_service.py
```

## Optional: Additional Configuration

You can also set these optional variables in `.env`:

```env
# OpenAI API Key (REQUIRED)
OPENAI_API_KEY=sk-your-api-key-here

# Optional: Choose the model (default: gpt-4o-mini)
OPENAI_MODEL=gpt-4o-mini

# Optional: Maximum file size in bytes (default: 10MB)
MAX_FILE_SIZE=10485760
```

## Security Note

⚠️ **Never commit your `.env` file to git!**

Make sure `.env` is in your `.gitignore` file. The `.env` file contains sensitive information and should only exist locally.

## Verify It's Working

After setting up the `.env` file and restarting the backend:

1. Try uploading a PDF file again
2. Check the backend console - you should see logs like:
   ```
   INFO: Initializing OpenAI service with model: gpt-4o-mini
   INFO: Processing PDF: your-file.pdf, Size: 12345 bytes
   ```

If you still get errors, check:
- The `.env` file is in the `backend/` directory (not the root)
- The API key is correct (starts with `sk-`)
- You've restarted the backend server after creating/updating `.env`
