<!-- ANIMATED HEADER -->
<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,12,24&height=200&section=header&text=Memoraa&fontSize=70&fontAlignY=35&desc=WhatsApp-Style%20Memory%20Journal&descAlignY=55&animation=twinkling" width="100%"/>
</div>

<!-- TYPING ANIMATION -->
<div align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=28&duration=3000&pause=500&color=6A5ACD&center=true&vCenter=true&width=700&lines=📝+Your+Private+Memory+Journal;🔒+End-to-End+Encrypted;📸+Photos+%26+Videos;🎙️+Voice+Notes;👥+Collaborative+Albums" alt="Typing SVG" />
</div>

<!-- BADGES -->
<div align="center">
  <img src="https://img.shields.io/badge/Next.js-16.3.1-black?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19.2.8-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-5.16.0-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.IO-4.7-010101?style=for-the-badge&logo=socket.io&logoColor=white" />
  <img src="https://img.shields.io/badge/NextAuth-4.24-000000?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge&logo=opensourceinitiative&logoColor=white" />
</div>

<br>

<div align="center">
  <img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%"/>
</div>

---

## 📝 Overview

**Memoraa** is a private, encrypted digital scrapbook that works like WhatsApp. Send text notes, photos, videos, and voice messages – but organized as memories inside thematic albums. All content is **end-to-end encrypted**, stored securely, and accessible across devices.

See [DEPLOYMENT.md](DEPLOYMENT.md) for production hosting, database migrations, persistent uploads, Socket.IO, and HTTPS setup.

### Why Memoraa?

- 🔒 **Privacy-first** – End-to-end encryption ensures only you (and your collaborators) can read your memories.
- 🗂️ **Organized** – Albums act like WhatsApp chats, making navigation intuitive.
- 📸 **Rich Media** – Upload photos, videos, voice notes, and more.
- 👥 **Collaborative** – Share albums with friends and family.
- 📊 **Insights** – Track mood, location, tags, and statistics.

---

## ✨ Key Features

<div align="center">
      <td width="33%" valign="top">
        <h3>📸 Media</h3>
        <ul align="left">
          <li>Photo & video upload</li>
          <li>Image editing (crop/filter)</li>
          <li>Video trimming</li>
          <li>Auto-compression</li>
        </ul>
      </td>
      <td width="33%" valign="top">
        <h3>🔒 Security</h3>
        <ul align="left">
          <li>End-to-end encryption</li>
          <li>Album passcode locking</li>
          <li>Biometric authentication</li>
          <li>Local-only mode</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td width="33%" valign="top">
        <h3>👥 Collaboration</h3>
        <ul align="left">
          <li>Shared albums</li>
          <li>Invite users (email/link)</li>
          <li>Permission levels</li>
          <li>Real-time updates</li>
        </ul>
      </td>
      <td width="33%" valign="top">
        <h3>📊 Insights</h3>
        <ul align="left">
          <li>Mood tracking</li>
          <li>Statistics & heatmap</li>
          <li>Word cloud</li>
          <li>Daily reminders</li>
        </ul>
      </td>
      <td width="33%" valign="top">
        <h3>🗂️ Organization</h3>
        <ul align="left">
          <li>Album management</li>
          <li>Timeline view</li>
          <li>Full-text search</li>
          <li>Tags (manual & AI)</li>
        </ul>
      </td>
    </tr>
  </table>
</div>

---

### ✅ Completed Features (23)

<details>
<summary><b>Click to expand completed features</b></summary>

| # | Feature | Status | Details |
| :--- | :--- | :--- | :--- |
| 1 | **Photo Upload** | ✅ | Sharp compression, thumbnails, captions, optional quality preservation |
| 2 | **Video Upload** | ✅ | FFmpeg compression, thumbnail extraction, duration tracking, inline playback |
| 3 | **Voice Messages** | ✅ | MediaRecorder API, MP3 compression, waveform visualization |
| 4 | **Search** | ✅ | Full-text search, filters (type, mood, location), advanced operators, search history |
| 6 | **Share Memories** | ✅ | Public share tokens, optional expiry, password protection, view counting |
| 7 | **Memory Editing** | ✅ | Text editing, deletion, timestamp tracking |
| 8 | **Album Collaboration** | ✅ | Email invites, permission levels (view/add/edit/admin), accept/reject flow |
| 9 | **Favorite/Pin** | ✅ | Heart icon, pin to top, pinned section, favorites view |
| 10 | **Archive** | ✅ | Album archiving, memory archiving, restore functionality |
| 11 | **Mood Tracking** | ✅ | Mood selection, history chart, statistics, mood-based filtering |
| 12 | **Location Tagging** | ✅ | Geolocation support, map visualization, location-based grouping |
| 13 | **Real-time Updates** | ✅ | Socket.IO: typing indicators, mention broadcasts, reaction syncing |
| 14 | **Notifications** | ✅ | Mention alerts, in-app notifications, unread counts |
| 15 | **Passcode Lock** | ✅ | PIN setup, timeout option, unlock modal |
| 16 | **Mentions** | ✅ | Autocomplete, notification creation, highlighted rendering |
| 17 | **Message Reactions** | ✅ | Emoji reactions, reaction counts, real-time syncing |
| 18 | **Typing Indicators** | ✅ | Status banner, auto-clear, multi-user aggregation |
| 19 | **Profile Settings** | ✅ | Edit profile, name, username, email change |
| 20 | **Avatar Upload** | ✅ | Avatar upload and display |
| 21 | **Bio** | ✅ | Bio/about section in profile |
| 22 | **Daily Reminders** | ✅ | Reminder time setting, email/in-app notifications, cron scheduling |
| 23 | **Mobile Responsive** | ✅ | Responsive design, WhatsApp Web 3-panel layout |

