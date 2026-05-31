# Project Architecture Overview

## 1. What This Project Is

This project is a badminton club management web app built with:

- `Vite`
- `React`
- `React Router`
- `Tailwind CSS`
- `Appwrite` for auth, database, storage, and realtime updates

The app supports:

- user sign-in / sign-up
- club management
- player management
- check-in flow
- match creation and live match status
- match history
- payment slip upload
- Thai / English UI translation

## 2. High-Level Architecture

The architecture is currently frontend-heavy:

- UI and page logic live in `src/pages` and `src/component`
- most business logic and backend access live in `src/utils/AuthContext.jsx`
- Appwrite acts as the backend service layer
- browser `localStorage` is used for some temporary match state in matchmaking

In practice, `AuthContext` is the main application service layer.

## 3. Main Folders

- `src/App.jsx`
  - app entry routing setup
- `src/pages/`
  - route-level screens
- `src/component/`
  - shared UI building blocks
- `src/utils/AuthContext.jsx`
  - auth state + data access + most business operations
- `src/utils/LanguageProvider.jsx`
  - translation provider
- `src/Appwrite.js`
  - Appwrite client setup and environment-based config
- `src/locales/en.json`
  - English strings
- `src/locales/th.json`
  - Thai strings

## 4. Runtime Flow

### App bootstrap

`src/main.jsx` renders `App`.

`src/App.jsx` wraps the app with:

- `LanguageProvider`
- `Router`
- `AuthProvider`
- `Toaster`

### Routing

Public routes:

- `/sign-in`
- `/sign-up`

Protected routes via `PrivateRoutes`:

- `/`
- `/setting`
- `/matchmaking/:id`
- `/history/:id`
- `/summary/:id`
- `/dashboard`
- `/dashboard/:id`

`PrivateRoutes` checks whether `useAuth().user` exists. If not, it redirects to `/sign-in`.

## 5. Core Service Layer: `AuthContext`

`src/utils/AuthContext.jsx` is the central integration point. It manages:

- current user session
- Appwrite auth calls
- CRUD for clubs
- CRUD for players
- check-ins
- match lifecycle
- payment slip upload
- club payment QR upload
- some shared loading state

This file is the closest thing the app has to a backend service abstraction.

### Auth methods

- `loginUser`
- `registerUser`
- `logoutUser`
- `checkUserStatus`
- `fetchUser`
- `updateUserName`

### Club methods

- `createClubs`
- `getClubData`
- `getClubById`
- `updateClub`
- `deleteClub`

There is a simple in-memory club cache using `clubsCacheRef`.

### Player methods

- `addPlayer`
- `getPlayers`
- `updatedPlayers`
- `deletePlayer`
- `incrementGamePlayed`

### Check-in methods

- `createCheckIn`
- `getCheckIn`
- `clearCheckIns`

### Match methods

- `createMatch`
- `getMatches`
- `getMatchesByClubId`
- `getDashboardMatchesByClubId`
- `subscribeToDashboardMatches`
- `queueDashboardMatch`
- `startDashboardMatch`
- `endDashboardMatch`
- `clearMatchesAndResetPlayers`

### Storage / payment methods

- `uploadSlipToAppwrite`
- `getUserFileId`
- `getUploadedSlipsByUser`
- `getPreviewUrlsFromFileIds`
- `getPreviewUrlsFromDocs`
- `uploadPaymentQRToAppwrite`
- `getAvailablePaymentQrFiles`

## 6. Appwrite Integration

`src/Appwrite.js` initializes:

- `Client`
- `Account`
- `Databases`
- `Storage`

It uses environment variables:

- `VITE_APPWRITE_PROJECT_ID`
- `VITE_APPWRITE_ENDPOINT`
- `VITE_APPWRITE_DATABASE_ID`
- `VITE_APPWRITE_PLAYERS_COLLECTION_ID`
- `VITE_APPWRITE_CLUBS_COLLECTION_ID`
- `VITE_APPWRITE_USERS_COLLECTION_ID`
- `VITE_APPWRITE_CHECKIN_COLLECTION_ID`
- `VITE_APPWRITE_MATCHES_COLLECTION_ID`
- `VITE_APPWRITE_SLIP_STORAGE_ID`
- `VITE_APPWRITE_MONEYSLIP_COLLECTION_ID`

It also customizes the Appwrite realtime heartbeat in the browser.

## 7. Domain Model

The project appears to revolve around these main entities.

### User

Source: Appwrite Account

Important fields used in UI:

- `name`
- `labels`

`labels` is used to determine whether the user is an admin.

### Club

Stored in the clubs collection.

Mapped fields used by the UI:

- `id`
- `clubName`
- `startPrice`
- `pricePerGame`
- `playingDay`
- `startTime`
- `endTime`
- `paymentBank`
- `paymentAccountName`
- `paymentAccountNumber`
- `paymentQrFileId`
- payment QR URLs derived from storage

### Player

Stored in the players collection.

Fields used:

- `id`
- `name`
- `skillLevel`
- `club` as an array of club IDs
- `gamesPlayed`

### Check-In

Stored in the check-in collection.

Fields used:

- `name`
- `clubId`
- `checkInTime`
- `createAt`

### Match

Stored in the matches collection.

Fields used:

- `id`
- `players` as an array of player names
- `court`
- `clubId`
- `startTime`
- `status`
- `totalTime`
- `matchScore`
- `winningTeam`

Status values currently used:

- `WAITING`
- `PLAYING`
- `FINISHED`

### Money Slip

