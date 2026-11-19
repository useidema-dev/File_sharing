-- =========================================================
-- COMPLETE FIX: FILE SHARING, USER VISIBILITY & AUTO SIGNUP
-- Run this ONCE in Supabase Dashboard → SQL Editor → Click RUN
-- =========================================================

-- 1. Reload schema cache helper & safe tokens
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

-- 2. Add access_type column to public.files
ALTER TABLE public.files 
ADD COLUMN IF NOT EXISTS access_type TEXT NOT NULL DEFAULT 'private' 
CHECK (access_type IN ('private', 'all', 'specific'));

-- 3. Create file_permissions table for specific sharing
CREATE TABLE IF NOT EXISTS public.file_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    granted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(file_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_file_permissions_file_id ON public.file_permissions(file_id);
CREATE INDEX IF NOT EXISTS idx_file_permissions_user_id ON public.file_permissions(user_id);

ALTER TABLE public.file_permissions ENABLE ROW LEVEL SECURITY;

-- Owner can view and manage permissions
DROP POLICY IF EXISTS "File owner can manage permissions" ON public.file_permissions;
CREATE POLICY "File owner can manage permissions"
    ON public.file_permissions
    FOR ALL
    TO authenticated
    USING (
        granted_by = (SELECT auth.uid()) OR 
        EXISTS (
            SELECT 1 FROM public.files f 
            WHERE f.id = file_permissions.file_id AND f.user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        granted_by = (SELECT auth.uid()) OR 
        EXISTS (
            SELECT 1 FROM public.files f 
            WHERE f.id = file_permissions.file_id AND f.user_id = (SELECT auth.uid())
        )
    );

-- Recipient can view permissions granted to them
DROP POLICY IF EXISTS "Users can view permissions granted to them" ON public.file_permissions;
CREATE POLICY "Users can view permissions granted to them"
    ON public.file_permissions
    FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- 4. Update files RLS: View own files, everyone files, or specific shared files
DROP POLICY IF EXISTS "Users can view own files" ON public.files;
DROP POLICY IF EXISTS "Users can view accessible files" ON public.files;

CREATE POLICY "Users can view accessible files"
    ON public.files
    FOR SELECT
    TO authenticated
    USING (
        user_id = (SELECT auth.uid())
        OR access_type = 'all'
        OR EXISTS (
            SELECT 1 FROM public.file_permissions fp
            WHERE fp.file_id = files.id AND fp.user_id = (SELECT auth.uid())
        )
    );

-- 5. CRITICAL: Insert profiles for ALL existing users so they appear in the share picker
INSERT INTO public.profiles (id, email, full_name, storage_used, storage_limit)
SELECT 
    u.id,
    u.email,
    COALESCE(
        u.raw_user_meta_data->>'full_name',
        split_part(u.email, '@', 1)
    ),
    0,
    53687091200
FROM auth.users u
ON CONFLICT (id) DO UPDATE
SET 
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

-- 6. CRITICAL: Allow all authenticated users to view profiles (so other accounts are visible)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- 7. Trigger to automatically create profiles whenever a user signs up via "Create Account"
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, storage_used, storage_limit)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            split_part(NEW.email, '@', 1)
        ),
        0,
        53687091200
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create profile: %', SQLERRM;
        RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 8. Storage policy: Ensure all authenticated users can view/download files
DROP POLICY IF EXISTS "Users can view files in storage" ON storage.objects;
CREATE POLICY "Users can view files in storage"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'file_store');

-- 9. Force Supabase API to reload schema cache immediately
NOTIFY pgrst, 'reload schema';