</details>

---

### ⏳ Planned/Not Started Features (10)

<details>
<summary><b>Click to expand planned features</b></summary>

| # | Feature | Priority | Notes |
| :--- | :--- | :--- | :--- |
| 1 | **Encryption UI** | High | Lock icon, fingerprint display, algorithm badge |
| 2 | **AI Auto-tagging** | Medium | Face/object detection, confidence scoring, manual review |
| 3 | **Statistics & Heatmap** | High | Memory count by date, activity heatmap, mood distribution |
| 4 | **Export & Backup** | High | ZIP export, JSON export, PDF export, scheduled backups, cloud backup |
| 5 | **Biometric Security** | Medium | WebAuthn API integration, platform detection, fallback to passcode |
| 6 | **Dark Theme** | Medium | Dark mode toggle, system theme detection, OLED optimization |
| 7 | **Emoji Picker** | Medium | Emoji selector component, emoji autocomplete |
| 8 | **Rich Text** | Medium | Text formatting toolbar, markdown support |
| 9 | **Memory Timeline** | Medium | Calendar view, chronological timeline, date-based grouping |
| 10 | **Word Cloud** | Medium | Word frequency analysis, visual cloud display |

</details>

---

### Implementation Priority

| Priority | Features | Timeline |
| :--- | :--- | :--- |
| 🔴 **High Priority** | Encryption UI, Statistics & Heatmap, Export & Backup | Ready to implement |
| 🟡 **Medium Priority** | Biometric Security, Dark Theme, Rich Text, Emoji Picker, Memory Timeline, Word Cloud | Needs planning |
| 🟢 **Low Priority** | Local-Only Mode, AI Auto-tagging, Online Status | Nice-to-have |

---

## 🗺️ Feature Roadmap

### Status Legend
- ✅ **Completed & Tested**
- 🔄 **In Progress**
- ⏳ **Planned / Not Started**
- 🔴 **Blocked**

---

### Phase 1: Foundation (✅ Complete)

#### Authentication & User Management
- ✅ User registration with email/password
- ✅ User login with NextAuth.js
- ✅ Session management (JWT)
- ✅ Password hashing (bcryptjs)
- ✅ Unique encryption key per user

#### Database & Data Model
- ✅ Prisma ORM setup
- ✅ MySQL schema with 16 models
- ✅ Relationships (Users → Albums → Memories)
- ✅ Tag system (auto & manual)
- ✅ Shared album support with invitations and permissions
- ✅ Real-time data structures (Reactions, Mentions)
- ✅ Backup and archive systems

#### Core Utilities
- ✅ AES-256-GCM encryption/decryption
- ✅ Local file storage (upload/download)
- ✅ Image processing (sharp)
- ✅ Job queue setup (BullMQ)
- ✅ TypeScript types

#### UI Foundation
- ✅ Tailwind CSS configuration
- ✅ WhatsApp Web 3-panel layout
- ✅ Icon navigation (Lucide React)
- ✅ Responsive design framework

---

### Phase 2: Core Features (🔄 In Progress)

<details>
<summary><b>Feature 1: Text Notes</b> ✅</summary>

- ✅ Create text memory
- ✅ Encrypt content before storage
- ✅ Display in MemoryStream
- ✅ Timestamp tracking
- ✅ Edit text memory
- ✅ Delete text memory
</details>

<details>
<summary><b>Feature 2: Photo Upload</b> ✅</summary>

- ✅ File upload endpoint (`POST /api/media/upload`)
- ✅ Image compression (sharp)
- ✅ File validation
- ✅ Local storage
- ✅ Thumbnail generation
- ✅ Caption support (`description` field)
- ✅ Optional original quality mode (`keepOriginalQuality`)
- ✅ Display in MemoryStream
- ✅ Image gallery view
</details>

<details>
<summary><b>Feature 3: Video Upload</b> ✅</summary>

- ✅ Video upload endpoint (`POST /api/media/upload`)
- ✅ Video MIME validation and size limits
- ✅ FFmpeg-based compression and trimming
- ✅ Thumbnail extraction from first frame / selected time
- ✅ Duration tracking and storage
- ✅ Local encrypted storage
- ✅ Inline video playback in the memory stream
- ✅ Modal-based pre-upload trimming workflow
- ✅ Real-time album updates via Socket.IO
</details>

<details>
<summary><b>Feature 4: Voice Messages</b> ✅</summary>

- ✅ Audio recording with browser MediaRecorder
- ✅ Audio upload endpoint with validation and compression
- ✅ Audio compression via FFmpeg (MP3, 96 kbps)
- ✅ Audio player in UI with native controls
- ✅ Waveform-style visualization in the bubble
- ✅ Playback controls and duration display
</details>

