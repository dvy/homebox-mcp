import { HomeboxClient } from "../client.js";
import { HomeboxError } from "../errors.js";

export function toolResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function errorResult(e: unknown) {
  const message =
    e instanceof HomeboxError
      ? e.message
      : e instanceof Error
        ? e.message
        : String(e);
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

type EntityType = { id: string; name: string; isLocation: boolean };

/**
 * Find the group's entity type for locations (or items). Homebox merged items
 * and locations into one "entities" resource (upstream #1414); which one an
 * entity is depends on its entity type's isLocation flag. Creating an entity
 * without an explicit entityTypeId always defaults to the *item* type, so a
 * location has to resolve its type first.
 */
export async function resolveEntityTypeId(
  client: HomeboxClient,
  isLocation: boolean,
): Promise<string> {
  const types = await client.request<EntityType[]>("GET", "/entity-types");
  const match = (types ?? []).find((t) => t.isLocation === isLocation);
  if (!match) {
    throw new HomeboxError(
      `No ${isLocation ? "location" : "item"} entity type exists in this group`,
    );
  }
  return match.id;
}

type UpdateParams = {
  id: string;
  locationId?: string;
  parentId?: string | null;
  [key: string]: unknown;
};

/**
 * Merge partial update params over the current entity so a PUT (full replace)
 * doesn't blank out untouched fields.
 */
export function buildEntityUpdateBody(
  params: UpdateParams,
  current: Record<string, unknown>,
): Record<string, unknown> {
  const pick = <T>(key: string, fallback: T) =>
    params[key] !== undefined ? (params[key] as T) : fallback;

  const currentParentId = (current.parent as Record<string, unknown> | undefined)?.id;
  let parentId: unknown;
  if (params.parentId !== undefined) {
    parentId = params.parentId;
  } else if (params.locationId !== undefined) {
    parentId = params.locationId;
  } else {
    parentId = currentParentId;
  }

  return {
    id: params.id,
    name: pick("name", current.name),
    description: pick("description", current.description),
    parentId,
    entityTypeId: (current.entityType as Record<string, unknown> | undefined)?.id,
    tagIds:
      params.tagIds !== undefined
        ? params.tagIds
        : ((current.tags as Array<Record<string, unknown>>) ?? []).map((t) => t.id),
    quantity: pick("quantity", current.quantity),
    insured: pick("insured", current.insured),
    archived: pick("archived", current.archived),
    manufacturer: pick("manufacturer", current.manufacturer),
    modelNumber: pick("modelNumber", current.modelNumber),
    serialNumber: pick("serialNumber", current.serialNumber),
    purchaseFrom: pick("purchaseFrom", current.purchaseFrom),
    // Prices are numbers in the entities API (they were strings pre-#1414).
    purchasePrice: pick("purchasePrice", current.purchasePrice),
    purchaseTime: pick("purchaseTime", current.purchaseTime),
    soldTo: pick("soldTo", current.soldTo),
    soldPrice: pick("soldPrice", current.soldPrice),
    soldTime: pick("soldTime", current.soldTime),
    soldNotes: pick("soldNotes", current.soldNotes),
    notes: pick("notes", current.notes),
    lifetimeWarranty: pick("lifetimeWarranty", current.lifetimeWarranty),
    warrantyExpires: pick("warrantyExpires", current.warrantyExpires),
    warrantyDetails: pick("warrantyDetails", current.warrantyDetails),
    syncChildEntityLocations: pick(
      "syncChildEntityLocations",
      current.syncChildEntityLocations ?? false,
    ),
    assetId: current.assetId,
    fields: pick("fields", current.fields),
  };
}
