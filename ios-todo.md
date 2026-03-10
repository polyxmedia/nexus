# NEXUS iOS / Mac App Store — Submission Roadmap

## Current State
- Capacitor 8.2 installed with iOS project scaffolded
- Server-mode config pointing at localhost:3000 (swap to prod URL before submission)
- Safe area insets applied to root layout
- iOS deployment target: 15.0
- App ID: `com.nexus.intel`
- No native plugins beyond core. No privacy manifest. No offline handling.

---

## PHASE 1: Pass Guideline 4.2 (Minimum Functionality)

Apple rejects apps that are just a website in a WebView. Need native features to differentiate.

### 1.1 Push Notifications
- [ ] Install `@capacitor/push-notifications`
- [ ] Register for push on app launch
- [ ] Send device token to backend (new API route `/api/push/register`)
- [ ] Store device tokens in a new `push_tokens` table
- [ ] Create APNs authentication key in Apple Developer portal
- [ ] Wire existing alert engine (`lib/alerts/engine.ts`) to send push via APNs
- [ ] Handle notification tap to deep-link into relevant page
- [ ] Add `NSUserNotificationsUsageDescription` to Info.plist
- [ ] Support app badge count for unread alerts

### 1.2 Biometric Authentication
- [ ] Install `@capacitor/biometrics` (or community plugin)
- [ ] After first login, prompt user to enable Face ID / Touch ID
- [ ] Store auth token in iOS Keychain via `@capacitor/preferences` or native Keychain plugin
- [ ] On app resume, offer biometric unlock instead of full login
- [ ] Add `NSFaceIDUsageDescription` to Info.plist

### 1.3 Haptic Feedback
- [ ] Install `@capacitor/haptics`
- [ ] Add light haptic on signal convergence alerts
- [ ] Add medium haptic on prediction submission
- [ ] Add heavy haptic on trading order confirmation
- [ ] Create a `useHaptic()` hook that no-ops on web, fires on native

### 1.4 Native Splash Screen
- [ ] Install `@capacitor/splash-screen`
- [ ] Design NEXUS splash screen (dark bg, logo, no spinner)
- [ ] Add splash assets to `ios/App/App/Assets.xcassets`
- [ ] Configure auto-hide after app loads

### 1.5 Offline Handling
- [ ] Detect connectivity via `@capacitor/network`
- [ ] Show a native-feeling "No connection" screen (not a white page)
- [ ] Cache last dashboard state in localStorage for offline viewing
- [ ] Auto-reconnect and refresh when connectivity returns

### 1.6 Keyboard Handling (Chat)
- [ ] Install `@capacitor/keyboard`
- [ ] Handle keyboard show/hide events in chat input (`components/chat/ChatInput.tsx`)
- [ ] Scroll chat to bottom when keyboard appears
- [ ] Prevent viewport resize jank on keyboard open

### 1.7 Native Platform Detection
- [ ] Create `lib/platform.ts` utility using `Capacitor.isNativePlatform()`
- [ ] Use it to conditionally show/hide web-only features (e.g. Stripe checkout)
- [ ] Adjust navigation behavior for native (no browser back button)

### 1.8 Status Bar
- [ ] Install `@capacitor/status-bar`
- [ ] Set dark content style to match navy theme
- [ ] Hide/show status bar appropriately on map fullscreen (war room)

---

## PHASE 2: Pass Guideline 3.1.1 (In-App Purchases)

Apple requires StoreKit for digital subscriptions sold in-app. Stripe alone will be rejected.

### 2.1 StoreKit Subscriptions
- [ ] Choose integration: **RevenueCat** (recommended, handles receipt validation) or raw StoreKit 2
- [ ] If RevenueCat: install `@revenuecat/purchases-capacitor`
- [ ] Create matching subscription products in App Store Connect:
  - Analyst tier (monthly + annual)
  - Operator tier (monthly + annual)
  - Institution tier (monthly + annual)
- [ ] Map StoreKit product IDs to existing Stripe tier IDs
- [ ] Build subscription purchase UI for native (replace Stripe checkout)
- [ ] Server-side receipt validation via App Store Server API v2
- [ ] Sync subscription status between StoreKit and your DB
- [ ] Handle subscription lifecycle: renewal, cancellation, grace period, billing retry

### 2.2 US External Payment Option (Post-Epic v. Apple, May 2025)
- [ ] For US App Store users only, you CAN link to Stripe web checkout
- [ ] Apple no longer blocks external payment links in the US storefront
- [ ] Still must offer StoreKit as an option globally
- [ ] Consider whether the 30% cut is worth avoiding the complexity

### 2.3 Restore Purchases
- [ ] Add "Restore Purchases" button in settings (Apple requires this)
- [ ] Handle restore flow for users who reinstall or switch devices

