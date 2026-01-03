// ensure env vars are loaded when this module is required directly
require('dotenv').config()
const cloudinary = require('cloudinary').v2;

// Prefer a single CLOUDINARY_URL if provided, otherwise use individual vars
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ url: process.env.CLOUDINARY_URL })
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET || ''
  })
}

// helper wrapper that logs errors when uploads fail
async function uploadImage(source, options = {}) {
  try {
    const res = await cloudinary.uploader.upload(source, options)
    return res
  } catch (err) {
    console.error('Cloudinary upload error:', err && err.message ? err.message : err)
    // rethrow so callers can handle it as well
    throw err
  }
}

module.exports = { cloudinary, uploadImage };
