# Chords App API Setup

## Project Structure

We've set up a structured NestJS application with Prisma ORM and PostgreSQL:

```
chords-api/
├── prisma/
│   └── schema.prisma       # Database schema definition
├── src/
│   ├── controllers/        # API endpoints
│   │   ├── user.controller.ts
│   │   └── customer.controller.ts
│   ├── services/           # Business logic
│   │   ├── prisma.service.ts
│   │   ├── user.service.ts
│   │   └── customer.service.ts
│   ├── dtos/               # Data Transfer Objects
│   │   ├── user.dto.ts
│   │   └── customer.dto.ts
│   ├── interfaces/         # TypeScript interfaces
│   ├── middlewares/        # HTTP middlewares
│   ├── utils/              # Utility functions
│   ├── config/             # Configuration files
│   ├── app.module.ts       # Main application module
│   ├── app.controller.ts   # Main controller
│   ├── app.service.ts      # Main service
│   └── main.ts             # Application entry point
├── .env                    # Environment variables
└── package.json            # Project dependencies
```

## Database Schema

We've created a Prisma schema with the following models:

1. **User** - Admin users of the system
   - Fields: id, name, email, password, role, createdAt, updatedAt

2. **Customer** - End users of the app/website
   - Fields: id, name, email, password, profilePicture, subscriptionType, isActive, createdAt, updatedAt

3. **Song** - Song data with chords
   - Fields: id, title, artist, album, key, tempo, timeSignature, difficulty, lyrics, chordSheet, tags, createdAt, updatedAt

4. **Favorite** - Customer's favorite songs
   - Fields: id, customerId, songId, createdAt

5. **Playlist** - Customer's playlists
   - Fields: id, name, description, customerId, createdAt, updatedAt

6. **PlaylistSong** - Join table for playlists and songs
   - Fields: id, playlistId, songId, order, createdAt

## Next Steps

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Generate Prisma client**:
   ```bash
   npx prisma generate
   ```

3. **Create the database**:
   Make sure PostgreSQL is running, then create the initial migration:
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Start the development server**:
   ```bash
   npm run start:dev
   ```

5. **Access the API**:
   The API will be available at `http://localhost:3001/api`

6. **Explore the database with Prisma Studio**:
   ```bash
   npx prisma studio
   ```

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get a specific user
- `POST /api/users` - Create a new user
- `PATCH /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user

### Customers
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get a specific customer
- `POST /api/customers` - Create a new customer
- `PATCH /api/customers/:id` - Update a customer
- `DELETE /api/customers/:id` - Delete a customer

## Future Enhancements

1. Add authentication with JWT
2. Implement song CRUD operations
3. Add favorites and playlist functionality
4. Implement search and filtering
5. Add role-based access control
