/**
 * MyVault Database Schema
 * Phase 3: Complete Database Implementation
 * 
 * This script creates:
 * 1. User profiles table
 * 2. Folders table for organization
 * 3. Files table for file metadata
 * 4. Favorites table for starred files
 * 5. File shares table for sharing links
 * 6. Row Level Security (RLS) policies
 * 7. Indexes for performance
 * 8. Storage bucket configuration
 * 
 * IMPORTANT: Run this script in your Supabase SQL Editor
 * (Supabase Dashboard → SQL Editor → New Query → Paste → Run)
 */

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
-- Extends auth.users with additional profile information

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    storage_used BIGINT DEFAULT 0,
    storage_limit BIGINT DEFAULT 53687091200, -- 50GB default limit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
-- Users can only view their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. FOLDERS TABLE
-- ============================================
-- Stores folder structure for organizing files

CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    color TEXT DEFAULT '#6366f1', -- Optional folder color
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT folders_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON public.folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON public.folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_created_at ON public.folders(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for folders
-- Users can only view their own folders
CREATE POLICY "Users can view own folders"
    ON public.folders
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own folders
CREATE POLICY "Users can create own folders"
    ON public.folders
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own folders
CREATE POLICY "Users can update own folders"
    ON public.folders
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own folders
CREATE POLICY "Users can delete own folders"
    ON public.folders
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 3. FILES TABLE
-- ============================================
-- Stores file metadata (actual files are in Supabase Storage)

CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    
    -- File information
    original_name TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE, -- Path in Supabase Storage
    file_extension TEXT,
    mime_type TEXT,
    file_size BIGINT NOT NULL DEFAULT 0,
    
    -- File status
    is_favorite BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ, -- Soft delete for trash functionality
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT files_name_not_empty CHECK (length(trim(original_name)) > 0),
    CONSTRAINT files_storage_path_not_empty CHECK (length(trim(storage_path)) > 0),
    CONSTRAINT files_size_positive CHECK (file_size >= 0)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON public.files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON public.files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_is_favorite ON public.files(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_files_deleted_at ON public.files(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_files_mime_type ON public.files(mime_type);
CREATE INDEX IF NOT EXISTS idx_files_file_extension ON public.files(file_extension);

-- Enable Row Level Security
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for files
-- Users can only view their own files
CREATE POLICY "Users can view own files"
    ON public.files
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can upload their own files
CREATE POLICY "Users can upload own files"
    ON public.files
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own files
CREATE POLICY "Users can update own files"
    ON public.files
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own files
CREATE POLICY "Users can delete own files"
    ON public.files
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 4. FAVORITES TABLE (Alternative Approach)
-- ============================================
-- Optional: Separate table for favorites if you prefer
-- Note: We're using is_favorite column in files table instead
-- This is here as an alternative approach

/*
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate favorites
    UNIQUE(user_id, file_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_file_id ON public.favorites(file_id);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
    ON public.favorites FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own favorites"
    ON public.favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
    ON public.favorites FOR DELETE
    USING (auth.uid() = user_id);
*/

-- ============================================
-- 5. FILE SHARES TABLE
-- ============================================
-- For sharing files with expiring links

CREATE TABLE IF NOT EXISTS public.file_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Share configuration
    share_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ,
    max_downloads INT DEFAULT NULL, -- NULL = unlimited
    download_count INT DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT file_shares_token_not_empty CHECK (length(trim(share_token)) > 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_file_shares_file_id ON public.file_shares(file_id);
CREATE INDEX IF NOT EXISTS idx_file_shares_user_id ON public.file_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_file_shares_token ON public.file_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_file_shares_expires_at ON public.file_shares(expires_at);

-- Enable Row Level Security
ALTER TABLE public.file_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for file_shares
-- Users can view their own shares
CREATE POLICY "Users can view own file shares"
    ON public.file_shares
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create shares for their own files
CREATE POLICY "Users can create own file shares"
    ON public.file_shares
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.files
            WHERE files.id = file_shares.file_id
            AND files.user_id = auth.uid()
        )
    );

-- Users can update their own shares
CREATE POLICY "Users can update own file shares"
    ON public.file_shares
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own shares
CREATE POLICY "Users can delete own file shares"
    ON public.file_shares
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 6. FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_folders_updated_at
    BEFORE UPDATE ON public.folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON public.files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create profile on user signup
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile automatically
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to update user storage usage
CREATE OR REPLACE FUNCTION update_user_storage()
RETURNS TRIGGER AS $$
BEGIN
    -- When file is uploaded (INSERT)
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.profiles
        SET storage_used = storage_used + NEW.file_size
        WHERE id = NEW.user_id;
        RETURN NEW;
    
    -- When file is deleted (DELETE)
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.profiles
        SET storage_used = storage_used - OLD.file_size
        WHERE id = OLD.user_id;
        RETURN OLD;
    
    -- When file size is updated (UPDATE)
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE public.profiles
        SET storage_used = storage_used - OLD.file_size + NEW.file_size
        WHERE id = NEW.user_id;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update storage usage
CREATE TRIGGER update_storage_on_file_insert
    AFTER INSERT ON public.files
    FOR EACH ROW
    EXECUTE FUNCTION update_user_storage();

CREATE TRIGGER update_storage_on_file_delete
    AFTER DELETE ON public.files
    FOR EACH ROW
    EXECUTE FUNCTION update_user_storage();

CREATE TRIGGER update_storage_on_file_update
    AFTER UPDATE OF file_size ON public.files
    FOR EACH ROW
    WHEN (OLD.file_size IS DISTINCT FROM NEW.file_size)
    EXECUTE FUNCTION update_user_storage();

-- ============================================
-- 7. HELPER VIEWS (Optional)
-- ============================================

-- View for files not in trash
CREATE OR REPLACE VIEW active_files AS
SELECT * FROM public.files
WHERE deleted_at IS NULL;

-- View for files in trash
CREATE OR REPLACE VIEW trashed_files AS
SELECT * FROM public.files
WHERE deleted_at IS NOT NULL;

-- View for favorite files
CREATE OR REPLACE VIEW favorite_files AS
SELECT * FROM public.files
WHERE is_favorite = TRUE AND deleted_at IS NULL;

-- ============================================
-- 8. STORAGE BUCKET SETUP
-- ============================================
-- Note: Storage buckets are created via Supabase Dashboard or API
-- This is reference SQL for bucket policies

/*
-- Create storage bucket (run in Supabase Dashboard → Storage)
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', false);

-- Storage policies for private file access
-- Users can upload to their own folder
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'files' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'files' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'files' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own files
CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'files' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
*/

-- ============================================
-- COMPLETED!
-- ============================================
-- Database schema is ready for MyVault
-- Next: Configure storage bucket in Supabase Dashboard
-- Then: Proceed to Phase 4 for storage integration
