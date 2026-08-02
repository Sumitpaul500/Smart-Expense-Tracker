# FinPilot AI - Database Schema

The database uses MongoDB with Mongoose as the ODM. The schema is designed for high read/write performance, normalized where necessary but denormalized for frequent dashboard queries.

## 1. User Model (`User`)
Stores authentication, profile, and application preferences.
*   `_id`: ObjectId
*   `email`: String (Unique, Indexed)
*   `passwordHash`: String
*   `googleId`: String (Optional)
*   `firstName`: String
*   `lastName`: String
*   `profileImage`: String (URL)
*   `financialHealthScore`: Number (0-100, updated by ML)
*   `preferences`: 
    *   `currency`: String (e.g., 'USD')
    *   `theme`: String ('dark', 'light')
    *   `language`: String
*   `role`: String (Enum: 'user', 'admin')
*   `createdAt`, `updatedAt`: Date

## 2. Transaction Model (`Transaction`)
Core financial record for both income and expenses.
*   `_id`: ObjectId
*   `userId`: ObjectId (Ref: User, Indexed)
*   `type`: String (Enum: 'income', 'expense', 'transfer')
*   `amount`: Number
*   `currency`: String
*   `date`: Date
*   `categoryId`: ObjectId (Ref: Category)
*   `merchant`: String
*   `location`: 
    *   `lat`: Number, `lng`: Number, `address`: String
*   `receiptId`: ObjectId (Ref: Receipt, Optional)
*   `tags`: [String]
*   `isRecurring`: Boolean
*   `subscriptionId`: ObjectId (Ref: Subscription, Optional)
*   `aiInsights`: 
    *   `anomalyScore`: Number (0-1, from Isolation Forest)
    *   `autoCategorized`: Boolean
*   `status`: String (Enum: 'cleared', 'pending')

## 3. Receipt Model (`Receipt`)
Stores uploaded receipts and OCR extracted metadata.
*   `_id`: ObjectId
*   `userId`: ObjectId (Ref: User)
*   `transactionId`: ObjectId (Ref: Transaction)
*   `imageUrl`: String (Cloudinary URL)
*   `ocrData`:
    *   `rawText`: String
    *   `extractedAmount`: Number
    *   `extractedDate`: Date
    *   `taxAmount`: Number
    *   `merchantName`: String
    *   `lineItems`: [{ `description`: String, `amount`: Number }]
*   `processingStatus`: String (Enum: 'pending', 'completed', 'failed')

## 4. Category Model (`Category`)
Global and user-specific expense categories.
*   `_id`: ObjectId
*   `userId`: ObjectId (Ref: User, Null for global categories)
*   `name`: String
*   `icon`: String (Icon identifier)
*   `color`: String (Hex code for UI)
*   `type`: String (Enum: 'income', 'expense')

## 5. Budget Model (`Budget`)
User defined spending limits.
*   `_id`: ObjectId
*   `userId`: ObjectId (Ref: User)
*   `categoryId`: ObjectId (Ref: Category)
*   `period`: String (Enum: 'monthly', 'weekly', 'yearly')
*   `limitAmount`: Number
*   `startDate`: Date
*   `endDate`: Date
*   `alerts`: 
    *   `threshold`: Number (e.g., 0.8 for 80%)
    *   `triggered`: Boolean

## 6. Subscription Model (`Subscription`)
Detected or manually entered recurring payments.
*   `_id`: ObjectId
*   `userId`: ObjectId (Ref: User)
*   `name`: String (e.g., 'Netflix')
*   `amount`: Number
*   `billingCycle`: String (Enum: 'monthly', 'yearly')
*   `nextBillingDate`: Date
*   `status`: String (Enum: 'active', 'cancelled')
*   `cancellationUrl`: String (Optional)

## 7. Goal Model (`Goal`)
Financial saving targets.
*   `_id`: ObjectId
*   `userId`: ObjectId (Ref: User)
*   `name`: String
*   `targetAmount`: Number
*   `currentAmount`: Number
*   `deadline`: Date
*   `status`: String (Enum: 'in_progress', 'achieved', 'abandoned')
*   `aiRecommendations`: [String]

## Indexes
*   `Transaction`: `{ userId: 1, date: -1 }`, `{ userId: 1, categoryId: 1 }`
*   `User`: `{ email: 1 }`
*   `Receipt`: `{ userId: 1, processingStatus: 1 }`