---

### Phase 3: Album Management (🔄 In Progress)

<details>
<summary><b>Feature 6: Album Editing</b> ✅</summary>

- ✅ Update album name/description
- ✅ Change cover photo (with resize & compression)
- ✅ Toggle private/public
- ✅ `PATCH /api/albums/[id]` endpoint
- ✅ EditAlbumModal UI component
- ✅ Real-time album list updates
- ✅ Image validation and optimization
</details>

<details>
<summary><b>Feature 7: Album Deletion</b> ✅</summary>

- ✅ Soft delete album
- ✅ Cascade unshared memories to archive state
- ✅ `DELETE /api/albums/[id]`
- ✅ Delete action in album context menu with confirmation
</details>

<details>
<summary><b>Feature 8: Album Pinning</b> ✅</summary>

- ✅ Pin album to top
- ✅ Unpin album
- ✅ `POST /api/albums/[id]/pin`
- ✅ Pin indicator and context menu toggle in chat list
</details>

<details>
<summary><b>Feature 9: Album Archiving</b> ✅</summary>

- ✅ Archive album
- ✅ View archived albums
- ✅ Restore from archive
- ✅ `/archived` page
</details>

<details>
<summary><b>Feature 10: Album Locking (Passcode)</b> ✅</summary>

- ✅ Set PIN/passcode
- ✅ Require passcode to view
- ✅ Timeout option
- ✅ `POST /api/albums/[id]/lock`
- ✅ Unlock verification and lock modal UI
</details>

<details>
<summary><b>Feature 11: Album Sharing & Collaboration</b> ✅</summary>

- ✅ Invite users to album
- ✅ Permission levels (view/add/edit/admin)
- ✅ Accept/reject invitations
- ✅ `POST /api/share/album/[id]`
- ✅ Shared album listing and permission enforcement
</details>

<details>
<summary><b>Feature 12: Mute Notifications</b> ✅</summary>

- ✅ Mute album notifications
- ✅ Mute user notifications
- ✅ Notification settings
</details>

<details>
<summary><b>Feature 13: Album Copy</b> ✅</summary>

- ✅ Copy album with all memories
- ✅ Copy album structure only
- ✅ Copy modal in album context menu
- ✅ API route and ownership checks
</details>

<details>
<summary><b>Feature 14: Album Sorting/Filtering</b> ✅</summary>

- ✅ Sort by date and name
- ✅ Filter by private/shared ownership and privacy
- ✅ Filter by content type
- ✅ Server-side filtering and sorting via album list API
</details>

<details>
<summary><b>Feature 15: Album Cover Photo</b> ✅</summary>

- ✅ Upload custom cover
- ✅ Auto-generate from first visual memory
- ✅ Display cover in list and album header
</details>

---

### Phase 4: Search & Discovery (✅ Complete)

<details>
<summary><b>Feature 16: Full-Text Search</b> ✅</summary>

- ✅ Search across memories
- ✅ Filter by album
- ✅ Filter by date range
- ✅ `GET /api/search?q=...`
</details>

<details>
<summary><b>Feature 17: Search Filters</b> ✅</summary>

- ✅ Filter by memory type
- ✅ Filter by mood
- ✅ Filter by location
- ✅ Filter by tags
</details>

<details>
<summary><b>Feature 18: Advanced Search</b> ✅</summary>

- ✅ Boolean operators (AND, OR, NOT)
- ✅ Phrase search
- ✅ Regular expressions
</details>

<details>
<summary><b>Feature 19: Recent Searches</b> ✅</summary>

- ✅ Store search history per user
- ✅ Quick access to recent searches
- ✅ Re-run saved searches with original filters
- ✅ Clear individual entries and clear all history
</details>

<details>
<summary><b>Feature 20: Search Suggestions</b> ✅</summary>

- ✅ Auto-complete suggestions
- ✅ Popular searches
</details>

---

### Phase 5: Memory Management (🔄 In Progress)

<details>
<summary><b>Feature 21: Favorite/Like Memories</b> ✅</summary>

- ✅ Mark memory as favorite
- ✅ View favorites only
- ✅ Heart icon in UI
- ✅ `POST /api/memories/[id]/favorite`
</details>

<details>
<summary><b>Feature 22: Pin Memories</b> ✅</summary>

- ✅ Pin memory to top
- ✅ Pinned section
- ✅ `POST /api/memories/[id]/pin`
- ✅ Real-time update broadcasts and permission checks
</details>

<details>
<summary><b>Feature 23: Archive Memories</b> ✅</summary>

- ✅ Archive individual memories
- ✅ Restore from archive
- ✅ `POST /api/memories/[id]/archive`
- ✅ Album-level archived filter and real-time updates
</details>

<details>
<summary><b>Feature 24: Delete Memories</b> ✅</summary>

- ✅ Permanent delete
- ✅ Trash/recycle bin support
</details>

<details>
<summary><b>Feature 25: Forward Memory</b> ✅</summary>

- ✅ Forward to another album (with `add` permission)
- ✅ Track forwarding chain via `forwardedFromId`
- ✅ `POST /api/memories/[id]/forward` endpoint and frontend modal UI
- ✅ Reuse encrypted file paths and attempt to re-encrypt text content for the forwarding user
</details>

