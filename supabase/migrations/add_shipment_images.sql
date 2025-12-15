-- Add support for multiple images per shipment
-- Change from single image_url to array of image_urls

-- Add new column for image URLs array
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS image_urls TEXT[];

-- Migrate existing single image_url to array (if any exist)
UPDATE shipments
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL AND image_urls IS NULL;

-- Comment: Can drop old image_url column later if desired
-- ALTER TABLE shipments DROP COLUMN image_url;