### 2.4 Subscription Extras
- [ ] Support free trial periods via StoreKit (introductory offers)
- [ ] Support offer codes for promotions
- [ ] Handle subscription upgrade/downgrade between tiers
- [ ] StoreKit sandbox testing before submission (test all purchase flows)

### 2.5 EULA / Terms of Service
- [ ] Apple requires a EULA link for apps with subscriptions
- [ ] Add Terms of Service URL to App Store Connect
- [ ] Add Privacy Policy URL to App Store Connect (already have one?)

---

## PHASE 3: Privacy & Compliance

### 3.1 Privacy Manifest
- [ ] Create `PrivacyInfo.xcprivacy` in `ios/App/App/`
- [ ] Declare Required Reason APIs used (UserDefaults, file timestamps, etc.)
- [ ] Declare data collection types:
  - Account info (username, email)
  - Usage data (analytics)
  - Diagnostics (Sentry crash reports)
- [ ] Declare tracking domains (likely none if no ad SDKs)
- [ ] Ensure Sentry SDK is v8.25.0+ (auto-includes its own privacy manifest)

### 3.2 App Tracking Transparency
- [ ] NOT required unless you add advertising SDKs
- [ ] Sentry does not use IDFA and does not trigger ATT
- [ ] If you add any ad/attribution SDK later, revisit this

### 3.3 Export Compliance
- [ ] Standard HTTPS/TLS exemption applies (no custom encryption)
- [ ] In App Store Connect, answer "Yes" to encryption usage, then "Yes" to exemption
- [ ] No BIS self-classification report needed if you provide documentation to Apple

### 3.4 Sign in with Apple
- [ ] NOT required — Nexus uses its own credentials system, not third-party OAuth
- [ ] If you ever add Google/Facebook login, Sign in with Apple becomes mandatory
- [ ] Could still add it as a nice-to-have for frictionless onboarding

### 3.5 App Privacy "Nutrition Labels" (App Store Connect)
- [ ] Separate from PrivacyInfo.xcprivacy — this is what users see on your App Store listing
- [ ] Declare all data types collected: name, email, usage data, diagnostics
- [ ] Declare data linked to identity vs not linked
- [ ] Declare data used for tracking (likely none)
- [ ] Must be accurate or Apple will reject updates

---

## PHASE 4: App Store Connect Setup

### 4.1 Content Rating
- [ ] Complete the updated age rating questionnaire in App Store Connect
- [ ] Geopolitical/military intelligence content will likely land at **16+ or 17+**
- [ ] ACLED conflict data and war room imagery may trigger violence content flags
- [ ] Trading features add financial content considerations
- [ ] Deadline for updated questionnaire: January 31, 2026

