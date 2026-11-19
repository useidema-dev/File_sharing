# ⚡ Quick Fix - Login 500 Error

## Problem
"Database error querying schema" - Users exist but profiles don't exist in database.

---

## Solution (5 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard
2. Select your project: `ihkmknmglbqhywoswkwn`
3. Click **SQL Editor** in left sidebar
4. Click **New Query**

---

### Step 2: Copy & Run This SQL

```sql
-- Create profiles for existing users
INSERT INTO public.profiles (id, email, full_name, storage_used, storage_limit)
SELECT 
    u.id,
    u.email,
    CASE 
        WHEN u.email = 'rahul@myvault.com' THEN 'Rahul'
        WHEN u.email = 'bablu@myvault.com' THEN 'Bablu'
        WHEN u.email = 'balwinder@myvault.com' THEN 'Balwinder'
        ELSE split_part(u.email, '@', 1)
    END as full_name,
    0 as storage_used,
    53687091200 as storage_limit
FROM auth.users u
WHERE u.email IN ('rahul@myvault.com', 'bablu@myvault.com', 'balwinder@myvault.com')
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
  );
```

Click **RUN** button (or Ctrl+Enter)

**Expected Output**: `INSERT 0 3` (3 rows created)

---

### Step 3: Verify It Worked

Run this query:

```sql
SELECT email, full_name, storage_used 
FROM public.profiles 
WHERE email IN ('rahul@myvault.com', 'bablu@myvault.com', 'balwinder@myvault.com');
```

**Expected Output**: 3 rows showing:
- rahul@myvault.com | Rahul | 0
- bablu@myvault.com | Bablu | 0  
- balwinder@myvault.com | Balwinder | 0

---

### Step 4: Test Login

1. Go back to your app: http://localhost:3000
2. Hard refresh: **Ctrl + Shift + R**
3. Login with:
   - Email: `bablu@myvault.com`
   - Password: `Bablu@123`

✅ **Should work now!**

---

## Optional: Fix for Future Users

If you want auto-profile creation for NEW users, run `FIX_TRIGGER.sql` in SQL Editor.

This will automatically create profiles when you add new users in the future.

---

## Still Not Working?

Check browser console (F12) for exact error message and share screenshot.

---

## Files I Created for You

1. **TEST_AND_FIX.sql** - Complete diagnostic + fix
2. **FIX_TRIGGER.sql** - Auto-profile creation for future users  
3. **QUICK_FIX_STEPS.md** - This file (simple steps)

**Just run Step 2 SQL and you're done!** 🚀
