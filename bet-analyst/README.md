# V2 BET ANALYST
Status: image upload/preview implemented. AI analysis is inactive until a backend is deployed and configured. V1/main and the shared bets are unchanged.

## Activate
1. Create a Cloudflare Worker using `worker.mjs`. No changes to GitHub Pages hosting are required.
2. In the Worker's settings, add secret `OPENAI_API_KEY` and secret `CREW_ACCESS_CODE`. Give the latter to the crew privately. Never commit either secret or ask visitors for an OpenAI key.
3. Set variable `OPENAI_MODEL` to an image-capable Responses API model available to your API project. Set `ALLOWED_ORIGIN` to the V2 preview's exact origin (no path or trailing slash). For existing GitHub Pages this is `https://mrmlttens.github.io`.
4. Configure usage controls and a budget in the API project and request limits on the Worker before sharing the endpoint. CORS is not authentication; the crew code protects paid access and can be rotated. Do not disable access-code enforcement without replacing it with authentication.
5. Set `endpoint` in `analyst-config.json` to `https://YOUR-WORKER.workers.dev/analyze`. Keep `requiresAccessCode: true`.
6. Test with a cropped, non-sensitive bet screenshot. Verify leg extraction and payout math; confirm wrong code and oversized uploads fail.
7. Review V2 in a separate preview. Do not merge into main or change production Pages source until Trey requests release.

## Contract and limits
The browser POSTs JSON `{image: "data:image/png;base64,...", question: "..."}` with `X-Crew-Code`. The Worker returns `{analysis: "..."}` or `{error: "..."}`.
Images are held in browser memory and sent only after Analyze is pressed. This app does not persist images or results; OpenAI's provider retention terms still apply. `store:false` disables response storage, not all provider retention.
No current sports research feed is connected. The analyst must explicitly flag unverified news, form, and live odds and withhold a value recommendation when evidence is missing. It cannot publish bets or edit the shared board.
Screenshots may contain account information: visitors are prompted to crop it out.
Frontend supports JPG, PNG, WebP up to 8 MB, local preview, drag/drop, optional question, crew code, clear/retry, timeout and explicit setup/error states.
API calls are billed separately from ChatGPT. Credentials must live only in backend secrets.

Reference: https://developers.openai.com/api/docs/guides/images-vision

