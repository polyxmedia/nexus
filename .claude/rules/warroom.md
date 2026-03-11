---
paths:
  - "app/warroom/**/*.tsx"
  - "components/warroom/**/*.tsx"
  - "app/api/warroom/**/*.ts"
  - "lib/warroom/**/*.ts"
  - "lib/vip-aircraft/**/*.ts"
---

# War Room Rules

@SYSTEMS.md @COMPONENTS.md

## Map Stack

- Leaflet + react-leaflet
- CARTO dark tiles (dark theme)
- Dynamic imports for Leaflet components (SSR incompatible)

## Data Sources

- **OpenSky Network**: Aircraft tracking (20s polling interval)
- **GDELT**: OSINT event feeds (5min polling interval)
- **VIP Aircraft DB**: 15,000+ aircraft with owner/operator metadata

## Polling Pattern

```tsx
const intervalRef = useRef<NodeJS.Timeout>();

useEffect(() => {
  fetchData(); // immediate
  intervalRef.current = setInterval(fetchData, POLL_INTERVAL);
  return () => clearInterval(intervalRef.current);
}, []);
```

## Conventions

- Map layers toggled independently
- Markers clustered at zoom levels < 8
- Aircraft markers show heading rotation
- OSINT events color-coded by type/severity
- Geofence alerts trigger when tracked aircraft enter zones
