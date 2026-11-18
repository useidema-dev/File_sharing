# MyVault Database Setup Guide

## Current Error
**"Database error querying schema"** - This happens because the database tables haven't been created yet in Supabase.

---

## Setup Steps (5-10 minutes)

### Step 1: Run Database Schema

1. Open your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (URL: `ihkmknmglbqhywoswkwn.supabase.co`)
3. Click **SQL Editor** in the left sidebar
4. Click **New Query** button
5. Open the file `supabase/schema.sql` from this project
6. Copy **all** the SQL code (Ctrl+A, Ctrl+C)
7. Paste it into the Supabase SQL Editor
8. Click **Run** (or press Ctrl+Enter)

✅ **Expected result**: "Success. No rows returned"

This creates:
- 4 tables: `profiles`, `files`, `folders`, `file_shares`
- All RLS (Row Level Security) policies
- Automatic triggers for storage tracking
- Database indexes for performance

---

### Step 2: Create Storage Bucket

1. In Supabase Dashboard, click **Storage** in the left sidebar
2. Click **New Bucket**
3. Enter these settings:
   - **Name**: `files`
   - **Public bucket**: OFF (keep it private)
   - **Allowed MIME types**: Leave empty (allow all)
4. Click **Create Bucket**

✅ **Expected result**: You see a bucket named "files" in the list

---

### Step 3: Add Storage Policies

1. Click on the **files** bucket you just created
2. Click the **Policies** tab at the top
3. Click **New Policy** button
4. Choose **For full customization** option

Add these 4 policies one by one:

#### Policy 1: Upload (INSERT)
```sql
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);
```

#### Policy 2: View (SELECT)
```sql
CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);
```

#### Policy 3: Update (UPDATE)
```sql
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);
```

#### Policy 4: Delete (DELETE)
```sql
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);
```

✅ **Expected result**: 4 policies visible in the Policies tab

---

### Step 4: Verify Database Tables

1. In Supabase Dashboard, go to **Table Editor**
2. You should see these tables:
   - ✅ profiles
   - ✅ files
   - ✅ folders
   - ✅ file_shares

---

### Step 5: Test the Application

```powershell
# If you haven't installed dependencies yet:
npm install

# Start the development server:
npm run dev
```

The app will open at: http://localhost:3000

---

## Test Accounts

Three users are already created in Supabase:

| Name | Email | Password |
|------|-------|----------|
| Rahul | rahul@myvault.com | Rahul@123 |
| Bablu | bablu@myvault.com | Bablu@123 |
| Balwinder | balwinder@myvault.com | Balwinder@123 |

Try logging in with any of these accounts!

---

## Troubleshooting

### Error: "Database error querying schema"
- ❌ Database tables not created
- ✅ Solution: Complete Step 1 above

### Error: "Storage bucket not found"
- ❌ Storage bucket not created
- ✅ Solution: Complete Step 2 above

### Files won't upload
- ❌ Storage policies missing
- ✅ Solution: Complete Step 3 above

### Login successful but dashboard is empty
- ✅ This is normal! You haven't uploaded any files yet
- Just click "Upload Files" and add some test files

---

## What Each Table Does

- **profiles**: Stores user info (name, avatar, storage usage)
- **files**: Stores file metadata (name, size, type, location)
- **folders**: Stores folder structure for organizing files
- **file_shares**: Stores shareable links for files (future feature)

---

## Next Steps After Setup

Once the database is working:

1. ✅ Test file upload
2. ✅ Test folder creation
3. ✅ Test file download
4. ✅ Test marking files as favorite
5. ✅ Test storage usage tracking

---

## Need Help?

If you get stuck, check:
1. Supabase Dashboard → SQL Editor → History (to see if schema was applied)
2. Browser Console (F12) for specific error messages
3. Supabase Dashboard → Table Editor (to verify tables exist)

Your Supabase Project URL: https://ihkmknmglbqhywoswkwn.supabase.co