<details>
<summary><b>Feature 26: Shareable Memory Links</b> ✅</summary>

- ✅ Create public share links for any memory with at least view access
- ✅ Optional expiration date handling with expiry validation
- ✅ Optional password protection using bcrypt hashing
- ✅ Public share page with password challenge, media rendering, and invalid/expired state handling
- ✅ API endpoints for creation, public access, password verification, media serving, and revocation
- ✅ View counting and link revocation support
- ✅ Dashboard modal with copy-to-clipboard and share link management
</details>

---

### Phase 6: Sharing & Collaboration (🔄 In Progress)

<details>
<summary><b>Feature 27: Invite Users to Album</b> ✅</summary>

- ✅ Send invite email
- ✅ Copy invite link
- ✅ Accept/reject invite
- ✅ Revoke invite
</details>

<details>
<summary><b>Feature 28: Typing Indicators</b> ✅</summary>

- ✅ Show "typing..." status for collaborators in the same album
- ✅ Socket.IO event: "typing" and "stopped_typing"
- ✅ Auto-clear after inactivity and on submit/blur
- ✅ Multi-user aggregation with names and reset timers
</details>

<details>
<summary><b>Feature 29: User Mentions (@mention)</b> ✅</summary>

- ✅ Mention users in text
- ✅ Notification on mention
- ✅ @ autocomplete
</details>

<details>
<summary><b>Feature 30: Reactions/Emojis</b> ✅</summary>

- ✅ React to memories with emoji
- ✅ Show reaction counts
- ✅ Remove reactions
- ✅ Real-time reaction syncing across album members via Socket.IO
- ✅ Persist reactions in a dedicated `MemoryReaction` table
</details>

---

### Phase 7: Encryption & Security (⏳ Planned)

<details>
<summary><b>Feature 31: Encryption Status UI</b> ⏳</summary>

- ⏳ Show lock icon for encrypted
- ⏳ Display encryption key fingerprint
- ⏳ Encryption algorithm badge
</details>

<details>
<summary><b>Feature 32: Passcode Protection</b> ⏳</summary>

- ⏳ Set app-level passcode
- ⏳ Unlock with PIN
- ⏳ Biometric unlock option
- ⏳ Passcode timeout
</details>

<details>
<summary><b>Feature 33: Biometric Security</b> ⏳</summary>

- ⏳ Fingerprint unlock
- ⏳ Face ID unlock
- ⏳ Platform detection
- ⏳ Fallback to passcode
</details>

<details>
<summary><b>Feature 34: Two-Factor Authentication</b> ⏳</summary>

- ⏳ 2FA setup
- ⏳ TOTP codes
- ⏳ Backup codes
- ⏳ Recovery
</details>

<details>
<summary><b>Feature 35: End-to-End Encryption (E2E)</b> ⏳</summary>

- ⏳ Client-side encryption
- ⏳ Server cannot decrypt
- ⏳ Key derivation & storage
- ⏳ Performance optimization
</details>

---

### Phase 8: Personalization & UX (🔄 In Progress)

<details>
<summary><b>Feature 36: Profile Settings</b> ✅</summary>

- ✅ Edit profile (name, bio)
- ✅ Avatar upload
- ✅ Username change
- ✅ Email change
- ✅ Bio/about section
</details>

<details>
<summary><b>Feature 37: Daily Reminders</b> ✅</summary>

- ✅ Set reminder time
- ✅ Email notification
- ✅ In-app notification
- ✅ Skip reminder
- ✅ Cron scheduling
</details>

<details>
<summary><b>Feature 38: Mood Tracking</b> ✅</summary>

- ✅ Select mood (happy, sad, etc.)
- ✅ Mood history chart
- ✅ Mood statistics
- ✅ Mood filter/search
</details>

<details>
<summary><b>Feature 39: Location Tagging</b> ✅</summary>

- ✅ Add location to memory
- ✅ Map visualization
- ✅ Location-based grouping
- ✅ Geolocation permission
</details>

<details>
<summary><b>Feature 40: Custom Tags</b> ⏳</summary>

- ⏳ Create manual tags
- ⏳ Tag memories
- ⏳ Filter by tag
- ⏳ Tag suggestions
</details>

---

### Phase 9: AI & Analytics (⏳ Planned)

<details>
<summary><b>Feature 41: Auto-Tagging (Google Vision)</b> ⏳</summary>

- ⏳ Detect faces, objects, places
- ⏳ Auto-generate tags
- ⏳ Confidence score
- ⏳ Manual review
</details>

<details>
<summary><b>Feature 42: Statistics & Heatmap</b> ⏳</summary>

- ⏳ Memory count by date
- ⏳ Activity heatmap (calendar)
- ⏳ Memory type breakdown
- ⏳ Mood distribution
- ⏳ Word cloud
</details>

<details>
<summary><b>Feature 43: Insights</b> ⏳</summary>

- ⏳ Most active day/time
- ⏳ Most used locations
- ⏳ Memory streaks
- ⏳ Year in review
</details>

<details>
<summary><b>Feature 44: AI Summary</b> ⏳</summary>

- ⏳ Generate memory summaries
- ⏳ Group similar memories
- ⏳ Timeline view
</details>

---

