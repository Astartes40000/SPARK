-- Create storage bucket for post images
insert into storage.buckets (id, name, public) values ('post-images', 'post-images', true);

-- Allow authenticated users to upload images
create policy "Authenticated users can upload images" on storage.objects
  for insert with check (bucket_id = 'post-images' and auth.role() = 'authenticated');

-- Allow public to view images
create policy "Images are publicly viewable" on storage.objects
  for select using (bucket_id = 'post-images');

-- Allow users to delete their own images
create policy "Users can delete own images" on storage.objects
  for delete using (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);
