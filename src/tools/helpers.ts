import { HomeboxClient } from "../client.js";
import { HomeboxError } from "../errors.js";

export function toolResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
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

export const ITEM_SECTIONS = [
  "fields",
  "tags",
  "attachments",
  "location",
  "purchase",
  "warranty",
  "sold",
  "notes",
  "details",
] as const;

export type ItemSection = (typeof ITEM_SECTIONS)[number];

const PURCHASE_KEYS = ["purchaseFrom", "purchasePrice", "purchaseTime"];
const WARRANTY_KEYS = ["lifetimeWarranty", "warrantyExpires", "warrantyDetails"];
const SOLD_KEYS = ["soldTo", "soldPrice", "soldTime", "soldNotes"];
const DETAILS_KEYS = ["manufacturer", "modelNumber", "serialNumber"];
const BASICS_KEYS = [
  "id", "name", "quantity", "archived", "insured", "assetId",
  "createdAt", "updatedAt",
];

const SECTION_KEYS: Record<ItemSection, string[]> = {
  purchase: PURCHASE_KEYS,
  warranty: WARRANTY_KEYS,
  sold: SOLD_KEYS,
  details: DETAILS_KEYS,
  notes: ["notes", "description"],
  fields: ["fields"],
  tags: ["tags"],
  attachments: ["attachments"],
  // An item's location is its parent entity since upstream #1414 merged
  // /items and /locations into /entities. "location" is kept as the section
  // name so callers don't have to change.
  location: ["parent", "location"],
};

/**
 * Strip an attachment object down to essential fields.
 */
function stripAttachment(att: Record<string, unknown>): Record<string, unknown> {
  return { id: att.id, title: att.title, type: att.type, primary: att.primary };
}

/**
 * Filter an item response to only the requested sections.
 * Basics (id, name, quantity, archived, etc.) are always included.
 * When include is omitted, all sections are returned but attachments are compressed.
 */
export function stripItem(
  item: Record<string, unknown>,
  include?: ItemSection[],
): Record<string, unknown> {
  if (!include) {
    // Return everything, but compress attachments
    const result = { ...item };
    if (Array.isArray(result.attachments)) {
      result.attachments = (result.attachments as Record<string, unknown>[]).map(stripAttachment);
    }
    return result;
  }

  const result: Record<string, unknown> = {};

  // Always include basics
  for (const key of BASICS_KEYS) {
    if (key in item) result[key] = item[key];
  }

  // Include requested sections
  for (const section of include) {
    const keys = SECTION_KEYS[section];
    for (const key of keys) {
      if (key in item) {
        if (key === "attachments" && Array.isArray(item[key])) {
          result[key] = (item[key] as Record<string, unknown>[]).map(stripAttachment);
        } else {
          result[key] = item[key];
        }
      }
    }
  }

  return result;
}

/**
 * Return a minimal summary for mutation responses.
 */
export function stripItemSummary(item: Record<string, unknown>): Record<string, unknown> {
  return {
    id: item.id,
    name: item.name,
    updatedAt: item.updatedAt,
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
