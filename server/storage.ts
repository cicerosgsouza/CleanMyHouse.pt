import {
  users,
  timeRecords,
  settings,
  type User,
  type UpsertUser,
  type TimeRecord,
  type InsertTimeRecord,
  type Setting,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<UpsertUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  
  // Time record operations
  createTimeRecord(record: InsertTimeRecord): Promise<TimeRecord>;
  getUserTimeRecords(userId: number, startDate?: Date, endDate?: Date): Promise<TimeRecord[]>;
  getAllTimeRecords(startDate?: Date, endDate?: Date): Promise<(TimeRecord & { user: User })[]>;
  getTodayTimeRecords(userId: number): Promise<TimeRecord[]>;
  getRecentTimeRecords(limit?: number): Promise<(TimeRecord & { user: User })[]>;
  
  // User management operations
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  deactivateUser(id: number): Promise<void>;
  
  // Settings operations
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(key: string, value: string): Promise<Setting>;
  
  // Statistics
  getActiveEmployeesCount(): Promise<number>;
  getTodayEntriesCount(): Promise<number>;
  getTodayExitsCount(): Promise<number>;
  getCurrentlyWorkingCount(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: Omit<UpsertUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  // Time record operations
  async createTimeRecord(record: InsertTimeRecord): Promise<TimeRecord> {
    const [timeRecord] = await db
      .insert(timeRecords)
      .values(record)
      .returning();
    return timeRecord;
  }

  async getUserTimeRecords(userId: number, startDate?: Date, endDate?: Date): Promise<TimeRecord[]> {
    if (startDate && endDate) {
      return db.select().from(timeRecords).where(
        and(
          eq(timeRecords.userId, userId),
          gte(timeRecords.timestamp, startDate),
          lte(timeRecords.timestamp, endDate)
        )
      ).orderBy(desc(timeRecords.timestamp));
    }
    
    return db.select().from(timeRecords).where(eq(timeRecords.userId, userId)).orderBy(desc(timeRecords.timestamp));
  }

  async getAllTimeRecords(startDate?: Date, endDate?: Date): Promise<(TimeRecord & { user: User })[]> {
    if (startDate && endDate) {
      return db.select({
        id: timeRecords.id,
        userId: timeRecords.userId,
        type: timeRecords.type,
        timestamp: timeRecords.timestamp,
        location: timeRecords.location,
        latitude: timeRecords.latitude,
        longitude: timeRecords.longitude,
        createdAt: timeRecords.createdAt,
        user: users,
      }).from(timeRecords).innerJoin(users, eq(timeRecords.userId, users.id)).where(
        and(
          gte(timeRecords.timestamp, startDate),
          lte(timeRecords.timestamp, endDate)
        )
      ).orderBy(desc(timeRecords.timestamp));
    }

    return db.select({
      id: timeRecords.id,
      userId: timeRecords.userId,
      type: timeRecords.type,
      timestamp: timeRecords.timestamp,
      location: timeRecords.location,
      latitude: timeRecords.latitude,
      longitude: timeRecords.longitude,
      createdAt: timeRecords.createdAt,
      user: users,
    }).from(timeRecords).innerJoin(users, eq(timeRecords.userId, users.id)).orderBy(desc(timeRecords.timestamp));
  }

  async getTodayTimeRecords(userId: number): Promise<TimeRecord[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return db.select().from(timeRecords)
      .where(
        and(
          eq(timeRecords.userId, userId),
          gte(timeRecords.timestamp, today),
          lte(timeRecords.timestamp, tomorrow)
        )
      )
      .orderBy(desc(timeRecords.timestamp));
  }

  async getRecentTimeRecords(limit = 10): Promise<(TimeRecord & { user: User })[]> {
    return db.select({
      id: timeRecords.id,
      userId: timeRecords.userId,
      type: timeRecords.type,
      timestamp: timeRecords.timestamp,
      location: timeRecords.location,
      latitude: timeRecords.latitude,
      longitude: timeRecords.longitude,
      createdAt: timeRecords.createdAt,
      user: users,
    }).from(timeRecords)
      .innerJoin(users, eq(timeRecords.userId, users.id))
      .orderBy(desc(timeRecords.timestamp))
      .limit(limit);
  }

  // User management operations
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.isActive, true));
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    // Remove password from updates if it's empty (for edit operations) 
    // but keep it if it's being explicitly set for credential changes
    const cleanUpdates = { ...updates };
    if ('password' in cleanUpdates && !cleanUpdates.password && !('isDefaultCredentials' in cleanUpdates)) {
      delete cleanUpdates.password;
    }
    
    const [user] = await db
      .update(users)
      .set({ ...cleanUpdates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deactivateUser(id: number): Promise<void> {
    await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  // Settings operations
  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting;
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    const [setting] = await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: new Date() },
      })
      .returning();
    return setting;
  }

  // Statistics
  async getActiveEmployeesCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .where(and(eq(users.isActive, true), eq(users.role, 'employee')));
    return Number(result.count);
  }

  async getTodayEntriesCount(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [result] = await db
      .select({ count: sql`count(*)` })
      .from(timeRecords)
      .where(
        and(
          eq(timeRecords.type, 'entry'),
          gte(timeRecords.timestamp, today),
          lte(timeRecords.timestamp, tomorrow)
        )
      );
    return Number(result.count);
  }

  async getTodayExitsCount(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [result] = await db
      .select({ count: sql`count(*)` })
      .from(timeRecords)
      .where(
        and(
          eq(timeRecords.type, 'exit'),
          gte(timeRecords.timestamp, today),
          lte(timeRecords.timestamp, tomorrow)
        )
      );
    return Number(result.count);
  }

  async getCurrentlyWorkingCount(): Promise<number> {
    // This is a simplified calculation - in reality you'd need more complex logic
    // to determine who's currently working based on their last entry/exit
    const todayEntries = await this.getTodayEntriesCount();
    const todayExits = await this.getTodayExitsCount();
    return Math.max(0, todayEntries - todayExits);
  }
}

export const storage = new DatabaseStorage();
