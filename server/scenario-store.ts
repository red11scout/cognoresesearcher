import { db } from "@db";
import { whatIfScenarios, type WhatIfScenario } from "@shared/schema";
import { eq, and, inArray, desc } from "drizzle-orm";

/**
 * Create a new what-if scenario for a report.
 */
export async function createScenario(
  reportId: string,
  name: string,
  description: string | null,
  assumptions: any,
  results: any
): Promise<WhatIfScenario> {
  const [scenario] = await db
    .insert(whatIfScenarios)
    .values({
      reportId,
      name,
      description,
      assumptionsJson: assumptions,
      resultsJson: results,
    })
    .returning();
  return scenario;
}

/**
 * Get all scenarios for a given report, ordered by most recent first.
 */
export async function getScenariosByReport(reportId: string): Promise<WhatIfScenario[]> {
  return await db
    .select()
    .from(whatIfScenarios)
    .where(eq(whatIfScenarios.reportId, reportId))
    .orderBy(desc(whatIfScenarios.createdAt));
}

/**
 * Get a single scenario by its ID.
 */
export async function getScenarioById(id: string): Promise<WhatIfScenario | undefined> {
  const [scenario] = await db
    .select()
    .from(whatIfScenarios)
    .where(eq(whatIfScenarios.id, id))
    .limit(1);
  return scenario;
}

/**
 * Update a scenario's name, description, assumptions, or results.
 */
export async function updateScenario(
  id: string,
  data: {
    name?: string;
    description?: string;
    assumptionsJson?: any;
    resultsJson?: any;
  }
): Promise<WhatIfScenario | undefined> {
  const [updated] = await db
    .update(whatIfScenarios)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(whatIfScenarios.id, id))
    .returning();
  return updated;
}

/**
 * Delete a scenario by its ID.
 */
export async function deleteScenario(id: string): Promise<void> {
  await db
    .delete(whatIfScenarios)
    .where(eq(whatIfScenarios.id, id));
}

/**
 * Compare multiple scenarios by fetching them all at once.
 * Returns the scenarios matching the provided IDs.
 */
export async function compareScenarios(ids: string[]): Promise<{ scenarios: WhatIfScenario[] }> {
  if (ids.length === 0) {
    return { scenarios: [] };
  }

  const scenarios = await db
    .select()
    .from(whatIfScenarios)
    .where(inArray(whatIfScenarios.id, ids))
    .orderBy(desc(whatIfScenarios.createdAt));

  return { scenarios };
}
