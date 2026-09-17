# Notion Setup Guide

## 1. Create a Notion Integration

1. Go to https://www.notion.so/profile/integrations
2. Click **New integration**
3. Name it "Alumni Tracker", select your workspace
4. Copy the **Internal Integration Secret** → `NOTION_TOKEN` in `.env.local`

## 2. Create Four Databases

Create these as full-page databases in Notion. The property names must match exactly.

---

### Profiles Database

| Property Name   | Type     | Notes                        |
|-----------------|----------|------------------------------|
| `Name`          | Title    | Full name (default title)    |
| `clerk_id`      | Text     | Clerk user ID                |
| `graduation_year` | Number | e.g. 2025                   |
| `major`         | Text     |                              |
| `minor`         | Text     |                              |
| `bio`           | Text     |                              |
| `phone_number`  | Phone    | Optional contact number      |
| `role_title`    | Text     | e.g. VP of Engineering       |
| `status`        | Select   | `Current Member`, `Alumni`   |
| `team`          | Multi-select | Options must match the 7 teams in `lib/teams.ts`: `Operations`, `Technology`, `Development`, `Expansion`, `Finance`, `Internal`, `New Analysts`. Members can be on multiple. |
| `chapter_role`  | Text     | e.g. President, Analyst      |
| `location`      | Text     | Where they are now           |
| `hometown`      | Text     | Searchable in the directory  |
| `fun_fact`      | Text     |                              |
| `contact_email` | Text     | Only shown when `open_to_chat` is checked |
| `skills`        | Multi-select | Searchable                |
| `hobbies`       | Multi-select | Searchable                |
| `current_classes` | Multi-select | Searchable — members use it to find classmates |
| `open_to_chat`  | Checkbox | Default: unchecked. Opt-in; reveals `contact_email` to signed-in members |
| `linkedin_url`  | URL      |                              |
| `github_url`    | URL      |                              |
| `instagram_url` | URL      |                              |
| `avatar_url`    | URL      |                              |
| `banner_url`    | URL      | Profile header image         |
| `big`           | Relation | Self-relation to Profiles DB |
| `family_tree`   | Relation | Points to Family Trees DB    |
| `is_admin`      | Checkbox | Default: unchecked           |

Copy the database ID → `NOTION_PROFILES_DB_ID`

---

### Internships Database

| Property Name | Type              | Notes                        |
|---------------|-------------------|------------------------------|
| `Name`        | Title             | Role title                   |
| `company`     | Text              |                              |
| `Profile`     | Relation          | Points to Profiles database  |
| `start_date`  | Date              |                              |
| `end_date`    | Date              | Leave blank if current       |
| `description` | Text              |                              |
| `company_website` | URL           | Used to pull company icon    |

Copy the database ID → `NOTION_INTERNSHIPS_DB_ID`

---

### Clubs Database

| Property Name | Type     | Notes                        |
|---------------|----------|------------------------------|
| `Name`        | Title    | Club name                    |
| `Profile`     | Relation | Points to Profiles database  |
| `role`        | Text     | e.g. President               |
| `start_year`  | Number   |                              |
| `end_year`    | Number   | Leave blank if active        |

Copy the database ID → `NOTION_CLUBS_DB_ID`

---

### Family Trees Database

| Property Name | Type  | Notes                       |
|---------------|-------|-----------------------------|
| `Name`        | Title | Stable name for a tree/line |

Copy the database ID → `NOTION_FAMILY_TREES_DB_ID`

---

### Team Updates Database

Powers the Teams page. Each row is one update attached to one team.

| Property Name | Type         | Notes                                                                                   |
|---------------|--------------|-----------------------------------------------------------------------------------------|
| `Name`        | Title        | Short update title (e.g. "Spring socials recap")                                        |
| `team`        | Select       | Must match one of: `Operations`, `Technology`, `Development`, `Expansion`, `Finance`, `Internal`, `New Analysts` — character-for-character, same set used on the Profiles `team` select |
| `body`        | Text         | Update detail / context                                                                 |
| `author`      | Text         | Author's name (free text)                                                               |
| `date`        | Date         | When the update happened (falls back to created time if blank)                          |
| `tags`        | Multi-select | Free-form labels (e.g. `Launch`, `Onboarding`, `Chapter`)                               |
| `status`      | Select       | One of: `In Progress`, `Milestone`, `Blocker`, `Done`                                   |
| `published`   | Checkbox     | Only checked rows appear on the Teams page                                              |

Copy the database ID → `NOTION_TEAM_UPDATES_DB_ID`

> The seven team names are fixed in `lib/teams.ts`. Keep the `team` select options in the Profiles and Team Updates databases in sync with that list.

---

### Attendance Database

Optional. Without it, the roster on an event page shows a setup notice and
nothing else breaks.

| Property Name | Type     | Notes                                        |
|---------------|----------|----------------------------------------------|
| `Name`        | Title    | `<event title> — <member name>`, written by the app |
| `Profile`     | Relation | Points to Profiles DB                        |
| `event_id`    | Text     | Google Calendar event id                     |
| `event_title` | Text     | Denormalized so the database reads on its own |
| `date`        | Date     | Event start                                  |
| `status`      | Select   | `present`, `late`, `excused`, `absent`       |
| `recorded_by` | Relation | Points to Profiles DB — who marked the roster |

Copy the database ID → `NOTION_ATTENDANCE_DB_ID`

Rosters are taken by admins from an event's page (`/events/<id>`). A member is
counted as attending when they are `present` or `late`; `excused` is left out of
their rate entirely rather than counting against them.

---

## 3. Share Databases with Your Integration

For each of the four databases:
1. Open the database → click **...** menu (top right)
2. Click **Connections** → search for your integration → **Confirm**

## 4. Get Database IDs

Open each database in your browser. The URL looks like:
```
https://www.notion.so/your-workspace/DATABASE_ID?v=...
```
The DATABASE_ID is the 32-character string before the `?`. Copy it into `.env.local`.
