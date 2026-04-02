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
  "createdAt", "updatedAt", "description",
];

const SECTION_KEYS: Record<ItemSection, string[]> = {
  purchase: PURCHASE_KEYS,
  warranty: WARRANTY_KEYS,
  sold: SOLD_KEYS,
  details: DETAILS_KEYS,
  notes: ["notes"],
  fields: ["fields"],
  tags: ["tags"],
  attachments: ["attachments"],
  location: ["location"],
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
