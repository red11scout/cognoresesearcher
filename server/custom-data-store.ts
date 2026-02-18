import { db } from "@db";
import { customData } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { CustomData } from "@shared/schema";

/**
 * Create a new custom data item (theme, friction point, or use case).
 */
export async function createCustomData(
  reportId: string,
  dataType: string,
  dataJson: any
): Promise<CustomData> {
  const [record] = await db
    .insert(customData)
    .values({
      reportId,
      dataType,
      dataJson,
    })
    .returning();
  return record;
}

/**
 * Get all custom data for a report, optionally filtered by type.
 * Ordered by most recent first.
 */
export async function getCustomDataByReport(
  reportId: string,
  dataType?: string
): Promise<CustomData[]> {
  if (dataType) {
    return await db
      .select()
      .from(customData)
      .where(
        and(
          eq(customData.reportId, reportId),
          eq(customData.dataType, dataType)
        )
      )
      .orderBy(desc(customData.createdAt));
  }

  return await db
    .select()
    .from(customData)
    .where(eq(customData.reportId, reportId))
    .orderBy(desc(customData.createdAt));
}

/**
 * Get a single custom data record by its ID.
 */
export async function getCustomDataById(id: string): Promise<CustomData | undefined> {
  const [record] = await db
    .select()
    .from(customData)
    .where(eq(customData.id, id))
    .limit(1);
  return record;
}

/**
 * Update a custom data record's JSON payload.
 */
export async function updateCustomData(
  id: string,
  dataJson: any
): Promise<CustomData | undefined> {
  const [updated] = await db
    .update(customData)
    .set({ dataJson, updatedAt: new Date() })
    .where(eq(customData.id, id))
    .returning();
  return updated;
}

/**
 * Delete a custom data record by its ID.
 */
export async function deleteCustomData(id: string): Promise<void> {
  await db
    .delete(customData)
    .where(eq(customData.id, id));
}