### Phase 10: Advanced Features (⏳ Planned)

<details>
<summary><b>Feature 45: Export & Backup</b> ⏳</summary>

- ⏳ Export as ZIP
- ⏳ Export as JSON
- ⏳ Export as PDF
- ⏳ Scheduled backups
- ⏳ Cloud backup (Google Drive)
</details>

<details>
<summary><b>Feature 46: Import</b> ⏳</summary>

- ⏳ Import from JSON
- ⏳ Import from ZIP
- ⏳ Merge with existing
</details>

<details>
<summary><b>Feature 47: Local-Only Mode</b> ⏳</summary>

- ⏳ Disable cloud sync
- ⏳ Device-only storage
- ⏳ Manual sync button
</details>

<details>
<summary><b>Feature 48: Dark Theme</b> ⏳</summary>

- ⏳ Dark mode toggle
- ⏳ System theme detection
- ⏳ OLED optimization
</details>

<details>
<summary><b>Feature 49: Accessibility</b> ⏳</summary>

- ⏳ Screen reader support
- ⏳ Keyboard navigation
- ⏳ High contrast mode
- ⏳ Font size adjustment
</details>

<details>
<summary><b>Feature 50: Mobile App</b> ⏳</summary>

- ⏳ React Native app
- ⏳ Offline sync
- ⏳ Push notifications
- ⏳ Camera integration
</details>

---

### Real-Time Features (Socket.IO Integration)

#### Events to Implement
- ⏳ `join_room` - User joins album
- ⏳ `leave_room` - User leaves album
- ✅ `typing` - User typing indicator
- ✅ `new_memory` - Broadcast new memory
- ✅ `memory_updated` - Memory edit
- ✅ `memory_deleted` - Memory deletion
- ✅ `unread_update` - Unread count change
- ⏳ `user_online` - User status
- ⏳ `user_offline` - User status

---

### Technical Debt & Optimizations

- ⏳ Performance: Image lazy loading
- ⏳ Performance: Virtual scrolling for long memory lists
- ⏳ SEO: Open Graph tags for shared memories
- ⏳ Testing: Unit tests (Jest)
- ⏳ Testing: E2E tests (Cypress/Playwright)
- ⏳ Logging: Structured logging (Winston)
- ⏳ Monitoring: Error tracking (Sentry)
- ⏳ Analytics: User analytics (PostHog)
- ⏳ Docs: API documentation (Swagger)
- ⏳ Rate limiting: API rate limiting (Upstash)

---

## 🚀 Quick Start

### 60-Second Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/memoraa.git
cd memoraa

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database URL and secrets

# 4. Initialize the database
npx prisma migrate dev --name init

# 5. Start the development server
npm run dev

# 6. Open http://localhost:3000
# → Register an account
# → Create your first memory!
```

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Browser (React Client)                              │
│  - WhatsApp Web UI (Tailwind)                                               │
│  - Socket.IO client for real-time                                           │
│  - HTTP calls to Next.js API routes                                         │
└────────────────────┬────────────────────────────────────────────────────────┘
                     │ ① HTTP (API routes)
                     │ ② WebSocket (Socket.IO)
┌────────────────────▼────────────────────────────────────────────────────┐
│                     Next.js App Server (Vercel)                         │
│  - Serves frontend (SSR/SSG)                                            │
│  - API routes: /api/auth/[...nextauth], /api/albums, /api/memories...   │
│  - Produces BullMQ events for async tasks                               │
└─────┬──────────────────────┬──────────────────────┬─────────────────────┘
      │                      │                      │
      ▼                      ▼                      ▼
┌─────────────┐   ┌────────────────────┐   ┌─────────────────────────────┐
│   MySQL     │   │   Redis (BullMQ)   │   │  BullMQ Workers             │
│  (Prisma)   │   │  - Job queues      │   │  - Media Processor          │
│ - Users     │   │  - Cache           │   │  - AI Tagger                │
│ - Memories  │   └────────────────────┘   │  - Backup Worker            │
│ - Albums    │                            │  - Notifier                 │
│ - Tags      │                            └───────────────┬─────────────┘
└─────────────┘                                            │
                                                           ▼
                                             ┌─────────────────────────────┐
                                             │      Google Drive Cloud     │
                                             │  - Stores encrypted media   │
                                             └─────────────────────────────┘
```

### Data Flow: Creating a Memory

1. **User** types text/attaches file → hits Send.
2. **React component** submits `POST /api/memories/create` with payload.
3. **Next.js API** validates, creates `Memory` row in MySQL (status: `processing`), returns `202 Accepted`.
4. **BullMQ job** picks up the task:
   - Compresses/trims file (if media) using `sharp`/`fluent-ffmpeg`.
   - Encrypts using user's Fernet key.
   - Uploads to **Google Drive** → receives `drive_file_id`.
   - Updates MySQL: `status = 'ready'`, `encrypted_file_path = drive_file_id`.
5. **AI Tagger** (optional) calls Google Vision → creates tags.
6. **Notifier** sends WebSocket push via Socket.IO to all users viewing that album.
7. **Frontend** appends new memory bubble → updates album card → clears progress.

---

## 🛠️ Technology Stack

