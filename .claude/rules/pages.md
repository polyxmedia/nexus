---
paths:
  - "app/**/page.tsx"
  - "app/**/layout.tsx"
---

# Page Rules

@ARCHITECTURE.md

## Page Structure

Platform pages follow this pattern:

```tsx
"use client";

import PageContainer from "@/components/layout/page-container";

export default function MyPage() {
  return (
    <PageContainer title="Page Title">
      {/* Page content */}
    </PageContainer>
  );
}
```

## Public Pages

Pages without sidebar (`/`, `/landing`, `/research/*`, `/register`, `/login`) use:

```tsx
import PublicNav from "@/components/layout/public-nav";
import PublicFooter from "@/components/layout/public-footer";
```

## Conventions

- Dashboard uses widget-based layout (30+ widget types)
- Detail pages (`[id]/page.tsx`) fetch data client-side with useEffect
- Settings pages use key-value pattern from `settings` table
- Admin pages check for admin role and redirect if unauthorized
- All pages use dark theme by default
