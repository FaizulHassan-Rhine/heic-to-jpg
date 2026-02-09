// This API route is no longer needed - we use OCR.space API directly from client
// Keeping this file for potential future server-side processing
export default async function handler(req, res) {
  return res.status(200).json({ message: 'Use client-side OCR API' });
}

