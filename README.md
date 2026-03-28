# homebox-mcp

MCP (Model Context Protocol) server for [Homebox](https://github.com/sysadminsmedia/homebox) home inventory management.

Provides 50+ tools covering the full Homebox API: items, locations, tags, maintenance, attachments, templates, statistics, groups, notifiers, and more.

## Setup

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HOMEBOX_URL` | Yes | Your Homebox instance URL (e.g., `https://homebox.example.com`) |
| `HOMEBOX_USERNAME` | Yes* | Homebox username/email |
| `HOMEBOX_PASSWORD` | Yes* | Homebox password |
| `HOMEBOX_TOKEN` | No | Pre-authenticated bearer token (alternative to username/password) |

\* Required unless `HOMEBOX_TOKEN` is provided.

### Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "homebox": {
      "command": "node",
      "args": ["/path/to/homebox-mcp/dist/index.js"],
      "env": {
        "HOMEBOX_URL": "https://homebox.example.com",
        "HOMEBOX_USERNAME": "your-email",
        "HOMEBOX_PASSWORD": "your-password"
      }
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "homebox": {
      "command": "node",
      "args": ["/path/to/homebox-mcp/dist/index.js"],
      "env": {
        "HOMEBOX_URL": "https://homebox.example.com",
        "HOMEBOX_USERNAME": "your-email",
        "HOMEBOX_PASSWORD": "your-password"
      }
    }
  }
}
```

## Build

```bash
npm install
npm run build
```

## Tools

### Items
- `list_items` - Query items with filtering and pagination
- `get_item` - Get full item details
- `create_item` - Create a new item
- `update_item` - Full item update (all fields)
- `patch_item` - Partial update (location, quantity, tags)
- `delete_item` - Delete an item
- `duplicate_item` - Duplicate an item
- `get_item_path` - Get item's location path
- `get_item_by_asset_id` - Look up by asset ID
- `get_custom_field_names` - List custom field names
- `get_custom_field_values` - List custom field values
- `import_items` - Import from CSV
- `export_items` - Export to CSV

### Locations
- `list_locations` - List all locations
- `get_location` - Get location details
- `get_location_tree` - Hierarchical location tree
- `create_location` - Create a location
- `update_location` - Update a location
- `delete_location` - Delete a location

### Tags
- `list_tags`, `get_tag`, `create_tag`, `update_tag`, `delete_tag`

### Maintenance
- `list_maintenance` - List entries (all or per-item)
- `create_maintenance_entry`, `update_maintenance_entry`, `delete_maintenance_entry`

### Attachments
- `get_attachment`, `upload_attachment`, `update_attachment`, `delete_attachment`

### Templates
- `list_templates`, `get_template`, `create_template`, `update_template`, `delete_template`, `create_item_from_template`

### Statistics
- `get_statistics` - Overall inventory stats
- `get_statistics_by_location`, `get_statistics_by_tag`, `get_purchase_price_statistics`

### Groups
- `get_group`, `update_group`, `list_group_members`, `add_group_member`, `remove_group_member`, `list_group_invitations`, `create_group_invitation`

### Notifiers
- `list_notifiers`, `create_notifier`, `update_notifier`, `delete_notifier`, `test_notifier`

### Actions
- `ensure_asset_ids`, `ensure_import_refs`, `create_missing_thumbnails`, `set_primary_photos`, `zero_item_time_fields`, `wipe_inventory`

### Users
- `get_user_self`, `update_user_self`, `change_password`

### Misc
- `get_status`, `get_currencies`, `search_barcode`, `export_bill_of_materials`
