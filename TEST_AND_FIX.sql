-- ============================================
-- TEST & FIX: MyVault Database Setup & Login 500
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- Step 1: Fix NULL token fields in auth.users
-- (GoTrue throws "Database error querying schema" if these columns are NULL instead of '')
UPDATE auth.users
SET 
    confirmation_token = COALESCE(confirmation_token, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    recovery_token = COALESCE(recovery_token, '')
WHERE 
    confirmation_token IS NULL 
    OR email_change IS NULL 
    OR email_change_token_new IS NULL 
    OR recovery_token IS NULL;

-- Step 2: Check users in auth.users
SELECT 'Users in auth.users:' as check_type;
SELECT id, email, created_at, confirmation_token, recovery_token
FROM auth.users 
WHERE email IN ('rahul@myvault.com', 'bablu@myvault.com', 'balwinder@myvault.com')
ORDER BY email;

-- Step 3: Ensure profiles exist for existing users
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
    53687091200 as storage_limit -- 50GB default
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- Step 4: Verify profiles exist
SELECT 'Final verification - All profiles:' as check_type;
SELECT p.email, p.full_name, p.storage_used, p.storage_limit
FROM public.profiles p
WHERE p.email IN ('rahul@myvault.com', 'bablu@myvault.com', 'balwinder@myvault.com')
ORDER BY p.email;
