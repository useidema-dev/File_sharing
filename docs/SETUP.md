# MyVault Setup Guide

## Phase 1: UI and Dashboard Layout ✅ COMPLETED

Phase 1 is now complete! You can preview the UI by opening the HTML files in your browser.

### What's Working
- Landing page (`index.html`)
- Login page (`login.html`)
- Dashboard UI (`dashboard.html`)
- Theme toggle (light/dark mode)
- Responsive design
- All navigation and UI interactions

### Preview the UI

1. **Landing Page**:
   ```
   Open: index.html
   ```

2. **Login Page**:
   ```
   Open: login.html
   ```

3. **Dashboard**:
   ```
   Open: dashboard.html
   ```
   - Try switching between pages using the sidebar
   - Toggle dark mode using the sun/moon icon
   - Test the mobile menu (resize your browser)
   - Click "Upload Files" to see the upload modal

### Theme Toggle
- Click the theme icon in the top bar to switch between light and dark mode
- Or use the theme selector in Settings
- Theme preference is saved in localStorage

### Responsive Testing
- Desktop: Full sidebar and all features
- Tablet: Condensed layout
- Mobile: Hamburger menu, optimized views

## Phase 2: Supabase Configuration (Next Steps)

### Prerequisites
1. **Node.js** (not required for Phase 1, but useful for local development server)
2. **Supabase Account** (free tier available)
3. **Modern Web Browser**

### Supabase Setup Instructions

#### Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Sign up or log in
3. Click "New Project"
4. Fill in project details:
   - **Name**: MyVault (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Select closest to you
5. Click "Create new project"
6. Wait for project to initialize (2-3 minutes)

#### Step 2: Get Your Credentials

1. In your Supabase project dashboard, click "Settings" (gear icon)
2. Click "API" in the sidebar
3. Copy the following:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

**IMPORTANT**: 
- ❌ **DO NOT** copy the `service_role` key
- ✅ **ONLY** use the `anon public` key in your frontend

#### Step 3: Configure the Application

Open `js/supabase.js` and update:

```javascript
const SUPABASE_URL = 'your-project-url-here';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

#### Step 4: Include Supabase Client Library

Add this to your HTML files (before your custom scripts):

**In `login.html`** (before `<script src="js/supabase.js">`):
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

**In `dashboard.html`** (before `<script src="js/supabase.js">`):
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

#### Step 5: Initialize Supabase Client

Update `js/supabase.js`:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### Phase 2 Features to Implement

1. **Email Authentication**
   - Sign up (will disable public registration later)
   - Sign in
   - Sign out
   - Password reset

2. **Session Management**
   - Check if user is authenticated
   - Redirect to login if not authenticated
   - Redirect to dashboard if authenticated

3. **User Profile**
   - Display user email
   - Load user metadata

## Phase 3: Database Setup (Future)

Will create these tables:
- `profiles` - User profiles
- `files` - File metadata
- `folders` - Folder structure
- `favorites` - Favorite files
- `file_shares` - Shared file links

## Phase 4: Storage Setup (Future)

Will configure:
- Private storage bucket
- Storage policies
- File upload paths

## Troubleshooting

### Phase 1 Issues

**Problem**: Styles not loading
- **Solution**: Make sure CSS files are in the `css/` folder
- Check browser console for errors

**Problem**: Theme not switching
- **Solution**: Clear browser localStorage and refresh

**Problem**: Mobile menu not working
- **Solution**: Make sure `dashboard.js` is loaded correctly

### Development Server (Optional)

For Phase 1, you can use any static file server:

**Using Python 3**:
```bash
python -m http.server 8000
```

**Using Node.js (http-server)**:
```bash
npx http-server -p 8000
```

**Using PHP**:
```bash
php -S localhost:8000
```

Then open: `http://localhost:8000`

## Security Checklist (Phase 2+)

- [ ] Use HTTPS in production
- [ ] Never commit Supabase keys to git
- [ ] Use environment variables for keys
- [ ] Enable RLS on all tables
- [ ] Validate all user inputs
- [ ] Use private storage buckets
- [ ] Implement rate limiting
- [ ] Sanitize file names

## Project Organization

```
Local Development
├── Open HTML files directly in browser (Phase 1)
├── Use local development server (Optional)
└── Configure Supabase (Phase 2)

Production (Future)
├── Host on Netlify/Vercel/GitHub Pages
├── Use environment variables
└── Enable custom domain with HTTPS
```

## Need Help?

Phase 1 is complete and ready for preview. For Phase 2:
1. Create your Supabase project first
2. Test authentication in Supabase dashboard
3. Follow the configuration steps above
4. Check browser console for errors

---

**Ready for Phase 2?** Let me know when you have your Supabase project ready!
