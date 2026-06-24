# Health Tracker

A private, mobile-first web app for logging a few daily health metrics and seeing
how they trend over time. It runs entirely in your browser and keeps your data in
**your own Google Drive**, so nothing is stored on a shared server.

## What you can track

- **Weight** - one reading per day.
- **Blood pressure** - systolic, diastolic, and an optional pulse.
- **Protein** - logged from a built-in food list; each day has a protein goal, and
  the day is colour-coded by how close you got to it.
- **Exercise** - a daily checklist (cardio, stretching, meditation, strength, and a
  free-form bonus activity), each with its own weekly target.

You also get weekly and monthly summaries, current and longest streaks, and a
GitHub-style activity heatmap for every metric.

## Your data stays yours

When you open the app you sign in with Google and connect a private folder that
only this app can see. Your entries live there, in your account - you can use the
app from your phone and laptop and see the same data, and no one else can read it.

From **Settings** you can export a full backup as JSON or CSV at any time, and
restore from either. A CSV holds one section per table, so it doubles as a
spreadsheet-friendly copy of your data; importing a partial CSV updates only the
tables it contains.

## Getting started

1. Open the app in your browser.
2. Sign in with Google and allow access to its private app folder.
3. Start logging from the **Today** screen.

It is a progressive web app, so you can install it to your home screen (Add to Home
Screen on iOS, Install from the browser menu on Android/desktop). Once installed it
opens full-screen and the app shell loads offline, though logging still needs a
connection to reach your Drive.

## License

Released under the [MIT License](LICENSE).
