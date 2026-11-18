# Fix Login 500 Error

## Current Problem
- **Error**: `POST .../auth/v1/token?grant_type=password 500 (Internal Server Error)`
- **Cause**: The database trigger that creates profiles might be failing

## Solution: Check & Fix Database Trigger

### Step 1: Verify the Trigger Exists

Go to Supabase Dashboard → SQL Editor → New Query, and run:

```sql
-- Check if trigger exists
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**Expected result**: Should show 1 row with the trigger name.

---

### Step 2: Recreate the Trigger (Fix)

If the trigger is missing or broken, run this SQL:

```sql
-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop existing function if any
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE WARNING 'Failed to create profile: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```

This adds error handling so login won't fail if profile creation fails.

---

### Step 3: Manually Create Profiles for Existing Users

The 3 users (Rahul, Bablu, Balwinder) were created before the trigger existed, so they don't have profiles. Create them manually:

```sql
-- Insert profiles for existing users
INSERT INTO public.profiles (id, email, full_name)
SELECT 
    id,
    email,
    split_part(email, '@', 1) as full_name
FROM auth.users
WHERE email IN ('rahul@myvault.com', 'bablu@myvault.com', 'balwinder@myvault.com')
ON CONFLICT (id) DO NOTHING;
```

---

### Step 4: Add Storage Policies

Go to **Storage** → Click on `file_store` bucket → **Policies** tab → **New policy** button

Add these 4 policies (click "New policy" → "For full customization" for each):

#### Policy 1: Upload
```sql
CREATE POLICY "Users can upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'file_store' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy 2: View
```sql
CREATE POLICY "Users can view files"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'file_store' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy 3: Update
```sql
CREATE POLICY "Users can update files"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'file_store' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy 4: Delete
```sql
CREATE POLICY "Users can delete files"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'file_store' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

### Step 5: Update Code to Use Correct Bucket Name

The storage bucket is named `file_store` (not `files`). Let me update the code...

---

## After Running These Steps

1. The trigger will work for new users
2. Existing users will have profiles
3. Login should work without 500 error
4. File upload will work with proper policies

Try logging in again with:
- Email: `bablu@myvault.com`
- Password: `Bablu@123`

---

## Quick Test Query

After step 3, verify profiles exist:

```sql
SELECT id, email, full_name, storage_used 
FROM public.profiles;
```

Should show 3 rows (Rahul, Bablu, Balwinder).
