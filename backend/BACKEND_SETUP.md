# Backend Setup Guide

This guide will help you set up and use the MongoDB backend for your volunteer platform.

## MongoDB Setup Options

### Option 1: MongoDB Atlas (Cloud - Recommended for Production)

1. **Create a free account** at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

2. **Create a new cluster:**
   - Click "Build a Database"
   - Choose "FREE" shared tier
   - Select your preferred cloud provider and region
   - Click "Create Cluster"

3. **Set up database access:**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Create a username and password
   - Set permissions to "Read and write to any database"

4. **Set up network access:**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - For development, click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production, add your specific IP addresses

5. **Get your connection string:**
   - Go to "Database" and click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `volunteer-platform`

   Example:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/volunteer-platform?retryWrites=true&w=majority
   ```

6. **Update .env.local:**
   ```bash
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/volunteer-platform?retryWrites=true&w=majority
   ```

### Option 2: Local MongoDB (For Development)

1. **Install MongoDB:**
   - **macOS:** `brew install mongodb-community`
   - **Windows:** Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
   - **Linux:** Follow [official installation guide](https://docs.mongodb.com/manual/administration/install-on-linux/)

2. **Start MongoDB:**
   ```bash
   # macOS/Linux
   brew services start mongodb-community

   # Or manually
   mongod --config /usr/local/etc/mongod.conf
   ```

3. **Update .env.local:**
   ```bash
   MONGODB_URI=mongodb://localhost:27017/volunteer-platform
   ```

## Testing the API

### Using the Browser

You can test GET endpoints directly in your browser:
```
http://localhost:3000/api/users
http://localhost:3000/api/organizations
http://localhost:3000/api/opportunities
```

### Using cURL

**Create a new user:**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "role": "volunteer"
  }'
```

**Get all users:**
```bash
curl http://localhost:3000/api/users
```

**Create an organization:**
```bash
curl -X POST http://localhost:3000/api/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Community Food Bank",
    "description": "Providing food assistance since 1985",
    "category": "Food & Hunger",
    "email": "info@foodbank.org",
    "adminUserId": "USER_ID_HERE"
  }'
```

### Using Postman or Insomnia

1. Import the API collection from `API_DOCUMENTATION.md`
2. Set base URL to `http://localhost:3000/api`
3. Start making requests!

## Common Database Operations

### View Your Data

**Using MongoDB Compass (GUI):**
1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect using your connection string
3. Browse your collections visually

**Using MongoDB Shell:**
```bash
# Connect to local MongoDB
mongosh

# Switch to your database
use volunteer-platform

# View collections
show collections

# View users
db.users.find().pretty()

# View opportunities
db.opportunities.find().pretty()
```

### Clear All Data (Development Only)

```bash
# Connect to MongoDB shell
mongosh volunteer-platform

# Drop all collections
db.users.drop()
db.organizations.drop()
db.opportunities.drop()
db.applications.drop()
```

## API Testing Workflow

1. **Create a User** (volunteer or organization admin)
2. **Create an Organization** (use the user ID from step 1 as adminUserId)
3. **Create Opportunities** (use the organization ID from step 2)
4. **Create Applications** (volunteers apply to opportunities)

## Security Best Practices

### For Development:
- Use a separate database for development and production
- Never commit `.env.local` to version control
- Use strong passwords for database users

### For Production:
- Use environment variables for sensitive data
- Implement JWT authentication (future enhancement)
- Set up proper CORS policies
- Use IP whitelisting in MongoDB Atlas
- Enable encryption at rest
- Implement rate limiting
- Regular backups

## Troubleshooting

### "MONGODB_URI is not defined"
- Make sure `.env.local` exists in the root directory
- Verify the variable name is exactly `MONGODB_URI`
- Restart the Next.js dev server after changing env variables

### "Connection timeout"
- Check if MongoDB is running (for local)
- Verify network access settings in MongoDB Atlas
- Check if your IP address is whitelisted

### "Authentication failed"
- Verify username and password in connection string
- Check if database user has proper permissions
- Make sure special characters in password are URL-encoded

### "Module not found: mongoose"
- Run `npm install` to install dependencies
- Check if mongoose is in package.json

## Next Steps

1. Test all API endpoints using the examples in `API_DOCUMENTATION.md`
2. Set up authentication (JWT) for secure access
3. Implement authorization (role-based access control)
4. Add data validation middleware
5. Set up automated tests
6. Configure production database with proper security

## Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [MongoDB Atlas Free Tier](https://www.mongodb.com/cloud/atlas/register)
