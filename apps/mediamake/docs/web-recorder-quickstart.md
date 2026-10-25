# Web Recorder - Quick Start Guide

## Setup

1. **Set Environment Variables**

   Add to your `.env` file:

   ```env
   # Media Helper API Base URL
   MEDIA_HELPER_URL=http://your-media-helper-api-url

   # Media Helper API Key (Bearer Token)
   MEDIA_HELPER_API_KEY=your-api-key-here

   # JWT Encryption Secret (for webhook authentication)
   MEDIA_HELPER_SECRET=your-secret-key-for-jwt

   # Your API key (for webhook callbacks)
   DEV_API_KEY=your-mediamake-api-key
   ```

   Example for local development:

   ```env
   MEDIA_HELPER_URL=http://localhost:8080
   MEDIA_HELPER_API_KEY=sk_test_1234567890abcdef
   MEDIA_HELPER_SECRET=my-jwt-secret-key-123
   DEV_API_KEY=dev-test-key-12345
   ```

2. **Configure Webhook URL (Optional)**

   For production or when using external APIs that need to reach your webhook:

   ```env
   NEXT_PUBLIC_APP_URL=https://your-app-url.com
   ```

   For local development with ngrok:

   ```env
   NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok.io
   ```

## How to Use

### Accessing the Web Recorder

1. Navigate to the Media page: `http://localhost:3000/core/media`
2. You'll see three dropzones:
   - **URL Indexing** (left)
   - **Upload Files** (center)
   - **Web Recorder** (right) ✨

### Using the Web Recorder

**Two Ways to Start:**

1. **Click** the Web Recorder dropzone to open the dialog manually
2. **Drag & Drop** a JSON configuration file to auto-fill advanced mode

### Simple Mode (Recommended for Beginners)

1. Click on the **Web Recorder** dropzone
2. Select **Simple Mode** (default)
3. Enter the website URL you want to record
4. (Optional) Add text highlights:
   - Click "Add Highlight"
   - Enter the text to highlight
   - Choose a color
   - Add more highlights as needed
5. Select one or more tags for organizing your video
6. Click "Start Recording"

**Example:**

- URL: `https://example.com`
- Highlights:
  - Text: "Welcome", Color: Yellow (#FFFF00)
  - Text: "Features", Color: Red (#FF6B6B)
- Tags: "demo", "tutorial"

### Advanced Mode (For Custom Actions)

**Method 1: Manual Entry**

1. Click on the **Web Recorder** dropzone
2. Switch to **Advanced Mode**
3. Enter your JSON configuration:

**Method 2: Drag & Drop JSON File**

1. Prepare a JSON file with your configuration (e.g., `recording-config.json`)
2. Drag and drop it onto the **Web Recorder** dropzone
3. The dialog will open automatically with the JSON pre-filled

**JSON Format:**

```json
{
  "url": "https://example.com",
  "actions": [
    { "type": "goto", "url": "https://example.com", "waitUntil": "load" },
    { "type": "click", "selector": "#search-button" },
    { "type": "type", "selector": "#search-input", "text": "Hello" },
    { "type": "wait", "duration": 1000 },
    { "type": "scroll", "y": 300 }
  ],
  "highlights": [{ "type": "text", "value": "Results", "color": "#FFFF00" }]
}
```

4. Select tags
5. Click "Start Recording"

## What Happens Next

1. **Job Submission**: Your recording request is sent to the WebAction Recorder API
2. **Confirmation**: You'll see a success message with a job ID
3. **Processing**: The API records the website interaction (this happens in the background)
4. **Webhook Callback**: When complete, the API sends the video URL to your webhook
5. **Media Library**: The video automatically appears in your media library with the tags you selected

## Finding Your Recorded Videos

1. Go to the Media page
2. Use the **Content Source** filter and select "Web Recorder"
3. Or filter by the tags you assigned during recording

## Tips

- **Use descriptive tags**: Makes it easier to find recordings later
- **Start simple**: Try simple mode first before using advanced mode
- **Test highlights**: Use common text that appears on the page
- **Viewport size**: Default is 1280x720, perfect for most use cases
- **Wait times**: In advanced mode, add `wait` actions after clicks to allow page updates

## Troubleshooting

### "MEDIA_HELPER_URL environment variable not set"

- Make sure you've added the environment variable to your `.env` file
- Restart your development server after adding the variable

### "MEDIA_HELPER_API_KEY environment variable not set"

- Make sure you've added the API key to your `.env` file
- Get your API key from the Media Helper service
- Restart your development server after adding it

### "MEDIA_HELPER_SECRET not configured"

- Make sure you've added the JWT secret to your `.env` file
- This should be a random string for encrypting webhook secrets
- Restart your development server after adding it

### "API request failed: 401" or "Unauthorized"

- Your API key is invalid or expired
- Check that you're using the correct API key
- Make sure the API key has the correct format (Bearer token)

### Video doesn't appear in media library

- Check that the WebAction Recorder API is running
- Verify your webhook URL is publicly accessible (use ngrok for local dev)
- Check the API logs for errors

### Highlights not working

- Make sure the exact text exists on the page
- Text matching is case-sensitive
- For dynamic content, use selector-based highlights in advanced mode

### Recording fails

- Verify the URL is accessible
- Check that all required actions are valid
- In advanced mode, ensure JSON is properly formatted

## Examples

### Example 1: Simple Landing Page Recording

```
URL: https://yoursite.com
Highlights:
  - "Get Started" (Yellow)
  - "Free Trial" (Green)
Tags: landing-page, marketing
```

### Example 2: Product Demo with Interactions

```json
{
  "url": "https://yourapp.com/demo",
  "actions": [
    {
      "type": "goto",
      "url": "https://yourapp.com/demo",
      "waitUntil": "networkidle"
    },
    { "type": "click", "selector": "#feature-1" },
    { "type": "wait", "duration": 2000 },
    { "type": "click", "selector": "#feature-2" },
    { "type": "wait", "duration": 2000 }
  ],
  "viewport": { "width": 1920, "height": 1080 }
}
```

### Example 3: Form Fill Demo

```json
{
  "url": "https://example.com/contact",
  "actions": [
    { "type": "goto", "url": "https://example.com/contact" },
    { "type": "type", "selector": "#name", "text": "John Doe" },
    { "type": "type", "selector": "#email", "text": "john@example.com" },
    {
      "type": "type",
      "selector": "#message",
      "text": "This is a test message"
    },
    { "type": "click", "selector": "#submit" }
  ],
  "highlights": [{ "type": "selector", "value": "#submit", "color": "#00FF00" }]
}
```

## Need More Help?

- See the [full integration documentation](./web-recorder-integration.md)
- Check the [WebAction Recorder API documentation](https://docs.webactionrecorder.com)
- Review the OpenAPI specification provided by the API
