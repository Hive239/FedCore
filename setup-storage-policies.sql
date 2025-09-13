-- Storage policies for project-photos bucket
-- Run this in your Supabase SQL editor to enable photo uploads

-- Allow authenticated users to upload photos
CREATE POLICY "Allow authenticated users to upload photos" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'project-photos' 
        AND auth.role() = 'authenticated'
    );

-- Allow public read access to photos
CREATE POLICY "Allow public to read photos" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'project-photos');

-- Allow users to delete their own uploaded photos (optional)
CREATE POLICY "Allow users to delete their own photos" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'project-photos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );