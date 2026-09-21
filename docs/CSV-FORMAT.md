# NahaLabs Content CSV Specification & Validation Guide

## 1. Supported CSV Columns

The NahaLabs Social Command Center supports bulk video scheduling and publishing via CSV files with RFC 4180 compatibility.

### Header Specification

| Column Name | Required | Type | Example | Description |
| :--- | :--- | :--- | :--- | :--- |
| `brand` | Yes | string | `Naha Studios` | Client brand name or brand ID |
| `title` | Yes | string | `Behind the Scenes EP 04` | Internal and external title |
| `video_url` | Yes | URL / path | `https://cdn.nahalabs.com/ep04.mp4` | Direct HTTPS video URL or cloud media key |
| `caption` | Yes | string | `Building the future of African digital media! #Naha #Creative` | Post caption, hashtags & emojis |
| `instagram` | Optional | boolean/text | `true` or `yes` or `1` | Publish to Instagram Reels |
| `tiktok` | Optional | boolean/text | `true` or `yes` or `1` | Publish to TikTok |
| `youtube` | Optional | boolean/text | `true` or `yes` or `1` | Publish to YouTube Shorts |
| `scheduled_at` | Optional | ISO-8601 | `2026-09-21T16:00:00Z` | Leave empty to draft or queue immediately |

---

## 2. Sample CSV Content

```csv
brand,title,video_url,caption,instagram,tiktok,youtube,scheduled_at
Naha Studios,Studio Tour Part 1,https://storage.googleapis.com/nahalabs-assets/samples/clip1.mp4,"Step inside our Johannesburg innovation creative lab #NahaLabs #Joburg",true,true,true,2026-09-22T09:00:00Z
Acme Africa,Client Success Story,https://storage.googleapis.com/nahalabs-assets/samples/clip2.mp4,"How Acme scaled operations 300% across SADC markets.",true,false,true,2026-09-22T14:30:00Z
Naha Sound,Vocal Session Teaser,https://storage.googleapis.com/nahalabs-assets/samples/clip3.mp4,"Raw vocal takes from yesterday's studio session. Volume up! 🎙️",false,true,false,
```

---

## 3. Validation Rules

1. **Brand Resolution**: Brand must match an existing brand in the organization, or the importer will prompt to automatically register the new brand.
2. **Platform Selection**: At least one platform (`instagram`, `tiktok`, `youtube`) must evaluate to `true`.
3. **Video Format**: URL must be a valid HTTPS URI ending with `.mp4`, `.mov`, `.webm`, or a recognized video streaming source.
4. **Caption Limits**:
   - Instagram: Max 2,200 characters.
   - TikTok: Max 4,000 characters.
   - YouTube Shorts: Max 100 characters in title, 5,000 in description.
5. **Schedule Verification**: If `scheduled_at` is populated, it must be in the future (or flagged with a warning).
