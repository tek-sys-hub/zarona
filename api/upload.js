// =============================================================================
//  POST /api/upload — Upload product image to Supabase Storage (admin only)
// =============================================================================

import { supabaseAdmin } from './_supabase.js';
import { handleCors, verifyAdmin, sendError, sendSuccess } from './_middleware.js';

// Parse multipart form data manually (Vercel serverless)
import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';

// Disable Vercel's default body parser so we can handle raw stream
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed. Use POST.');
  }

  const { user, error: authError } = await verifyAdmin(req);
  if (authError) return sendError(res, 401, authError);

  return new Promise((resolve) => {
    const form = new IncomingForm({
      maxFileSize: 10 * 1024 * 1024, // 10MB max
      keepExtensions: true,
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        res.status(400).json({ success: false, error: 'Failed to parse form data' });
        return resolve();
      }

      const file = Array.isArray(files.image) ? files.image[0] : files.image;
      if (!file) {
        res.status(400).json({ success: false, error: 'No image file provided (field name: image)' });
        return resolve();
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.mimetype)) {
        res.status(400).json({ success: false, error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' });
        return resolve();
      }

      // Build a clean unique filename
      const ext = path.extname(file.originalFilename || '.jpg');
      const filename = `products/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

      const fileBuffer = fs.readFileSync(file.filepath);

      const { data, error: uploadError } = await supabaseAdmin.storage
        .from('product-images')
        .upload(filename, fileBuffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      // Cleanup temp file
      fs.unlinkSync(file.filepath);

      if (uploadError) {
        res.status(500).json({ success: false, error: uploadError.message });
        return resolve();
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('product-images')
        .getPublicUrl(data.path);

      res.status(201).json({
        success: true,
        url: urlData.publicUrl,
        path: data.path,
      });
      resolve();
    });
  });
}
