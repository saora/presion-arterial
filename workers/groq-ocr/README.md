# Groq visual OCR Worker

The GitHub Pages app is static, so Groq credentials must only be stored in this
Cloudflare Worker. The worker sends the scan image to Groq for one-time
interpretation and does not store the image.

## Deploy

1. Install Wrangler or run it through `npx`, then authenticate:

   ```sh
   npx wrangler login
   ```

2. Create a Groq API key in GroqCloud and add it as a Worker secret:

   ```sh
   npx wrangler secret put GROQ_API_KEY --config workers/groq-ocr/wrangler.toml
   ```

   Paste the key only into the Wrangler prompt. Do not add it to the app, a
   `.env` file committed to Git, or GitHub Pages variables.

3. Deploy the Worker:

   ```sh
   npx wrangler deploy --config workers/groq-ocr/wrangler.toml
   ```

4. In the GitHub repository settings, add an Actions **variable**
   `GROQ_OCR_URL` containing the deployed Worker URL with `/api/scan`, for
   example `https://presion-arterial-groq-ocr.<account>.workers.dev/api/scan`.
   The existing Pages workflow injects this URL when building the frontend.

5. Push or rerun the Pages workflow to publish the configured frontend.

The Worker allows `https://saora.github.io` and Vite's local development
origins by default. If the app uses a custom domain, change `ALLOWED_ORIGINS`
in `wrangler.toml` to include that exact origin before deploying.

The Worker limits each IP to 20 scan requests per minute, validates image size
and reading ranges, and returns values only when systolic, diastolic, and pulse
are all clearly readable. The app keeps local Tesseract OCR enabled when
`VITE_GROQ_OCR_URL` is not configured.

## Local development

Create `.env.local` with the deployed Worker endpoint:

```dotenv
VITE_GROQ_OCR_URL=https://presion-arterial-groq-ocr.<account>.workers.dev/api/scan
```

Restart Vite after changing environment variables. `.env.local` is ignored by
Git.
