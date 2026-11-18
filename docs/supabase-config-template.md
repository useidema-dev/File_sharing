# Supabase Configuration Template

## 📋 Fill in your credentials below and update js/supabase.js

### Your Supabase Credentials

```
Project Name: _______________________

Project URL: https://_________________.supabase.co

Anon Public Key: eyJ_________________________________
(Starts with eyJ, very long string)

Database Password: _______________________
(Keep this safe! You'll need it for direct database access)
```

### Where to Find These:

1. **Project URL & Keys**:
   - Supabase Dashboard → Settings → API
   - Under "Project API keys"

2. **Database Password**:
   - You set this when creating the project
   - Can reset in: Settings → Database → Reset database password

---

## 🔧 How to Configure

### Option 1: Direct Edit (Simplest)

1. Open `js/supabase.js`
2. Replace:
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL';
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
   ```
   
3. With your actual values:
   ```javascript
   const SUPABASE_URL = 'https://yourproject.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
   ```

### Option 2: Environment File (Production)

For production deployment, use environment variables:

1. Create `.env` file (already in .gitignore):
   ```
   VITE_SUPABASE_URL=https://yourproject.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. Update build process to inject these values

---

## ⚠️ Security Reminders

### ✅ DO:
- Use the **anon** public key in frontend code
- Keep database password private
- Disable public signup (Auth → Providers → Email → Disable Signup)
- Enable Row Level Security on all tables (Phase 3)
- Use environment variables in production

### ❌ DON'T:
- Commit credentials to git
- Share your service_role key
- Use service_role key in frontend
- Leave public signup enabled for personal use
- Skip RLS policies

---

## 🧪 Test Your Configuration

After updating credentials, open browser console and check:

```javascript
// Should log your Supabase URL
console.log('Supabase URL:', SUPABASE_URL);

// Should show initialized client
console.log('Supabase client:', supabase);
```

You should see:
```
✅ Supabase client initialized successfully
```

If you see:
```
⚠️ Supabase credentials not configured
```
Then you haven't updated the credentials yet!

---

## 📊 Project Information Template

Keep this information for your records:

```
==========================================
MyVault - Supabase Project Info
==========================================

Project Name: ____________________
Project URL: _____________________
Created: _________________________
Region: __________________________

Database:
- Name: ____________________
- Password: ________________ (KEEP SAFE!)

API Keys:
- Anon: eyJ__________________ (Frontend - OK to use)
- Service Role: eyJ___________ (Backend only - DO NOT EXPOSE)

Authentication:
- Email Signup: [X] Disabled (Personal use only)
- Email Confirmation: [X] Disabled (For dev)
- Users: Manually created

Storage:
- Bucket Name: files (to be created in Phase 4)
- Bucket Type: Private
- Max File Size: 50MB (configurable)

==========================================
```

---

## 🎯 Quick Verification Checklist

Before testing:
- [ ] Copied Project URL
- [ ] Copied anon public key (not service_role)
- [ ] Updated js/supabase.js with real values
- [ ] Removed quotes around "YOUR_SUPABASE_URL"
- [ ] URL starts with https://
- [ ] Key starts with eyJ
- [ ] Saved the file

---

## 🔄 What Happens After Configuration

Once configured:
1. `login.html` will authenticate against your Supabase project
2. Users can login with email/password
3. Sessions are managed automatically
4. Users stay logged in across browser refreshes
5. Logout works correctly

---

**Next**: Follow `PHASE_2_SETUP.md` for complete setup instructions!
