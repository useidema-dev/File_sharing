-- ============================================
-- ADD FILE SHARING & ACCESS CONTROL
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Add access_type column to public.files
-- 'private'   = Only owner can view
-- 'all'       = All registered users can view
-- 'specific'  = Only selected users in file_permissions can view
ALTER TABLE public.files 
ADD COLUMN IF NOT EXISTS access_type TEXT NOT NULL DEFAULT 'private' 
CHECK (access_type IN ('private', 'all', 'specific'));

-- 2. Create file_permissions table for specific user sharing
CREATE TABLE IF NOT EXISTS public.file_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    granted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(file_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_permissions_file_id ON public.file_permissions(file_id);
CREATE INDEX IF NOT EXISTS idx_file_permissions_user_id ON public.file_permissions(user_id);

-- Enable RLS on file_permissions
ALTER TABLE public.file_permissions ENABLE ROW LEVEL SECURITY;

-- Owner can manage permissions for their files
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

-- Users can view permissions granted to them
DROP POLICY IF EXISTS "Users can view permissions granted to them" ON public.file_permissions;
CREATE POLICY "Users can view permissions granted to them"
    ON public.file_permissions
    FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- 3. Update RLS policies on public.files
-- Allow viewing: own files, files shared with all, or files shared with this user
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

-- 4. Allow authenticated users to view profiles (needed to list user names/emails when sharing)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- 5. Storage policy: Ensure authenticated users can view/download files from the storage bucket
DROP POLICY IF EXISTS "Users can view files in storage" ON storage.objects;
CREATE POLICY "Users can view files in storage"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'file_store');
