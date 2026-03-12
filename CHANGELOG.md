## 0.0.4 (2026-03-12)

### 🚀 Features

- **a11y:** add keyboard navigation for widget repositioning and resizing
- **a11y:** add focus trap to add-widget modal and fix folder-picker overlay role
- **domain:** create MosaicService for centralized widget state and storage
- **grid:** reduce cell height to 140px and enforce 6 minimum rows
- **grid-engine:** add minRow to MosaicGridOptions port and adapter
- **service:** set wider default sizes for new widgets on 12-column grid
- **service:** default bookmark widget height to 2 rows
- **ui:** add loading spinner and error recovery state
- **ui:** surface storage save errors to the user via dismissable banner

### 🩹 Fixes

- **a11y:** announce loading state to screen readers via role=status
- **bookmark:** hide broken favicon instead of setting invalid fallback URL
- **bookmark:** validate URL protocol before calling window.open
- **grid:** cancel pending refresh timer on component destroy
- **manifest:** allow Google CDN for favicons in extension CSP
- **service:** update default placeholder widget sizes for 12-column grid
- **storage:** guard JSON.parse against corrupted localStorage data

### 🔥 Performance

- **gridstack:** throttle layout sync and add updateWidget method to port
- **gridstack:** cache widget DOM elements in a Map to avoid O(n) lookups
- **images:** use NgOptimizedImage for logo and favicons

### ❤️ Thank You

- Alexandre