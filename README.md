# shubhamlove.com

A single-page static portfolio hosted on GitHub Pages.

## Structure

- `index.html` — semantic page content and SEO metadata
- `css/site.css` — layout, typography, responsive design, and visual system
- `js/climate.js` — live N2O, air-quality, and climate-model interactions
- `js/main.js` — navigation, persistent research-index rail, latest-writing card, and the hidden surname easter egg
- `data/n2o.json` — cached NOAA Global Monitoring Laboratory N2O data
- `data/latest-post.json` — cached latest post from haevyre.com
- `scripts/update_data.py` — server-side data refresh used by GitHub Actions
- `.github/workflows/main.yml` — scheduled data refresh workflow

No framework or build step is required. GitHub Pages can serve the repository root directly.

## Interface notes

The portfolio intentionally avoids a large decorative SVG or chemistry modal. On desktop, a quiet fixed **Research index** rail tracks the active section and mirrors the live NOAA N₂O value while the Observatory is in view. On smaller screens the rail disappears and the normal navigation remains.

The only hidden easter egg is the surname in the hero: it looks like ordinary text, but clicking it draws a small heart.

## Live data

### Atmospheric N2O

The site does **not** call NOAA from visitors' browsers. GitHub Actions downloads NOAA's globally averaged marine-surface monthly N2O record and stores a compact local JSON copy. The workflow runs daily but only creates a commit when the source data actually changes.

Source: NOAA GML, Trends in Atmospheric Nitrous Oxide  
DOI: `10.15138/P8XG-AA10`

### Two-city atmosphere

Philadelphia and New Delhi surface air-quality values are requested directly from the Open-Meteo Air Quality API when the page loads. No key is required.

### Climate where you are

This feature only requests browser geolocation after a visitor clicks **Use my location**. Coordinates are sent directly from the browser to Open-Meteo's Climate API and are not stored by this site. The comparison uses the `EC_Earth3P_HR` model for annual mean temperature in 1991–2000 versus 2040–2049. Results are cached locally in the visitor's browser for 30 days.

It is an exploratory climate projection, not a weather forecast.

## Deploying

1. Replace the contents of the existing repository with these files.
2. Keep the existing `CNAME` file if GitHub Pages is already configured for `shubhamlove.com`.
3. Push to `main`.
4. In **Settings → Actions → General**, make sure workflows have permission to read and write repository contents if your repository defaults to read-only workflow permissions.
5. In **Settings → Pages**, continue serving from the branch/root configuration you already use.
6. The `Refresh portfolio data` action will run automatically when its workflow/script is first pushed, and can also be run manually from the Actions tab. This file intentionally uses `.github/workflows/main.yml`, the same path as the old `Refresh haevyre.com feed` workflow, so deploying the revamp replaces that legacy workflow instead of leaving two Actions behind.

## Local preview

From the repository root:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

Opening `index.html` directly from Finder is not recommended because browser security rules can block module imports and JSON fetches on `file://` URLs.
