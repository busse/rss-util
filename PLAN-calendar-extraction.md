# Calendar Extraction Module - Implementation Plan

## Overview

This plan details the implementation of a calendar extraction module that identifies and extracts event information from RSS feed articles. The module will use OpenAI (same key as article summaries) to extract both **explicit events** (clearly stated dates/times) and **implicit events** (mentioned upcoming events, deadlines, conferences, etc.).

**Goal**: Provide users with as many calendar items as possible from their RSS feeds so they can select ones of interest for further research.

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                         index.html                               │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Feed Panel  │  │ Article List │  │  Content Panel         │  │
│  │             │  │              │  │  (or Calendar View)    │  │
│  │ + Calendar  │  │ + Calendar   │  │                        │  │
│  │   View Tab  │  │   Events     │  │  Event Details +       │  │
│  │             │  │   List       │  │  Add to Calendar       │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         preload.js                               │
│  New IPC methods: readCalendarEvents, writeCalendarEvents,      │
│                   extractCalendarEvents                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          main.js                                 │
│  - calendar-events.json storage                                  │
│  - IPC handlers for calendar operations                          │
│  - OpenAI integration for event extraction                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Calendar Event Object

```json
{
  "id": "unique-event-id (uuid)",
  "articleId": "source-article-id",
  "feedId": "source-feed-id",
  "title": "Event Title",
  "description": "Event description/context from article",
  "startDate": "2024-03-15T09:00:00Z",
  "endDate": "2024-03-15T17:00:00Z",
  "isAllDay": false,
  "location": "Location if mentioned",
  "url": "Related URL if any",
  "confidence": "high|medium|low",
  "eventType": "conference|deadline|release|meeting|webinar|other",
  "extractedAt": "2024-01-15T12:00:00Z",
  "sourceArticle": {
    "title": "Article title for reference",
    "link": "Article URL",
    "feedTitle": "Feed name"
  }
}
```

### Storage File: `calendar-events.json`

```json
{
  "events": [...],
  "lastExtraction": "ISO timestamp",
  "extractionStats": {
    "totalExtracted": 150,
    "byConfidence": { "high": 50, "medium": 70, "low": 30 }
  }
}
```

---

## Implementation Tasks

### Phase 1: Backend Foundation (main.js)

#### 1.1 Data Storage Handlers
- [ ] Add `read-calendar-events` IPC handler
- [ ] Add `write-calendar-events` IPC handler
- [ ] Add `delete-calendar-event` IPC handler
- [ ] Add `clear-old-calendar-events` IPC handler (remove past events)

#### 1.2 OpenAI Calendar Extraction
- [ ] Create `extract-calendar-events` IPC handler
- [ ] Design prompt for event extraction (explicit + implicit events)
- [ ] Handle API response parsing with validation
- [ ] Implement deduplication logic (same event from multiple articles)
- [ ] Add extraction caching to avoid re-processing same articles

**Prompt Design Considerations:**
- Extract ALL potential events, even uncertain ones (user will filter)
- Assign confidence levels based on specificity of date/time info
- Categorize event types for filtering
- Handle relative dates ("next Tuesday", "this Friday")
- Extract recurring events if mentioned

#### 1.3 Batch Extraction
- [ ] Add `extract-all-calendar-events` handler for processing all articles
- [ ] Implement rate limiting for OpenAI API calls
- [ ] Add progress tracking for batch operations

### Phase 2: Preload Bridge (preload.js)

#### 2.1 New IPC Methods
- [ ] `readCalendarEvents()` - Read all calendar events
- [ ] `writeCalendarEvents(events)` - Write events to storage
- [ ] `extractCalendarEventsFromArticle(articleId, content)` - Single article extraction
- [ ] `extractAllCalendarEvents()` - Batch extraction trigger
- [ ] `deleteCalendarEvent(eventId)` - Remove specific event
- [ ] `generateCalendarLinks(event)` - Generate Outlook/Gmail URLs

### Phase 3: Feature Flag & Settings (main.js + index.html)

#### 3.1 Feature Flag
- [ ] Add `calendarExtraction` feature flag (default: false)
- [ ] Add toggle in Settings modal
- [ ] Gate all calendar UI behind feature flag

