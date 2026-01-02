-- Allow authenticated users to upload files to 'nexa-vault'
create policy "Users can upload own files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'nexa-vault' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view files in 'nexa-vault'
create policy "Users can view all files in vault"
on storage.objects for select
to authenticated
using ( bucket_id = 'nexa-vault' );

-- NOTE: If the bucket wasn't created via UI, run this line (remove --):
-- insert into storage.buckets (id, name, public) values ('nexa-vault', 'nexa-vault', true);
