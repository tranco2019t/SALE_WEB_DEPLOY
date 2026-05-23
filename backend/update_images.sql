UPDATE products 
SET "Image_url" = 'uploads/' || "Image_url" 
WHERE "Image_url" IS NOT NULL 
  AND "Image_url" NOT LIKE 'http://%' 
  AND "Image_url" NOT LIKE 'https://%' 
  AND "Image_url" NOT LIKE 'uploads/%';