### 4.2 App Metadata
- [ ] App name: "NEXUS Intelligence"
- [ ] Subtitle (30 chars): "Geopolitical Signal Platform"
- [ ] Keywords (100 chars): geopolitical, intelligence, signals, trading, OSINT, predictions, analysis
- [ ] Category: Primary — Finance or News. Secondary — Business
- [ ] Screenshots: 6.7" (iPhone 15 Pro Max) + 6.5" (older) + iPad Pro 12.9"
- [ ] App preview video (optional but helps approval — shows it's not just a website)
- [ ] Description (4000 chars) — what the app does, who it's for
- [ ] "What's New" text for each version update
- [ ] Support URL (required)

### 4.3 App Icon & Assets
- [ ] Design 1024x1024 app icon (no alpha/transparency)
- [ ] Generate all required sizes via Xcode asset catalog
- [ ] Splash screen images for all device sizes

### 4.4 Apple Developer Account
- [ ] Enroll in Apple Developer Program ($99/year)
- [ ] Set up certificates and provisioning profiles
- [ ] Configure App ID with capabilities: Push Notifications, In-App Purchase
- [ ] If distributing to Mac App Store via Catalyst: enable Mac Catalyst target

### 4.5 App Review Preparation
- [ ] Create a demo account for Apple reviewers (required — they need to test the app)
- [ ] Write review notes explaining what the app does and how to use it
- [ ] If any features require special setup (API keys, trading accounts), explain in review notes
- [ ] Prepare for rejection — first submission almost always gets feedback, plan for 2-3 rounds

### 4.6 TestFlight Beta Testing
- [ ] Upload first build to TestFlight before App Store submission
- [ ] Invite internal testers (up to 25 without review)
- [ ] Test all critical flows: login, dashboard, chat, signals, predictions, trading
- [ ] Test on multiple devices: iPhone SE (small), iPhone 15 Pro (standard), iPad
- [ ] Test on minimum iOS version (15.0) — use simulator if no physical device
- [ ] Fix any crash-free rate issues (Apple looks at stability metrics)

### 4.7 Version & Build Numbering
- [ ] Set marketing version (e.g. 1.0.0) in Xcode
- [ ] Set build number (auto-increment for each TestFlight upload)
- [ ] Keep version in sync with package.json if desired

---

## PHASE 5: Production Config

### 5.1 Capacitor Config for Production
- [ ] In `capacitor.config.ts`, change `server.url` to production URL (e.g. `https://nexushq.xyz`)
- [ ] Remove `cleartext: true` (only needed for HTTP localhost)
- [ ] Consider whether to bundle static assets or keep server mode
  - Server mode = always up to date, but requires internet
  - Static export = works offline but needs app update for changes

### 5.2 Universal Links / Deep Linking
- [ ] Configure apple-app-site-association file on your domain
- [ ] Map routes: `/signals/:id`, `/predictions/:id`, `/chat/:sessionId`
- [ ] Handle incoming links in AppDelegate

### 5.3 Native Share
- [ ] Install `@capacitor/share`
- [ ] Add share buttons for signals, predictions, research pages
- [ ] Generate share-friendly URLs with Open Graph metadata (already exists)

### 5.4 iPad Support
- [ ] Test responsive layout on iPad (sidebar may need to adapt)
- [ ] Leaflet maps should work but test pinch-to-zoom
- [ ] Chat input should handle iPad keyboard (docked vs floating)
- [ ] Consider split-view / slide-over support
- [ ] iPad screenshots required for App Store if you support iPad

### 5.5 Performance
- [ ] Profile WebView memory usage on older devices (iPhone SE, iPad Air)
- [ ] Ensure Leaflet map (war room) doesn't cause memory warnings
- [ ] Test SSE chat streaming stability on native WebView
- [ ] Test long sessions — WebView memory leaks can crash the app

---

## PHASE 6: Mac App Store (Bonus)

Capacitor iOS apps can run on Mac via Mac Catalyst with minimal extra work.

### 6.1 Enable Mac Catalyst
- [ ] In Xcode, check "Mac (Designed for iPad)" or enable full Mac Catalyst
- [ ] Test window resizing — sidebar layout should adapt
- [ ] Ensure Leaflet maps work with trackpad/mouse
- [ ] Test keyboard shortcuts and hover states

### 6.2 Mac-Specific Considerations
- [ ] Menu bar integration (optional)
- [ ] Window title shows current page
- [ ] Touch Bar support (if targeting older Macs, optional)
- [ ] Ensure all interactions work without touch (hover, right-click)

---

## Estimated Plugin Install List

```bash
npm install @capacitor/push-notifications @capacitor/haptics @capacitor/splash-screen @capacitor/network @capacitor/share @capacitor/preferences @capacitor/keyboard @capacitor/status-bar
# For biometrics (community plugin):
npm install @capgo/capacitor-native-biometric
# For IAP (pick one):
npm install @revenuecat/purchases-capacitor
# Then sync:
npx cap sync ios
```

---

## Rejection Risk Summary

| Check                          | Risk   | Status       |
|-------------------------------|--------|--------------|
| StoreKit subscriptions (3.1.1) | HIGH   | Not started  |
| Minimum functionality (4.2)    | HIGH   | Not started  |
| EULA / Terms / Privacy Policy  | HIGH   | Not started  |
| Demo account for reviewers     | HIGH   | Not started  |
| Privacy manifest               | MEDIUM | Not started  |
| Privacy nutrition labels       | MEDIUM | Not started  |
| Content rating questionnaire   | MEDIUM | Not started  |
| TestFlight beta testing        | MEDIUM | Not started  |
| iPad layout testing            | MEDIUM | Not started  |
| Sign in with Apple             | LOW    | Not required |
| App Tracking Transparency      | LOW    | Not required |
| Export compliance               | LOW    | Exemption applies |
| Guideline 4.7 (HTML5 apps)     | LOW    | Not applicable |

---

## Quick Reference: Key Files

| File | Purpose |
|------|---------|
| `capacitor.config.ts` | Capacitor settings (server URL, app ID, iOS config) |
| `ios/App/App/Info.plist` | iOS permissions and app metadata |
| `ios/App/Podfile` | CocoaPods dependencies (iOS 15.0 target) |
| `ios/App/App/AppDelegate.swift` | Native iOS entry point |
| `ios/App/App/Assets.xcassets` | App icon, splash screen, image assets |
| `app/layout.tsx` | Root layout (safe area insets, viewport-fit) |
| `lib/auth/auth.ts` | Auth config (credentials only, no OAuth) |
| `lib/alerts/engine.ts` | Alert engine (wire to push notifications) |
| `package.json` | Scripts: `npm run ios`, `npm run ios:sync` |