#### 3.2 Settings Options
- [ ] Auto-extract on feed refresh toggle
- [ ] Confidence threshold filter (show high/medium/low)
- [ ] Days ahead to show (7, 14, 30, 60, all)

### Phase 4: Calendar View UI (index.html)

#### 4.1 Left Sidebar Addition
- [ ] Add "Calendar" item in sidebar below Categories
- [ ] Show badge with upcoming event count
- [ ] Calendar icon indicator

#### 4.2 Calendar Events List (Middle Panel)
When Calendar view is selected:
- [ ] List all extracted events sorted by date
- [ ] Group by: Today, This Week, This Month, Later
- [ ] Show: Event title, date/time, source feed, confidence indicator
- [ ] Filter controls: by confidence, by event type, by feed
- [ ] Search within calendar events

#### 4.3 Event Detail View (Right Panel)
When an event is selected:
- [ ] Event title and full details
- [ ] Source article link
- [ ] Date/time with timezone display
- [ ] Location if available
- [ ] Confidence indicator with explanation
- [ ] **Add to Calendar buttons:**
  - Google Calendar (generates webcal/gcal link)
  - Outlook Calendar (generates outlook.office.com link)
  - Download .ics file
- [ ] "View Source Article" button
- [ ] "Dismiss Event" button (removes from list)

#### 4.4 Calendar Link Generation
Google Calendar URL format:
```
https://calendar.google.com/calendar/render?action=TEMPLATE
  &text={title}
  &dates={startDate}/{endDate}
  &details={description}
  &location={location}
```

Outlook Calendar URL format:
```
https://outlook.office.com/calendar/0/deeplink/compose?
  subject={title}
  &startdt={startDate}
  &enddt={endDate}
  &body={description}
  &location={location}
```

ICS File generation for download.

### Phase 5: Integration with Article View

#### 5.1 Article Integration
- [ ] Add "Extract Events" button in article view header
- [ ] Show extracted events inline in article view if any exist
- [ ] Quick-add to calendar from article view

#### 5.2 Automatic Extraction
- [ ] Option to auto-extract when article is viewed
- [ ] Option to auto-extract during feed refresh (batch)
- [ ] Background extraction with progress indicator

### Phase 6: Data Mirror Integration

#### 6.1 Markdown Export
- [ ] Add calendar events to data mirror if enabled
- [ ] Export format: `calendar/{YYYY-MM}/{event-title}.md`
- [ ] Include Obsidian-compatible frontmatter with dates

---

## OpenAI Prompt Design

### Calendar Extraction Prompt

```
You are an expert at identifying events, deadlines, and dates mentioned in articles.
Analyze the following article and extract ALL potential calendar events.

Rules:
1. Extract BOTH explicit events (specific dates/times) and implicit events (mentioned but less specific)
2. For relative dates like "next week" or "this Friday", calculate from today's date: {currentDate}
3. Assign confidence levels:
   - HIGH: Specific date and time clearly stated
   - MEDIUM: Date mentioned but time unclear, or "early March" type references
   - LOW: Vague references like "coming soon", "later this year"
4. Include ALL potential events - user will filter. Err on the side of inclusion.
5. Categorize each event: conference, deadline, release, meeting, webinar, sale, holiday, other

Return JSON array:
[
  {
    "title": "Event name",
    "description": "Brief context from article",
    "startDate": "ISO 8601 or null if unknown",
    "endDate": "ISO 8601 or null if unknown/same as start",
    "isAllDay": true/false,
    "location": "Location or null",
    "url": "Related URL or null",
    "confidence": "high|medium|low",
    "eventType": "category",
    "reasoning": "Why this was identified as an event"
  }
]

If no events found, return empty array [].

Article content:
{articleContent}
```

---

## File Changes Summary

| File | Changes |
|------|---------|
| `main.js` | Add calendar IPC handlers, OpenAI extraction logic, storage management |
| `preload.js` | Add calendar-related IPC method exposures |
| `index.html` | Calendar view UI, event list, event details, calendar buttons, settings |
| `package.json` | Version bump (if needed) |

