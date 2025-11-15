# Profile Picture Upload Service

## Overview

The profile picture upload service provides functionality to upload, process, and manage user profile pictures with AWS S3 storage.

## Features

- **File Validation**: Validates file size (max 5MB) and format (JPEG, PNG only)
- **Image Processing**: Automatically resizes images to 500x500 pixels using sharp
- **S3 Storage**: Uploads processed images to AWS S3 with public read access
- **Old Picture Cleanup**: Automatically deletes old profile pictures when new ones are uploaded
- **Error Handling**: Comprehensive error handling with descriptive error codes

## Configuration

Add the following environment variables to your `.env` file:

```env
# Storage Configuration (AWS S3)
S3_BUCKET=mssu-connect-uploads
S3_REGION=ap-south-1
S3_ACCESS_KEY_ID=your_s3_access_key
S3_SECRET_ACCESS_KEY=your_s3_secret_key
```

## Usage

### Upload Profile Picture

```javascript
import { uploadProfilePicture } from './services/userService.js';

// File object structure (typically from multer middleware)
const file = {
  buffer: Buffer,      // File buffer
  size: Number,        // File size in bytes
  mimetype: String,    // MIME type (e.g., 'image/jpeg', 'image/png')
  originalname: String // Original filename
};

try {
  const updatedUser = await uploadProfilePicture(userId, file);
  console.log('Profile picture URL:', updatedUser.profile_picture_url);
} catch (error) {
  console.error('Upload failed:', error.message);
}
```

### Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `FILE_TOO_LARGE` | 400 | File size exceeds 5MB limit |
| `INVALID_FILE_FORMAT` | 400 | File format is not JPEG or PNG |
| `USER_NOT_FOUND` | 404 | User does not exist |

### File Requirements

- **Maximum Size**: 5MB
- **Allowed Formats**: JPEG, JPG, PNG
- **Output Format**: JPEG (converted automatically)
- **Output Dimensions**: 500x500 pixels (cropped to fit)
- **Output Quality**: 85% JPEG quality

## S3 Storage Structure

Profile pictures are stored in S3 with the following key pattern:

```
profiles/{userId}/{timestamp}-{randomString}.jpg
```

Example:
```
profiles/d71fb81b-c8e3-43e3-877e-73cc7aa11b52/1705320000000-a1b2c3d4e5f6g7h8.jpg
```

## Image Processing

The service uses the `sharp` library to:
1. Resize images to 500x500 pixels
2. Crop to fit (centered)
3. Convert to JPEG format
4. Apply 85% quality compression
5. Enable progressive JPEG for better loading

## Testing

Run the test script to verify the implementation:

```bash
node src/scripts/test-profile-picture-upload.js
```

The test script validates:
- File size validation
- File format validation
- Missing file handling
- Invalid user ID handling
- S3 upload functionality (requires AWS credentials)

## Integration with Controllers

Example controller implementation:

```javascript
import multer from 'multer';
import { uploadProfilePicture } from '../services/userService.js';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Controller endpoint
export const uploadProfilePictureController = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const file = req.file; // From multer middleware

    if (!file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_REQUIRED',
          message: 'Profile picture file is required',
        },
      });
    }

    const updatedUser = await uploadProfilePicture(userId, file);

    res.status(200).json({
      success: true,
      data: {
        profile_picture_url: updatedUser.profile_picture_url,
      },
      message: 'Profile picture uploaded successfully',
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message,
      },
    });
  }
};

// Route
router.post('/profile/picture', authenticate, upload.single('picture'), uploadProfilePictureController);
```

## Security Considerations

1. **File Validation**: Always validate file size and format before processing
2. **Public Access**: Profile pictures are publicly accessible via S3 URLs
3. **Unique Filenames**: Timestamps and random strings prevent filename collisions
4. **Old Picture Cleanup**: Old pictures are automatically deleted to save storage
5. **Error Sanitization**: Error messages don't expose internal system details

## Performance

- **Image Processing**: ~100-200ms for typical profile pictures
- **S3 Upload**: ~200-500ms depending on network and file size
- **Total Time**: ~300-700ms for complete upload operation

## Troubleshooting

### AWS Credentials Not Configured

If you see errors about missing AWS credentials:
1. Ensure `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` are set in `.env`
2. Verify the credentials have S3 write permissions
3. Check that the S3 bucket exists and is accessible

### Image Processing Errors

If sharp fails to process images:
1. Ensure the file is a valid image format
2. Check that sharp is properly installed: `npm install sharp`
3. Verify the image is not corrupted

### S3 Upload Failures

If uploads fail:
1. Verify S3 bucket name and region are correct
2. Check IAM permissions for the access key
3. Ensure the bucket allows public read access for uploaded objects
4. Check network connectivity to AWS S3

## Dependencies

- `sharp`: Image processing and resizing
- `@aws-sdk/client-s3`: AWS S3 client
- `@aws-sdk/lib-storage`: AWS S3 multipart upload support
- `crypto`: Generate unique filenames

## Future Enhancements

- [ ] Support for additional image formats (WebP, AVIF)
- [ ] Multiple image sizes (thumbnail, medium, large)
- [ ] Image optimization for web delivery
- [ ] CDN integration for faster delivery
- [ ] Image moderation/content filtering
- [ ] Batch upload support
