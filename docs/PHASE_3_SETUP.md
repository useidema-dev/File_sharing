# Phase 3: Database Setup Guide

## 🎯 Phase 3 Overview

Create database tables with Row Level Security to store file metadata, folders, and user profiles.

**What You'll Do**:
1. Run SQL schema in Supabase
2. Create storage bucket
3. Configure storage policies
4. Test database setup

**Time Required**: 5-10 minutes

---

## ✅ Prerequisites

Before starting Phase 3:
- [x] Phase 2 complete (authentication working)
- [x] Can login to dashboard
- [x] Supabase project configured

---

## 📋 Step-by-Step Setup

### Step 1: Run Database Schema

1. **Open Supabase Dashboard**
   - Go to https://supabase.com
   - Open your MyVault project

2. **Open SQL Editor**
   - Click **"SQL Editor"** in left sidebar
   - Click **"New query"**

3. **Copy the Schema**
   - Open `supabase/schema.sql` from your project
   - Copy the **entire contents** (Ctrl+A, Ctrl+C)

4. **Paste and Run**
   - Paste into Supabase SQL Editor
   - Click **"Run"** (or press Ctrl+Enter)
   - Wait for completion (should take 2-5 seconds)

5. **Verify Success**
   - You should see: ✅ Success. No rows returned
   - Or: "Success" with execution details

**Expected Output**:
```
Success. No rows returned
Query executed in XX ms
```

### Step 2: Verify Tables Created

1. **Check Table Editor**
   - Click **"Table Editor"** in left sidebar
   - You should see these tables:
     - ✅ `profiles`
     - ✅ `folders`
     - ✅ `files`
     - ✅ `file_shares`

2. **Check Your Profile**
   - Click on **`profiles`** table
   - You should see **your user** with:
     - Your UUID
     - Your email
     - Storage used: 0
     - Storage limit: 53687091200 (50GB)

> **Note**: Your profile was auto-created by the trigger when you logged in!

### Step 3: Create Storage Bucket

1. **Open Storage**
   - Click **"Storage"** in left sidebar
   - Click **"New bucket"**

2. **Configure Bucket**
   - **Name**: `files`
   - **Public bucket**: ❌ **OFF** (very important!)
   - Click **"Create bucket"**

3. **Verify Creation**
   - You should see the `files` bucket in the list
   - It should show 🔒 (private icon)

### Step 4: Configure Storage Policies

1. **Open Bucket Policies**
   - Click on the **`files`** bucket
   - Click **"Policies"** tab
   - Click **"New policy"**

2. **Create Upload Policy**
   - Click **"Create a policy from scratch"**
   - Or use **"For full customization"**
   
   **Policy Name**: `Users can upload own files`
   
   **Allowed operation**: `INSERT`
   
   **Target roles**: `authenticated`
   
   **USING expression**: (leave empty)
   
   **WITH CHECK expression**:
   ```sql
   (bucket_id = 'files'::text) AND 
   ((auth.uid())::text = (storage.foldername(name))[1])
   ```
   
   - Click **"Review"** → **"Save policy"**

3. **Create View/Download Policy**
   
   **Policy Name**: `Users can view own files`
   
   **Allowed operation**: `SELECT`
   
   **Target roles**: `authenticated`
   
   **USING expression**:
   ```sql
   (bucket_id = 'files'::text) AND 
   ((auth.uid())::text = (storage.foldername(name))[1])
   ```
   
   - Click **"Review"** → **"Save policy"**

4. **Create Update Policy**
   
   **Policy Name**: `Users can update own files`
   
   **Allowed operation**: `UPDATE`
   
   **Target roles**: `authenticated`
   
   **USING expression**:
   ```sql
   (bucket_id = 'files'::text) AND 
   ((auth.uid())::text = (storage.foldername(name))[1])
   ```
   
   - Click **"Review"** → **"Save policy"**

5. **Create Delete Policy**
   
   **Policy Name**: `Users can delete own files`
   
   **Allowed operation**: `DELETE`
   
   **Target roles**: `authenticated`
   
   **USING expression**:
   ```sql
   (bucket_id = 'files'::text) AND 
   ((auth.uid())::text = (storage.foldername(name))[1])
   ```
   
   - Click **"Review"** → **"Save policy"**

### Step 5: Verify RLS is Enabled

1. **Check Table Policies**
   - Go to **Authentication** → **Policies**
   - Or **Table Editor** → Select table → **Policies** tab

2. **Verify Each Table Has Policies**:
   
   **profiles** should have:
   - ✅ Users can view own profile
   - ✅ Users can insert own profile
   - ✅ Users can update own profile

   **folders** should have:
   - ✅ Users can view own folders
   - ✅ Users can create own folders
   - ✅ Users can update own folders
   - ✅ Users can delete own folders

   **files** should have:
   - ✅ Users can view own files
   - ✅ Users can upload own files
   - ✅ Users can update own files
   - ✅ Users can delete own files

   **file_shares** should have:
   - ✅ Users can view own file shares
   - ✅ Users can create own file shares
   - ✅ Users can update own file shares
   - ✅ Users can delete own file shares

---

## 🧪 Testing the Database

### Test 1: Profile Auto-Creation