<h2 align="center">
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Hammer%20and%20Wrench.png" width="30px">
  TECH STACK
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Hammer%20and%20Wrench.png" width="30px">
</h2>

<div align="center">
  <h3>Frontend</h3>
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Quill.js-000000?style=for-the-badge&logo=quill&logoColor=white" />
  <img src="https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white" />

  <h3>Backend</h3>
  <img src="https://img.shields.io/badge/Next.js_API-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/NextAuth.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/BullMQ-FF6C37?style=for-the-badge&logo=redis&logoColor=white" />

  <h3>Database</h3>
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" />

  <h3>Storage & APIs</h3>
  <img src="https://img.shields.io/badge/Google_Drive-4285F4?style=for-the-badge&logo=googledrive&logoColor=white" />
  <img src="https://img.shields.io/badge/Google_Vision-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white" />
  <img src="https://img.shields.io/badge/Nodemailer-339933?style=for-the-badge&logo=nodemailer&logoColor=white" />

  <h3>Tools & Deployment</h3>
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
  <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Postman-FF6C37?style=for-the-badge&logo=postman&logoColor=white" />
</div>

---

## 📁 Project Structure

```
memoraa/
├── app/
│   ├── (auth)/                          # Login/register pages
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/                     # Main app (WhatsApp UI)
│   │   ├── layout.tsx                   # 3-column layout
│   │   ├── page.tsx                     # Redirects to /chats
│   │   ├── album/
│   │   │   └── [id]/
│   │   │       └── page.tsx             # Album detail
│   │   ├── albums/
│   │   │   └── page.tsx                 # Albums list
│   │   ├── archived/
│   │   │   └── page.tsx                 # Archived albums
│   │   ├── chats/
│   │   │   └── page.tsx                 # Chat list + memory stream
│   │   ├── map/                         # Location-based view
│   │   ├── search/                      # Search page
│   │   ├── settings/                    # Settings page
│   │   ├── components/                  # Reusable components
│   │   │   ├── NavBar.tsx
│   │   │   ├── ChatList.tsx
│   │   │   ├── MemoryStream.tsx
│   │   │   ├── Composer.tsx
│   │   │   ├── AlbumListControls.tsx
│   │   │   ├── AlbumShareButton.tsx
│   │   │   ├── EditAlbumModal.tsx
│   │   │   ├── CopyAlbumModal.tsx
│   │   │   ├── AudioRecorderModal.tsx
│   │   │   └── modals/
│   │   └── hooks/
│   ├── api/                             # API routes
│   │   ├── albums/
│   │   ├── auth/
│   │   ├── geocode/
│   │   ├── invite/
│   │   ├── media/
│   │   ├── memories/
│   │   ├── moods/
│   │   ├── notifications/
│   │   ├── reminders/
│   │   ├── search/
│   │   ├── settings/
│   │   ├── share/
│   │   ├── stats/
│   │   ├── tags/
│   │   └── user/
│   ├── lib/                             # Utilities
│   │   ├── auth.ts
│   │   ├── audio-processor.ts
│   │   ├── cover-generator.ts
│   │   ├── email.ts
│   │   ├── encryption.ts
│   │   ├── image-processor.ts
│   │   ├── media-processor.ts
│   │   ├── mentions.ts
│   │   ├── moods.ts
│   │   ├── permissions.ts
│   │   ├── prisma.ts
│   │   ├── queue.ts
│   │   ├── search-parser.ts
│   │   ├── search-suggestions.ts
│   │   ├── socket.ts
│   │   ├── storage.ts
│   │   └── video-processor.ts
│   ├── hooks/                           # Custom React hooks
│   │   └── useSocket.ts
│   ├── invite/
│   │   └── [token]/
│   ├── share/
│   │   └── [token]/
│   ├── types/                           # TypeScript types
│   │   └── index.ts
│   ├── components/
│   │   └── providers/
│   ├── layout.tsx                       # Root layout
│   └── globals.css                      # Tailwind + WhatsApp styles
├── workers/                             # BullMQ workers (if using)
│   ├── reminder-worker.ts
│   └── reminder-worker.js
├── prisma/
│   ├── schema.prisma                    # Database schema
│   └── migrations/
├── public/                              # Static assets
├── storage/                             # Local file storage
│   └── uploads/
├── types/                               # Global types
│   └── fluent-ffmpeg.d.ts
├── .env.local                           # Environment variables
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.mjs
├── postcss.config.mjs
├── eslint.config.mjs
├── proxy.ts
├── server.js
└── README.md
```

---

## 🗄️ Database Schema

### Core Models

| Model | Purpose |
| :--- | :--- |
| **User** | Authentication, profile, encryption key, preferences |
| **Album** | Thematic collections (like WhatsApp chats) with cover photo and metadata |
| **Memory** | Individual memories (text, photo, video, audio) with rich metadata |
| **Tag** | User-created or AI-generated tags for organization |
| **SharedAlbum** | Collaborators, permissions, and invite tokens |
| **AlbumMemory** | Junction table for memories in multiple albums |
| **MemoryTag** | Junction table for memories with multiple tags |
| **MemoryMention** | User mentions in memories |
| **Notification** | User notifications for mentions, reactions, invites |
| **MemoryReaction** | Emoji reactions to memories |
| **SharedMemoryLink** | Public shareable memory links with expiry and password protection |
| **AlbumMute** | Mute notifications for specific albums |
| **SearchHistory** | User search history with filters |
| **PopularSearch** | Trending searches across users |
| **BackupJob** | Backup audit logs and status tracking |

