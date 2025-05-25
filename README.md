# Catch-All Email Autofill

A Firefox browser extension that generates unique, disposable email addresses using your own catch-all domain for enhanced privacy and organization.

## Features

- **Unique Email Generation**: Creates memorable email addresses using a pattern like `word_word_123@yourdomain.com`
- **Visual Integration**: Adds convenient email icons directly into email input fields on web pages
- **Multiple Input Methods**:
  - Click icons in email fields
  - Use the browser toolbar popup
  - Right-click context menu on any input field
  - Bulk fill all email fields on a page
- **Customizable Wordlists**: Use default German wordlist or configure your own remote wordlist URL
- **Usage Tracking**: Keep track of all generated emails with export capabilities (JSON/CSV)
- **Privacy-Focused**: All data stored locally, no external services required

## Prerequisites

You need a **catch-all email** setup on your domain. This means any email sent to `anything@yourdomain.com` will be delivered to your main inbox. Most email providers and hosting services offer this feature.

Make sure you setup:

- SPF entry and its parameters as a TXT record in the DNS settings of your provider
- DKIM entries as CNAME records in the DNS settings of your provider
- DMARC entry and its parameters as a TXT record in the DNS settings of your provider.

Otherwise your domain might be flaged and you wont be able to get mails.

## Installation

Install directly from the Firefox Add-ons store.

## Setup

1. **Configure Your Domain**:
   - Click the extension icon in your toolbar
   - Click "⚙️ Settings" or the extension will prompt you on first use
   - Enter your catch-all domain (e.g., `mydomain.com`)
   - Click "Save Domain"

2. **Optional - Custom Wordlist**:
   - In settings, you can configure a custom wordlist URL
   - The URL should point to a text file with one word per line
   - There are two list inside this repo:
     - English Diceware Wordlist (default) [[Source]](https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt): `https://raw.githubusercontent.com/mietzen/catch-all-autofill/refs/heads/main/wordlists/eff_large_wordlist.txt`
     - German Diceware Wordlist [[Source]](https://github.com/dys2p/wordlists-de/blob/main/de-7776-v1.txt): `https://raw.githubusercontent.com/mietzen/catch-all-autofill/refs/heads/main/wordlists/de-7776-v1.txt`

## Usage

### Method 1: Email Field Icons

- Email input fields will automatically show a ✉️ icon
- Click the icon to generate and fill an email address

### Method 2: Toolbar Popup

- Click the extension icon in your browser toolbar
- Click "Generate for this Domain" to create a new email or use a previous generated one
- Click on the icon to copy the address and paste it into the email field

### Method 3: Context Menu

- Right-click on any input field
- Select "Generate Email for this field"

## Managing Generated Emails

- View all generated emails in extension settings
- Filter by domain to find specific emails
- Copy any previously generated email with one click
- Import / Export your email history and settings as JSON
- Delete individual entries or clear all history

## Todo

- Use local wordlist, dropdown with flags and custom option that activates the url field
- Json export should save all settings!
- Json import
- Github backup option (Json export) <https://stackoverflow.com/a/69290756/6847446> (GraphQL)

  Buttons:
  - Save (saves the config)
  - Backup (commits the config)

  Settings:
  - branch (default: main)
  - repository (name with owner, e.g.: demo-githubs/test)
  - PAT (Should be excluded from backup!)

- Make html nicer
- Port to Chrome
- Screenshots / screencasts
- Test Sync
- Upload to Stores
- CI/CD

## Resources

- [Font Awesome Free](https://fontawesome.com/) (SIL OFL 1.1)
- [flag-icons](https://github.com/lipis/flag-icons?tab=readme-ov-file) (MIT)
- [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) (MPL-2.0)