1. **Check Your Profile**:
   ```sql
   SELECT * FROM profiles WHERE id = auth.uid();
   ```
   
   Expected: Should show your profile with your email

### Test 2: Create a Test Folder

1. **Go to SQL Editor**
2. **Run this query**:
   ```sql
   INSERT INTO folders (user_id, name)
   VALUES (auth.uid(), 'Test Folder')
   RETURNING *;
   ```
   
   Expected: Should return the created folder

### Test 3: Query Your Folders

1. **Run this query**:
   ```sql
   SELECT * FROM folders WHERE user_id = auth.uid();
   ```
   
   Expected: Should show your "Test Folder"

### Test 4: Try to Access Another User's Data (Should Fail)

1. **Run this query**:
   ```sql
   -- Try to query all folders (should only see yours)
   SELECT * FROM folders;
   ```
   
   Expected: Should only show YOUR folders, not other users'

### Test 5: Check Storage Stats

1. **Run this query**:
   ```sql
   SELECT 
       email,
       storage_used,
       storage_limit,
       ROUND((storage_used::numeric / storage_limit * 100)::numeric, 2) as usage_percent
   FROM profiles
   WHERE id = auth.uid();
   ```
   
   Expected: Should show 0 bytes used, 50GB limit, 0% usage

---

## 📊 Database Schema Overview

### Tables Created

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| **profiles** | User profile data | storage_used, storage_limit |
| **folders** | Folder organization | name, parent_id, color |
| **files** | File metadata | original_name, storage_path, file_size |
| **file_shares** | Share links | share_token, expires_at, is_active |

### Automatic Features

✅ **Auto-increment** IDs (UUID)  
✅ **Timestamps** (created_at, updated_at)  
✅ **Storage tracking** (auto-updated on file upload/delete)  
✅ **Profile creation** (auto-created on signup)  
✅ **Soft delete** for files (trash functionality)  
✅ **Row Level Security** on all tables  

### Indexes Created

Performance indexes on:
- User ID (all tables)
- Created dates
- Folder parent relationships
- File favorites
- Deleted files (trash)
- Share tokens

---

## 🔒 Security Features

### Row Level Security (RLS)

**What it does**: Automatically filters data so users can only access their own data

**How it works**:
- Every query checks `auth.uid()` (current user)
- Only returns/modifies data where `user_id = auth.uid()`
- Prevents users from seeing each other's files

**Example**:
```sql
-- User A runs this:
SELECT * FROM files;

-- RLS automatically converts it to:
SELECT * FROM files WHERE user_id = 'user-a-uuid';

-- User A will NEVER see User B's files
```

### Storage Policies

**What they do**: Control who can upload/download files from Storage

**How they work**:
- Files stored as: `files/{user_id}/{filename}`
- Policy checks if `auth.uid()` matches the folder name
- Users can only access files in their own folder

---

## 🐛 Troubleshooting

### Issue: "permission denied for table profiles"

**Cause**: RLS is enabled but you're not authenticated

**Solution**:
1. Make sure you're logged in
2. Run queries through your app (not anonymous SQL)
3. Or add `auth.uid()` to your queries

### Issue: "Success. No rows returned" but no tables visible

**Cause**: Script ran but tables in wrong schema

**Solution**:
1. Check if tables are in `public` schema
2. Go to Table Editor → Check schema dropdown
3. Re-run script if needed

### Issue: Storage bucket creation failed

**Cause**: Bucket name already exists or invalid

**Solution**:
1. Use a different name (e.g., `myvault-files`)
2. Update storage path references in code
3. Or delete existing bucket and recreate

### Issue: Can't upload files (403 Forbidden)

**Cause**: Storage policies not configured correctly

**Solutions**:
1. Verify bucket is **private** (not public)
2. Check all 4 policies are created (INSERT, SELECT, UPDATE, DELETE)
3. Verify policy expressions match exactly
4. Make sure you're authenticated

### Issue: Storage usage not updating

**Cause**: Trigger not firing

**Solution**:
1. Check triggers exist:
   ```sql
   SELECT * FROM pg_trigger 
   WHERE tgname LIKE 'update_storage%';
   ```
2. Re-run the schema if triggers missing

---

## ✅ Phase 3 Completion Checklist

Before moving to Phase 4:

- [ ] Ran `schema.sql` successfully
- [ ] All 4 tables visible in Table Editor
- [ ] Your profile exists in `profiles` table
- [ ] Created `files` storage bucket (private)
- [ ] Added all 4 storage policies
- [ ] Verified RLS policies on all tables
- [ ] Tested folder creation
- [ ] Can query own data only
- [ ] Storage usage shows 0 bytes

---

## 📝 What's Next (Phase 4)

After completing Phase 3:

**Phase 4 will add**:
- Storage helper functions
- Upload/download utilities
- File path generation
- Storage quota checks

**Phase 5 will implement**:
- Actual file upload UI
- Progress tracking
- Drag and drop upload
- Multiple file upload

---

## 🎉 Success!

If all checks pass, your database is ready! You now have:

✅ Secure database tables  
✅ Row Level Security protecting data  
✅ Private file storage bucket  
✅ Storage policies enforcing access  
✅ Auto-tracking storage usage  
✅ Folder organization system  
✅ Soft delete (trash) support  
✅ File sharing infrastructure  

**Ready for Phase 4!** 🚀
