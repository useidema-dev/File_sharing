# Phase 2: Supabase Authentication Setup

## 🎯 Phase 2 Status: Ready for Configuration

All authentication code is implemented! Now you just need to configure your Supabase credentials.

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Create Supabase Project

1. Go to **https://supabase.com**
2. Click **"Start your project"** or **"New Project"**
3. Sign in with GitHub (recommended) or Email
4. Click **"New Project"**
5. Fill in:
   - **Name**: `myvault` (or any name you prefer)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Free (sufficient for personal use)
6. Click **"Create new project"**
7. ☕ Wait 2-3 minutes for initialization

### Step 2: Get Your Credentials

1. In your Supabase dashboard, click **"Settings"** (⚙️ gear icon at bottom left)
2. Click **"API"** in the left sidebar
3. You'll see:
   - **Project URL** - Copy this
   - **API Keys** section:
     - ✅ **anon public** - Copy this (safe for frontend)
     - ❌ **service_role** - DO NOT USE in frontend code

Your credentials look like:
```
Project URL: https://abcdefghijklmno.supabase.co
anon key: eyJhbGc...very-long-key...xyz123
```

### Step 3: Configure Your Application

1. Open `js/supabase.js` in your code editor
2. Find these lines (at the top):
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL';
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
   ```
3. Replace with your actual credentials:
   ```javascript
   const SUPABASE_URL = 'https://abcdefghijklmno.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJhbGc...your-actual-key...xyz123';
   ```
4. **Save the file**

### Step 4: Enable Email Authentication

By default, Supabase requires email confirmation. Let's disable it for easier testing:

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Email** provider
3. Toggle **"Enable Email provider"** to ON (if not already)
4. **Disable email confirmations** (for development):
   - Scroll down to **Email** settings
   - Toggle OFF: **"Confirm email"**
   - Click **Save**

> **Note**: For production, you should enable email confirmation for security.

### Step 5: Create Your User Account

Since public registration is disabled (as per your requirements), create your account manually:

1. In Supabase dashboard, go to **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Enter:
   - **Email**: your email address
   - **Password**: your password (min 6 characters)
   - **Auto Confirm User**: ✅ Check this (since we disabled email confirmation)
4. Click **"Create user"**

### Step 6: Test Authentication

1. Open `login.html` in your browser
2. Enter the email and password you just created
3. Click **"Sign In"**
4. You should be redirected to `dashboard.html`
5. Your email should appear in the sidebar footer

**✅ Success!** If you see your email in the dashboard, authentication is working!

---

## 🔒 Security Setup (Important!)

### Disable Public Registration

To prevent anyone from signing up (personal use only):

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Scroll to **Email** provider settings
3. Toggle OFF: **"Enable Email Signup"**
4. Click **Save**

Now only you (or users you manually create) can access the system.

### Row Level Security (Phase 3)

RLS will be configured in Phase 3 to ensure:
- Users can only see their own files
- Users can only access their own data
- No one can access your private files

---

## 🧪 Testing Checklist

After configuration, test these features:

### Login Page (login.html)
- [ ] Open login.html
- [ ] Enter valid credentials
- [ ] Click "Sign In"
- [ ] Should redirect to dashboard.html
- [ ] Check browser console for "✅ Supabase client initialized"

### Dashboard (dashboard.html)
- [ ] Your email appears in sidebar footer
- [ ] Your username appears (part before @)
- [ ] Settings page shows your email
- [ ] No console errors

### Logout
- [ ] Click logout button (sidebar footer)
- [ ] Confirm logout
- [ ] Should redirect to login.html
- [ ] Trying to access dashboard.html should redirect back to login

### Password Reset (Forgot Password)
- [ ] Click "Forgot password?" on login page
- [ ] Enter your email
- [ ] Click "Send Reset Link"
- [ ] Check your email inbox
- [ ] Click the reset link
- [ ] Set new password

### Session Persistence
- [ ] Login to dashboard
- [ ] Close browser tab
- [ ] Open dashboard.html again
- [ ] Should stay logged in (no redirect)

---

## 🐛 Troubleshooting

### "Supabase not configured" Error

**Problem**: Seeing warning message on login page

**Solution**: 
1. Check `js/supabase.js` - make sure you replaced the placeholder credentials
2. Credentials should NOT contain quotes or 'YOUR_'
3. URL should start with `https://`
4. Key should start with `eyJ`