### ER Diagram (Simplified)

```
User (1) ────┬─── (N) Album
             │
             ├─── (N) Memory
             │      └── (N) Tag (via MemoryTag)
             │      └── (N) Album (via AlbumMemory)
             │      └── (1) User (owner)
             │
             └─── (N) SharedAlbum
                    └── (N) User (collaborators)
                    └── (1) Album
```

### Important Fields

- **User**: `encryptionKey` – Fernet key for end-to-end encryption.
- **Memory**: `encryptedContent` – AES-GCM encrypted text; `encryptedFilePath` – encrypted file path.
- **Album**: `isPinned`, `isArchived`, `passcodeHash` – for album management.
- **SharedAlbum**: `permission` – view, add, edit, admin; `token` – for invite links.
- **SharedMemoryLink**: `token` – unique public share link; `passwordHash` – optional password protection; `expiresAt` – optional expiry date.

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/auth/[...nextauth]` | NextAuth.js endpoints |
| `POST` | `/api/auth/register` | Custom registration |

### Albums

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/albums` | List all albums |
| `POST` | `/api/albums` | Create album |
| `GET` | `/api/albums/[id]` | Get album details |
| `PATCH` | `/api/albums/[id]` | Update album |
| `DELETE` | `/api/albums/[id]` | Soft delete |
| `POST` | `/api/albums/[id]/pin` | Toggle pin |
| `POST` | `/api/albums/[id]/archive` | Toggle archive |
| `POST` | `/api/albums/[id]/lock` | Set/remove passcode |
| `GET` | `/api/albums/[id]/memories` | Fetch memory stream |

### Memories

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/memories` | Create memory (returns 202) |
| `GET` | `/api/memories/[id]` | Get single memory |
| `PATCH` | `/api/memories/[id]` | Update memory |
| `DELETE` | `/api/memories/[id]` | Soft delete |
| `POST` | `/api/memories/[id]/forward` | Forward memory to another album |
| `POST` | `/api/memories/[id]/favorite` | Toggle favorite |
| `POST` | `/api/memories/[id]/pin` | Pin/unpin memory |
| `POST` | `/api/memories/[id]/archive` | Archive memory |

### Media

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/media/upload` | Upload file → file_id |
| `GET` | `/api/media/[fileId]` | Stream file from Drive |
| `POST` | `/api/media/[fileId]/crop` | Crop/filter image |
| `POST` | `/api/media/[fileId]/trim` | Trim video |

### Search

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/search?q=&albumId=` | Full‑text search |
| `GET` | `/api/search/suggestions?q=` | Autocomplete suggestions |
| `GET` | `/api/search/history` | Recent searches |

### Sharing

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/share/[memoryId]` | Generate share link |
| `POST` | `/api/share/album/[albumId]` | Invite user |

### Moods

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/moods` | Set mood for memory |
| `GET` | `/api/moods/stats` | Get mood statistics |

### Tags

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/tags` | List all tags |
| `POST` | `/api/tags` | Create new tag |
| `DELETE` | `/api/tags/[id]` | Delete tag |

### Reminders

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/reminders` | Get user reminders |
| `POST` | `/api/reminders` | Set daily reminder |
| `PATCH` | `/api/reminders` | Update reminder |

### Settings

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/settings` | Get user settings |
| `PATCH` | `/api/settings` | Update settings |

### Geocoding

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/geocode?lat=&lon=` | Get location name from coordinates |

### Invitations

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/invite/[token]` | Accept album invite by token |

### Statistics & Insights

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/stats` | Dashboard insights and summary |
| `GET` | `/api/notifications/unread` | Unread counts |

---

## ⚙️ Setup Instructions

### 1. Prerequisites

- **Node.js** 18+ (LTS recommended)
- **MySQL** 8.0+ (or PlanetScale for cloud)
- **Redis** (for BullMQ) – optional, can use Upstash
- **Google Drive Service Account** (for media storage) – optional, falls back to local storage

### 2. Clone & Install

```bash
git clone https://github.com/yourusername/memoraa.git
cd memoraa
npm install
```

### 3. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

#### Required Variables

```env
# Next.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-at-least-32-characters-long

# Database (MySQL)
DATABASE_URL="mysql://root:password@localhost:3306/memoraa"

# Encryption
ENCRYPTION_SALT="32-character-random-salt"
```

#### Optional Variables (for media & features)

```env
# Google Drive (for media storage)
GOOGLE_DRIVE_FOLDER_ID=your-google-drive-folder-id
GOOGLE_DRIVE_KEY_FILE=/path/to/service-account-key.json

# Redis (for BullMQ)
REDIS_URL=redis://localhost:6379

# Email (for reminders & invites)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Google Vision (AI tagging)
GOOGLE_VISION_API_KEY=your-api-key
```

### 4. Create Database

```bash
# Connect to MySQL
mysql -u root -p

# Create database
CREATE DATABASE memoraa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 5. Run Migrations

```bash
npx prisma migrate dev --name init
```

This creates all tables and generates the Prisma client.