Stored partly in Appwrite Storage and partly in the money slip metadata collection.

Fields used:

- `user`
- `club`
- `fileId`
- `timestamp`

## 8. Main Screens and Responsibilities

### `Home.jsx`

Home is the main dashboard after login.

Admin mode:

- manage clubs
- open matchmaking
- open live dashboard
- see check-ins
- manage players

User mode:

- check into a club
- upload payment slip
- view club payment details / QR

### `CourtPlayer.jsx`

This is the matchmaking page for a club.

Responsibilities:

- load players for a club
- generate balanced match suggestions by skill
- assign players into matches
- persist temporary match state in `localStorage`
- sync local match state with Appwrite dashboard matches
- queue / start / end dashboard matches

This is one of the most important files for future automation.

### `Dashboard.jsx`

This is the live match status screen for a club.

Responsibilities:

- load clubs
- choose active club
- fetch today’s matches for that club
- subscribe to realtime match changes from Appwrite
- render live status table via `DashboardMatchesTable`

This is the most realtime-oriented page in the project.

### `MatchHistory.jsx`

Shows historical finished matches for a club.

Responsibilities:

- fetch club info
- fetch all club matches
- derive summary stats
- render completed match history

### `Summary.jsx`

Shows payment summary per player for a club.

Responsibilities:

- load club pricing
- load players in the club
- calculate total owed from `startPrice + gamesPlayed * pricePerGame`
- mark players as paid in local UI state
- clear all matches and reset player game counts

### `Setting.jsx`

Likely manages editable settings such as clubs, payment data, and profile-related actions.

## 9. State Management

This project uses several layers of state:

- React local state in each page/component
- global auth/data functions through `AuthContext`
- `localStorage` for temporary matchmaking state
- Appwrite as persistent backend state
- Appwrite realtime subscription for live dashboard updates

Important note:

- not all business state is centralized
- some match state lives locally in browser storage before or alongside database state

That matters for any bot integration, because a LINE bot cannot read browser `localStorage`.

## 10. Realtime Behavior

The live dashboard depends on Appwrite realtime:

- `Dashboard.jsx` calls `subscribeToDashboardMatches`
- the app subscribes to match collection document events
- UI updates when match documents are created, updated, or deleted

This is a strong integration point for a future LINE bot because the bot could:

- create matches
- update match status
- mark matches as finished

and the dashboard UI would update automatically.

## 11. Translation Layer

Translations are managed by:

- `src/utils/LanguageProvider.jsx`
- `src/locales/en.json`
- `src/locales/th.json`

UI text should use `t(...)`.

If a LINE bot is added, it can likely reuse the same translation keys and message intent labels, but the bot response layer would need its own formatter.

## 12. Current Strengths

- backend already exists through Appwrite
- domain model is simple and practical
- live dashboard already supports realtime updates
- club / player / match / check-in flows are already implemented
- there is already bilingual UI support

## 13. Current Architectural Constraints

These are the main things to keep in mind before adding a LINE bot.

### Frontend and service logic are tightly coupled

Most business logic is inside `AuthContext.jsx`, which is a React context file. That is convenient for the web app, but not ideal for reuse from a bot server.

### Some important state is browser-only

`CourtPlayer.jsx` stores temporary match state in `localStorage`.

A LINE bot or server process cannot access that state unless it is moved into Appwrite or another backend store.

### Admin permissions are lightweight

Admin access is determined from `user.labels`. That may be enough for UI gating, but bot actions may need stronger validation rules.

### Some naming is inconsistent

Examples:

- `updatedPlayers` should likely be `updatePlayer`
- `createMatch` currently toasts `"Match End"` while creating a match
- some flows are more UI-oriented than service-oriented

These are not blockers, but they suggest the service layer could be cleaned up before expanding integrations.

## 14. Best Integration Points for a LINE Bot

If you want to add a LINE bot, these are the best entry points conceptually:

### Good candidates for bot commands

- list clubs
- show today’s matches for a club
- show live dashboard status
- check in to a club
- queue a match
- start a match
- finish a match
- show payment QR / payment details
- upload or confirm payment slip flow

### Best existing backend operations to reuse

The bot should ideally reuse the same Appwrite data model behind:

- `getClubData`
- `getClubById`
- `getPlayers`
- `createCheckIn`
- `getDashboardMatchesByClubId`
- `queueDashboardMatch`
- `startDashboardMatch`
- `endDashboardMatch`

### Likely required refactor before bot integration

The cleanest next step would be to extract domain/service logic out of `AuthContext.jsx` into reusable modules such as:

- `services/clubs`
- `services/players`
- `services/checkins`
- `services/matches`
- `services/payments`

Then:

- React pages can call those services
- a LINE bot webhook server can call the same services

## 15. Recommended Future Architecture for LINE Bot Support

A good target architecture would be:

1. React app remains the frontend UI.
2. Appwrite remains the system of record.
3. Shared service modules contain business logic.
4. A separate LINE bot webhook server receives LINE events.
5. The LINE bot server calls shared services or Appwrite directly.
6. Match updates written by the bot automatically appear in the web dashboard through realtime subscriptions.

That would keep the bot and the web app aligned on the same data source.

## 16. Short Summary

This app is a React frontend backed by Appwrite, with most logic concentrated in `AuthContext.jsx`. The most important business entities are clubs, players, check-ins, matches, and payment slips. The live dashboard already uses realtime Appwrite updates, which makes the project a strong candidate for LINE bot integration, but some logic should be extracted from React-specific code and some browser-only state should be moved out of `localStorage` first.