### "Invalid login credentials" Error

**Problem**: Can't login with email/password

**Solutions**:
1. **Check if user exists**: Go to Supabase → Authentication → Users
2. **Check email confirmation**: If "Email Confirmed" shows false, click the user and confirm manually
3. **Check password**: Re-create user with a simpler password for testing
4. **Check Email Signup**: Make sure it's NOT disabled (disable it AFTER creating your account)

### Infinite Redirect Loop

**Problem**: Page keeps redirecting between login and dashboard

**Solutions**:
1. Open browser console (F12)
2. Check for JavaScript errors
3. Clear browser cookies and localStorage
4. Try in incognito/private mode
5. Make sure Supabase credentials are correct

### "401 Unauthorized" or "Invalid API key"

**Problem**: Supabase rejecting requests

**Solutions**:
1. Double-check you copied the **anon** key (not service_role)
2. Make sure there are no extra spaces or quotes
3. Regenerate your anon key in Supabase dashboard if needed

### CORS Errors

**Problem**: CORS policy blocking requests

**Solutions**:
1. Make sure you're using the correct Project URL
2. Don't test with `file://` - use a local server:
   ```bash
   # Python
   python -m http.server 8000
   
   # Node.js
   npx http-server -p 8000
   
   # PHP
   php -S localhost:8000
   ```
3. Open: `http://localhost:8000`

### Email Not Received (Password Reset)

**Problem**: Reset email not arriving

**Solutions**:
1. Check spam/junk folder
2. In Supabase → Authentication → Email Templates, check if templates are configured
3. For development, check Supabase logs in dashboard
4. Supabase free tier has email rate limits - wait a few minutes and try again

---

## 📝 Configuration Checklist

Before moving to Phase 3:

- [ ] Supabase project created
- [ ] Project URL and anon key copied
- [ ] js/supabase.js updated with credentials
- [ ] Email authentication enabled
- [ ] Email confirmation disabled (for dev)
- [ ] Test user created manually
- [ ] Can login successfully
- [ ] Email appears in dashboard
- [ ] Can logout successfully
- [ ] Public signup disabled
- [ ] Password reset tested

---

## 🎉 What's Working Now (Phase 2)

✅ **Authentication**
- Login with email/password
- Logout
- Password reset via email
- Session management
- Auto-redirect (login ↔ dashboard)

✅ **User Profile**
- Display user email
- Display username (from email)
- Session persistence

✅ **Security**
- Public registration disabled
- Only manually created users can access
- Secure session tokens
- HTTPS communication with Supabase

---

## 📚 Next Steps

After Phase 2 is working:

**Phase 3**: Database Setup
- Create tables (profiles, files, folders, favorites, file_shares)
- Configure Row Level Security (RLS)
- Set up storage bucket
- Create database policies

---

## 💡 Tips

1. **Save your credentials**: Keep your Supabase URL and key somewhere safe
2. **Never commit keys to git**: The .gitignore is already set up to protect you
3. **Use environment variables in production**: For hosted versions
4. **Enable email confirmation in production**: More secure
5. **Monitor usage**: Check Supabase dashboard for usage statistics

---

## 🆘 Still Stuck?

Common issues:
1. Make sure Supabase project is fully initialized (no loading spinner in dashboard)
2. Try clearing browser cache
3. Check browser console for detailed error messages
4. Verify credentials are correct (no typos)
5. Test in incognito mode to rule out extension conflicts

---

**Ready?** Follow the Quick Setup steps above and you'll be authenticated in 5 minutes! 🚀
