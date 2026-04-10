# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This repository contains a single standalone HTML snippet (`wedo_onboarding_branded.html`) — a customer onboarding form for WeDo IoT Solutions. It is **not** a full HTML document; it is an embeddable fragment (no `<html>`, `<head>`, or `<body>` tags) designed to be injected into a host platform.

## No build system

There are no build tools, package managers, or test frameworks. The file is plain HTML with inline CSS and vanilla JavaScript — open it directly in a browser or embed it in a host page.

## Host environment dependencies

The snippet relies on CSS custom properties that must be provided by the host environment:

- `--font-sans`, `--font-mono`
- `--border-radius-lg`, `--border-radius-md`
- `--color-background-primary`, `--color-background-secondary`
- `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`
- `--color-border-tertiary`

Brand accent color `#EE7623` (WeDo orange) and dark header `#24272A` are hardcoded inline.

## Architecture

The form is divided into three sections:

1. **Customer data** — company, name, email, phone, location
2. **Gateway configuration** — connection type tabs (DHCP / Static IP / WiFi) with conditional field panels revealed via `setConn()`
3. **Subscription** — annual/monthly period toggle with a license card grid rendered dynamically from `LICENSE_CATALOG`

All state is held in two module-level variables: `currentConn` (string) and `selectedLic` (object).

`submitForm()` performs inline validation by checking for empty required fields and highlighting them red (`#E24B4A`) on failure. On success it hides `#form-body` and shows `#success-box`.

## License catalog

`LICENSE_CATALOG` in the script block is the single source of truth for available plans. Each entry maps a display name to `{ code, devices }` for both `anual` and `mensual` billing periods. Update this object to add, remove, or rename plans.
