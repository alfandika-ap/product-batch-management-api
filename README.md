# Carabao Product Management API

A Node.js API for product authentication using advanced hologram stickers and QR-code + 6-digit PIN technology.

## Features

- Product authentication with QR codes and PIN verification
- Batch management for product items
- Encrypted download URLs for batch files
- JWT-based authentication
- MySQL database with Drizzle ORM

## API Endpoints

### Batch Management

#### Get Encrypted Download URL

```http
POST /api/batches/:id/download
Authorization: Bearer <token>
```

Returns an encrypted download URL for batch QR codes.

**Response:**

```json
{
  "success": true,
  "message": "Download URL generated successfully",
  "data": {
    "downloadUrl": "encrypted_token_string",
    "expiresIn": "24 hours",
    "instructions": "Use this encrypted URL to download the file. The URL will expire after 24 hours."
  }
}
```

#### Download File with Encrypted Token

```http
GET /api/batches/:id/download-file?token=<encrypted_token>
```

Downloads the actual batch file using the encrypted token.

**Features:**

- Token is encrypted using AES-256-CBC
- URL validation ensures token is valid for specific batch
- Automatic file cleanup after download
- Secure access control

## Security Features

- All download URLs are encrypted using AES-256-CBC
- Token validation prevents unauthorized access
- URL-specific validation ensures tokens can only be used for intended batches
- Automatic token expiration handling

## Installation

```bash
bun install
```

## Environment Variables

Create a `.env` file based on `env.example`:

```env
DATABASE_URL=mysql://user:password@localhost:3306/carabao_db
JWT_SECRET=your-super-secret-jwt-key-32-chars-minimum
PORT=3000
NODE_ENV=development
```

## Running the Application

```bash
# Development
bun run dev

# Production
bun run start
```

## Database Migrations

```bash
bun run db:migrate
```