### 6. (Optional) Seed Database

```bash
npx prisma db seed
```

### 7. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` and create your first account!

---

## 🌍 Environment Variables

### Full Reference

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `NEXTAUTH_URL` | ✅ | – | App URL (for auth callbacks) |
| `NEXTAUTH_SECRET` | ✅ | – | 32+ char random secret |
| `DATABASE_URL` | ✅ | – | MySQL connection string |
| `ENCRYPTION_SALT` | ✅ | – | 32‑char random salt |
| `REDIS_URL` | ❌ | – | Redis connection (BullMQ) |
| `SMTP_HOST` | ❌ | – | SMTP server for email |
| `SMTP_PORT` | ❌ | 587 | SMTP port |
| `SMTP_USER` | ❌ | – | SMTP username |
| `SMTP_PASS` | ❌ | – | SMTP password |
| `STORAGE_BACKEND` | ❌ | `local` | `local` or `google_drive` |
| `MAX_CONTENT_LENGTH` | ❌ | `100mb` | File upload limit |

---

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub.
2. Import project on [Vercel](https://vercel.com).
3. Add environment variables (from `.env.local`).
4. Deploy.

**Note**: For Socket.IO, you'll need a separate server or use Pusher/Ably. For BullMQ workers, deploy them on a VPS (DigitalOcean, AWS EC2) or use Upstash for serverless Redis.

### Manual (cPanel / VPS)

1. Build the app: `npm run build`.
2. Start with: `npm start`.
3. Run BullMQ workers: `node workers/process.js`.
4. Set up a reverse proxy (Nginx) and SSL.

---

## 💻 Development Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx prisma studio` | Open database visual editor |
| `npx prisma migrate dev` | Create migration |
| `npx prisma migrate deploy` | Apply migrations (production) |
| `npx prisma generate` | Regenerate Prisma client |
| `npm run workers` | Start BullMQ workers |

---

## 🔧 Troubleshooting

### "Can't connect to database"

- Verify MySQL is running.
- Check `DATABASE_URL` in `.env.local`.
- Ensure database exists: `mysql> SHOW DATABASES;`.

### "Unexpected token '<', '<!DOCTYPE'"

- The app is running but can't reach the API.
- Run `npx prisma migrate dev` first.
- Refresh the browser.

### "NEXTAUTH_SECRET is missing"

- Add `NEXTAUTH_SECRET` to `.env.local`.
- Generate with: `openssl rand -base64 32`.

### "ffmpeg not found" (video processing)

- Install `ffmpeg` on your system: `sudo apt install ffmpeg` (Linux) or `brew install ffmpeg` (macOS).
- Or use `ffmpeg-static` (already included).

### "Google Drive upload fails"

- Verify `GOOGLE_DRIVE_KEY_FILE` path is correct.
- Ensure the service account has write access to the folder.
- Check folder ID in `GOOGLE_DRIVE_FOLDER_ID`.

---

## 📄 License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/amazing-feature`.
3. Commit your changes: `git commit -m 'Add amazing feature'`.
4. Push: `git push origin feature/amazing-feature`.
5. Open a Pull Request.

### Development Guidelines

- Write TypeScript (strict mode).
- Follow the existing code style (ESLint + Prettier).
- Add tests for new features (Jest).
- Update documentation (README, FEATURES.md).

---

## 📞 Support & Contact

<div align="center">
  <table>
    <tr>
      <td>📧 <b>Email:</b> support@memoraa.dev</td>
      <td>🐛 <b>Issues:</b> <a href="https://github.com/your-org/memoraa/issues">GitHub Issues</a></td>
      <td>💻 <b>Repository:</b> <a href="https://github.com/your-org/memoraa">View on GitHub</a></td>
    </tr>
  </table>
</div>

---

## 📊 Project Status

<div align="center">

| Phase | Status | Features |
| :--- | :---  | :--- |
| **Phase 1**  | 🔄 Complete    | Foundation (Auth, DB, UI)   |
| **Phase 2**  | ⏳ Complete    | Core Features (Text, Media) |
| **Phase 3**  | ⏳ Complete    | Album Management            |
| **Phase 4**  | ⏳ Complete    | Search & Discovery          |
| **Phase 5**  | ⏳ Complete    | Memory Management           |
| **Phase 6**  | ⏳ Complete    | Sharing & Collaboration     |
| **Phase 7**  | ⏳ Planned     | Encryption & Security       | 
| **Phase 8**  | ⏳ In Progress | Personalization & UX        |
| **Phase 9**  | ⏳ Planned     | AI & Analytics              |
| **Phase 10** | ⏳ Planned     | Advanced Features           |

</div>

---

## 📈 Quick Reference

```bash
# Common commands
npm run dev          # Start dev server
npx prisma studio    # Open DB editor
npm run build        # Build production
npm run lint         # Run linter

# Database reset (⚠️ deletes all data)
npx prisma migrate reset

# Generate migration
npx prisma migrate dev --name description
```

---

<div align="center">
  <br>
  <i>⭐ From Sajeewa Logus with 💻 and ☕</i>
  <br>
  <i>🔒 Private Repository – All Rights Reserved</i>
  <br>
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,12,24&height=120&section=footer" width="100%"/>
</div>
