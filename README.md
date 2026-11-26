# Roast My CV

A friendly, direct CV review tool that turns a CV and a target role into practical feedback.

## Run locally

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

Open http://127.0.0.1:8001. Upload a PDF or DOCX CV and enter a target role. The app extracts text using `pypdf` or `python-docx`. It provides a local structure and evidence review by default. Set `OPENAI_API_KEY` to enable a deeper role-aware LLM review; set `OPENAI_MODEL` to override the default `gpt-4o-mini` model.

The uploaded document is processed in memory and is not saved by the app. When the AI review is enabled, extracted CV text is sent to the OpenAI API for review. Review results stay in the current browser tab's session storage. Keep API keys out of source control; `.env` files are ignored by Git.

## Publish on Render

1. Push this project to a GitHub repository.
2. In Render, choose **New → Blueprint** and connect that repository. Render reads `render.yaml` to create the web service.
3. Wait for the deploy to finish, then open its `onrender.com` address.
4. To enable AI reviews, add `OPENAI_API_KEY` under the service’s **Environment** settings. Add `OPENAI_MODEL` only if you want to change the default model. Never commit the API key.
5. For a custom domain, add it under the service’s **Settings → Custom Domains**. Copy the DNS records Render gives you into your registrar’s DNS panel, then verify the domain in Render. Render provisions HTTPS for custom domains.

The Render free instance is useful for a demo; it sleeps after 15 minutes without traffic and can take about a minute to wake. Choose a paid always-on instance when you need a responsive public service. Add rate limits and abuse monitoring before promoting an API-backed public launch.

