# MatConnect for WordPress

Connect your MatConnect account to your WordPress site to display live data — class schedule, membership pricing, lead capture form, testimonials, and FAQ.

## Requirements

- WordPress 6.0+
- PHP 7.4+
- A running MatConnect instance (your URL + an API key)

## Installation

1. Download the `matconnect-for-wordpress` folder from `wordpress-plugin/`.
2. Copy it into `wp-content/plugins/`.
3. In WordPress admin, go to **Plugins → Installed Plugins** and activate **MatConnect for WordPress**.

## Configuration

Go to **Settings → MatConnect** and fill in:

| Field | Description |
|---|---|
| MatConnect URL | Your MatConnect instance URL (e.g. `https://yoursite.matconnect.app`) |
| API Key | Generated in MatConnect → Settings → Integrations |
| Accent Color | Used for headings, buttons, and highlights in all blocks |
| Schedule cache | How long (seconds) to cache the schedule (default: 300 = 5 min) |
| Data cache | How long to cache plans/FAQ/testimonials (default: 3600 = 1 hr) |

Click **Test Connection** to verify the URL and key are working. You should see your gym name displayed.

## Generating an API Key

1. In MatConnect, go to **Admin → Settings**.
2. Scroll to **Integrations — API Keys**.
3. Enter a label (e.g. "My WordPress Site") and click **Generate Key**.
4. Copy the key immediately — it is only shown once.
5. Paste it into the **API Key** field in WordPress Settings → MatConnect.

## Blocks

Add any of these blocks via the Gutenberg block inserter (search for "MatConnect"):

### Schedule
Displays the next N days of classes, grouped by day.

**Sidebar options:**
- **Days ahead** (1–14, default 7)

### Pricing
Displays all active membership plans with price, billing interval, and description.

**Sidebar options:**
- **Show "Get started" button** — toggle on/off
- **Button label** — custom CTA text (default: "Get started")

### Lead Form
Captures visitor name, email, phone, and interest. Submitted leads appear in MatConnect → Leads.

**Sidebar options:**
- **Success message** — shown after a successful submission

### Testimonials
Displays member testimonials configured in MatConnect → Settings → Website → Testimonials.

**Sidebar options:**
- **Max testimonials** (0 = show all)

### FAQ
Displays the FAQ accordion configured in MatConnect → Settings → Website → FAQ. Each item is expandable/collapsible.

## Shortcodes

For use in classic editor or page builder text widgets:

```
[matconnect_schedule days_ahead="7"]
[matconnect_pricing show_cta="true" cta_label="Get started"]
[matconnect_lead_form success_message="We'll be in touch!"]
[matconnect_testimonials max="6"]
[matconnect_faq]
```

## Building the Block Editor Scripts

The blocks use React for their editor UI. To build:

```bash
cd wordpress-plugin/matconnect-for-wordpress
npm install
npm run build
```

For development with live reload:

```bash
npm run start
```

The built files are committed to the repo so gym owners who download the plugin don't need Node.js.

## Caching

All GET endpoints are cached using WordPress transients:
- Schedule: 5 minutes (configurable)
- Plans, FAQ, Testimonials: 1 hour (configurable)
- Lead form: never cached

To force a refresh, click **Clear Cache** in Settings → MatConnect.

## Troubleshooting

**"MatConnect: Please configure your URL and API key"**
→ Go to Settings → MatConnect and fill in both fields. Click Test Connection.

**Test Connection fails**
→ Check that the URL has no trailing slash and uses `https://`. Verify the API key is correct (it can't be retrieved after creation — generate a new one if unsure).

**Schedule shows old data**
→ Click Clear Cache in Settings → MatConnect.

**Lead form submissions don't appear in MatConnect**
→ The lead endpoint is public (no API key required). Check that the MatConnect URL is correct in settings. Test with your browser's network tab — the form should POST to `<your-url>/api/v1/leads`.

**Blocks show placeholder in editor, nothing on the page**
→ The block scripts need to be built. Run `npm install && npm run build` in `wordpress-plugin/matconnect-for-wordpress/`.