---

## UI Mockup - Calendar View

```
┌────────────────────────────────────────────────────────────────────────┐
│ RSS Reader                                              [Manage]       │
├─────────────┬──────────────────────┬───────────────────────────────────┤
│             │                      │                                   │
│ SUBSCRIPTIONS│  CALENDAR EVENTS    │  Tech Conference 2024             │
│ ▸ All Articles│                    │                                   │
│   Feed 1    │  Filter: All ▼       │  📅 March 15-17, 2024             │
│   Feed 2    │  ─────────────────   │  📍 San Francisco, CA             │
│             │                      │  🔗 Source: TechCrunch            │
│ CATEGORIES  │  TODAY               │                                   │
│   Tech      │  ────────────────    │  Confidence: ●●●○ High            │
│   News      │  (no events)         │                                   │
│             │                      │  Description:                     │
│─────────────│  THIS WEEK           │  Annual technology conference     │
│ 📅 CALENDAR │  ────────────────    │  featuring keynotes from...       │
│   [15 events]│  ◉ Tech Conference  │                                   │
│             │    Mar 15 • High     │  ┌─────────────────────────────┐  │
│             │  ○ Product Launch    │  │  📅 Add to Google Calendar  │  │
│             │    Mar 18 • Medium   │  │  📅 Add to Outlook          │  │
│             │                      │  │  ⬇️  Download .ics          │  │
│             │  THIS MONTH          │  └─────────────────────────────┘  │
│             │  ────────────────    │                                   │
│             │  ○ Deadline: Taxes   │  [View Source Article] [Dismiss]  │
│             │    Apr 15 • High     │                                   │
│             │                      │                                   │
└─────────────┴──────────────────────┴───────────────────────────────────┘
```

---

## Testing Considerations

1. **Event Extraction Accuracy**
   - Test with various article types (tech news, press releases, blogs)
   - Verify relative date parsing
   - Test confidence assignment

2. **Calendar Link Generation**
   - Verify Google Calendar links open correctly
   - Verify Outlook links open correctly
   - Test .ics file generation and import

3. **UI/UX Testing**
   - Calendar view navigation
   - Event filtering and search
   - Responsive layout

4. **Edge Cases**
   - Articles with no events
   - Articles with many events
   - Events with partial date info
   - Recurring events
   - Time zone handling

---

## Implementation Order (Recommended)

1. **Phase 1.1-1.2**: Backend data storage + OpenAI extraction
2. **Phase 2**: Preload bridge methods
3. **Phase 3.1**: Feature flag (so UI can be gated)
4. **Phase 4.1-4.3**: Calendar view UI
5. **Phase 4.4**: Calendar link generation
6. **Phase 5.1**: Article view integration
7. **Phase 3.2**: Settings options
8. **Phase 5.2**: Automatic extraction
9. **Phase 6**: Data mirror integration

---

## Security Considerations

- Use existing encrypted API key storage (no new keys needed)
- Sanitize event data before rendering in UI
- URL-encode all parameters in calendar links
- Validate date formats before processing

---

## Performance Considerations

- Cache extraction results per article (avoid re-processing)
- Rate limit OpenAI API calls during batch extraction
- Lazy load calendar events (don't load on app start unless viewing calendar)
- Index events by date for efficient filtering
- Consider extraction timeout for large articles

---

## Future Enhancements (Out of Scope)

- Two-way calendar sync
- Native calendar integration (macOS Calendar, Windows Calendar)
- Event reminders/notifications
- Calendar view (month/week grid visualization)
- iCal feed generation for subscription

---

## Estimated Complexity

| Phase | Complexity | Files Affected |
|-------|------------|----------------|
| Phase 1 (Backend) | Medium | main.js |
| Phase 2 (Preload) | Low | preload.js |
| Phase 3 (Settings) | Low | main.js, index.html |
| Phase 4 (UI) | High | index.html |
| Phase 5 (Integration) | Medium | index.html |
| Phase 6 (Mirror) | Low | main.js |

**Total new code estimate:** ~800-1200 lines across all files
