# API Documentation

This document describes the REST API endpoints available in the volunteer platform backend.

## Base URL

```
http://localhost:3000/api
```

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": {},
  "message": "Optional success message"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Users API

### Get All Users
```
GET /api/users
```

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 10) - Items per page
- `role` (string) - Filter by role: volunteer, organization, admin
- `search` (string) - Search by name or email

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

### Create User
```
POST /api/users
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "volunteer",
  "phone": "555-0123",
  "bio": "Passionate about volunteering",
  "skills": ["Teaching", "Organizing"],
  "interests": ["Education", "Environment"]
}
```

### Get User by ID
```
GET /api/users/:id
```

### Update User
```
PUT /api/users/:id
```

**Body:** Any user fields to update

### Delete User
```
DELETE /api/users/:id
```

---

## Organizations API

### Get All Organizations
```
GET /api/organizations
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `category` (string) - Filter by category
- `verified` (boolean) - Filter by verification status
- `search` (string) - Search by name or description

### Create Organization
```
POST /api/organizations
```

**Body:**
```json
{
  "name": "Community Food Bank",
  "description": "Providing food assistance since 1985",
  "category": "Food & Hunger",
  "email": "info@foodbank.org",
  "phone": "555-0100",
  "website": "https://foodbank.org",
  "adminUserId": "user_id_here",
  "address": {
    "street": "123 Main St",
    "city": "Springfield",
    "state": "CA",
    "zipCode": "12345"
  },
  "mission": "End hunger in our community"
}
```

### Get Organization by ID
```
GET /api/organizations/:id
```

### Update Organization
```
PUT /api/organizations/:id
```

### Delete Organization
```
DELETE /api/organizations/:id
```

---

## Opportunities API

### Get All Opportunities
```
GET /api/opportunities
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `category` (string) - Filter by category
- `status` (string, default: "active") - Filter by status
- `organizationId` (string) - Filter by organization
- `city` (string) - Filter by city
- `isRemote` (boolean) - Filter remote opportunities
- `search` (string) - Search by title or description

### Create Opportunity
```
POST /api/opportunities
```

**Body:**
```json
{
  "title": "Food Bank Volunteer",
  "description": "Help sort and distribute food",
  "organizationId": "org_id_here",
  "category": "Food & Hunger",
  "location": {
    "address": "123 Main St",
    "city": "Springfield",
    "state": "CA",
    "zipCode": "12345",
    "isRemote": false
  },
  "schedule": {
    "type": "recurring",
    "daysOfWeek": ["Saturday"],
    "timeSlots": [
      {
        "startTime": "09:00",
        "endTime": "12:00"
      }
    ]
  },
  "numberOfVolunteers": {
    "needed": 10,
    "current": 0
  },
  "contactPerson": {
    "name": "Jane Smith",
    "email": "jane@foodbank.org",
    "phone": "555-0100"
  },
  "status": "active"
}
```

### Get Opportunity by ID
```
GET /api/opportunities/:id
```

### Update Opportunity
```
PUT /api/opportunities/:id
```

### Delete Opportunity
```
DELETE /api/opportunities/:id
```

---

## Applications API

### Get All Applications
```
GET /api/applications
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `userId` (string) - Filter by user
- `opportunityId` (string) - Filter by opportunity
- `organizationId` (string) - Filter by organization
- `status` (string) - Filter by status: pending, approved, rejected, withdrawn, completed

### Create Application
```
POST /api/applications
```

**Body:**
```json
{
  "userId": "user_id_here",
  "opportunityId": "opportunity_id_here",
  "organizationId": "org_id_here",
  "message": "I'm excited to volunteer!",
  "availability": "Saturdays 9am-12pm",
  "experience": "Previous volunteering experience at...",
  "hoursCommitted": 12
}
```

### Get Application by ID
```
GET /api/applications/:id
```

### Update Application
```
PUT /api/applications/:id
```

**Common updates:**
```json
{
  "status": "approved",
  "reviewedBy": "admin_user_id",
  "reviewNotes": "Great fit for this role!"
}
```

### Delete Application
```
DELETE /api/applications/:id
```

---

## Data Models

### User Model
- email (string, required, unique)
- password (string, required, hashed)
- firstName (string, required)
- lastName (string, required)
- role (enum: volunteer, organization, admin)
- phone (string)
- profileImage (string)
- bio (string, max 500 chars)
- skills (array of strings)
- interests (array of strings)
- availableDays (array of strings)
- hoursVolunteered (number)
- organizationId (ObjectId, ref: Organization)

### Organization Model
- name (string, required, unique)
- description (string, required)
- category (enum, required)
- email (string, required)
- phone (string)
- website (string)
- logo (string)
- address (object)
- adminUserId (ObjectId, required, ref: User)
- mission (string, max 500 chars)
- established (date)
- verified (boolean, default: false)
- volunteerCount (number)
- opportunityCount (number)
- socialMedia (object)

### Opportunity Model
- title (string, required)
- description (string, required)
- organizationId (ObjectId, required, ref: Organization)
- category (enum, required)
- location (object, required)
- schedule (object, required)
- requirements (object)
- numberOfVolunteers (object, required)
- contactPerson (object, required)
- status (enum: active, inactive, completed, cancelled)
- image (string)
- applicationCount (number)

### Application Model
- userId (ObjectId, required, ref: User)
- opportunityId (ObjectId, required, ref: Opportunity)
- organizationId (ObjectId, required, ref: Organization)
- status (enum: pending, approved, rejected, withdrawn, completed)
- message (string, max 1000 chars)
- availability (string, max 500 chars)
- experience (string, max 1000 chars)
- hoursCommitted (number)
- hoursCompleted (number)
- appliedAt (date)
- reviewedAt (date)
- reviewedBy (ObjectId, ref: User)
- reviewNotes (string, max 1000 chars)
- rating (number, 1-5)
- feedback (string, max 1000 chars)

---

## Error Codes

- `400` - Bad Request (validation error)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `500` - Internal Server Error
