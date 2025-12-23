# ADR-004: Cut Sheet Architecture

## Status

Accepted

## Date

2024-12

## Context

A "cut sheet" is a detailed specification from producers telling processors how to butcher and package their animal. This is a core domain concept that includes:

- **Cut types**: Steaks, roasts, ground meat, ribs
- **Thickness/weight preferences**: 1", 1.5", 2 lb packages
- **Packaging preferences**: Vacuum sealed, paper wrapped, patties
- **Special items**: Sausage flavors, organ meats, smoking requests
- **Animal-specific options**: Bacon/ham for pork, different cuts per species

Cut sheets are complex documents that:
- Vary significantly by animal type
- Have many optional fields
- May be saved as templates for reuse
- Are linked to specific orders

## Decision

### Separate Tables for Cut Sheet Data

```
cut_sheets (main record)
├── cut_sheet_items (individual cut selections)
└── cut_sheet_sausages (sausage flavor selections)
```

### Cut Sheet Table

```sql
cut_sheets (
  id UUID PRIMARY KEY,
  organization_id UUID,     -- Template owner
  order_id UUID,            -- NULL for templates
  animal_type animal_type,
  status cut_sheet_status,
  is_template BOOLEAN,
  template_name VARCHAR(100),

  -- Steak preferences
  ribeye_thickness VARCHAR(10),
  ny_strip_thickness VARCHAR(10),
  filet_thickness VARCHAR(10),
  sirloin_thickness VARCHAR(10),

  -- Roast preferences
  chuck_roast_weight VARCHAR(10),
  rump_roast_weight VARCHAR(10),

  -- Ground meat
  ground_package_size VARCHAR(10),
  ground_type ground_type,
  patty_size patty_size,

  -- Pork-specific
  bacon_preference VARCHAR(20),
  ham_preference VARCHAR(20),

  -- Organs
  keep_liver BOOLEAN,
  keep_heart BOOLEAN,
  keep_tongue BOOLEAN,
  keep_kidneys BOOLEAN,
  keep_oxtail BOOLEAN,
  keep_bones BOOLEAN,

  -- Meta
  special_instructions TEXT,
  notes TEXT
)
```

### Animal-Specific Cut Data

Defined in `/src/lib/cut-sheet-data.ts`:

```typescript
const BEEF_CUTS = {
  steaks: ['Ribeye', 'NY Strip', 'Filet Mignon', 'Sirloin', 'Flank', 'Skirt'],
  roasts: ['Chuck Roast', 'Rump Roast', 'Brisket', 'Prime Rib'],
  ribs: ['Short Ribs', 'Back Ribs'],
  other: ['Stew Meat', 'Kabob Meat']
}

const PORK_CUTS = {
  chops: ['Center Cut', 'Rib Chops', 'Loin Chops'],
  roasts: ['Pork Loin', 'Boston Butt', 'Picnic Shoulder'],
  specialty: ['Bacon/Belly', 'Ham', 'Spare Ribs', 'Baby Back Ribs']
}

// Similar for lamb, goat...
```

### Sausage Flavors (Separate Table)

10 standard flavors with quantity in pounds:

```typescript
type SausageFlavor =
  | 'mild' | 'medium' | 'hot'
  | 'sweet_italian' | 'hot_italian'
  | 'chorizo' | 'bratwurst' | 'polish'
  | 'breakfast' | 'maple_breakfast'
```

```sql
cut_sheet_sausages (
  cut_sheet_id UUID,
  flavor sausage_flavor,
  pounds DECIMAL(5,2)
)
```

### Templates vs Order-Specific

| Field | Template | Order |
|-------|----------|-------|
| organization_id | Set | Set |
| order_id | NULL | Set |
| is_template | true | false |
| template_name | Set | NULL |

### UI Component: CutSheetBuilder

A comprehensive React component that:
- Adapts form fields based on animal type
- Groups cuts by category (steaks, roasts, etc.)
- Uses select dropdowns for thickness/weight
- Checkbox grid for sausage flavors with quantity inputs
- Toggle switches for organ meats
- Real-time validation

## Consequences

### Positive

- **Domain accuracy**: Mirrors real cut sheet complexity
- **Reusability**: Templates save producers time on repeat orders
- **Type safety**: Enums prevent invalid values
- **Flexibility**: JSONB could extend for custom cuts
- **Clear UI mapping**: Data structure matches form layout

### Negative

- **Many columns**: Cut sheets table has 30+ columns
- **Animal-type complexity**: Different animals have different valid fields
- **Migration risk**: Adding new cut options requires schema changes
- **Nullable fields**: Many fields only apply to certain animals

### Neutral

- Separate sausage table adds a join but keeps main table cleaner
- Could use JSONB for all cuts (more flexible, less type-safe)

## Implementation Notes

### Animal-Type Conditional Rendering

```tsx
{animalType === 'pork' && (
  <>
    <FormField name="bacon_preference" />
    <FormField name="ham_preference" />
  </>
)}

{animalType === 'beef' && (
  <FormField name="brisket_style" />
)}
```

### Thickness Options

Standardized across all steak cuts:
```typescript
const THICKNESS_OPTIONS = ['3/4"', '1"', '1 1/4"', '1 1/2"', '2"']
```

### Copy Template to Order

```typescript
async function applyTemplate(templateId: string, orderId: string) {
  const { data: template } = await supabase
    .from('cut_sheets')
    .select('*, cut_sheet_sausages(*)')
    .eq('id', templateId)
    .single()

  // Create order-specific copy
  const { data: newSheet } = await supabase
    .from('cut_sheets')
    .insert({
      ...template,
      id: undefined,
      order_id: orderId,
      is_template: false,
      template_name: null
    })
    .select()
    .single()

  // Copy sausages
  if (template.cut_sheet_sausages?.length) {
    await supabase.from('cut_sheet_sausages').insert(
      template.cut_sheet_sausages.map(s => ({
        ...s,
        cut_sheet_id: newSheet.id
      }))
    )
  }
}
```

## Alternatives Considered

1. **Single JSONB Column**: Maximum flexibility but no type safety, harder to query
2. **Normalized Cut Items**: Every cut as a row (cut_name, preference) - too generic, loses domain meaning
3. **Separate Tables per Animal**: Clean schemas but code duplication, migration complexity
4. **PDF Upload Only**: Simple but no structured data, can't auto-fill, no templates

## Related

- [ADR-002: Dual-Role Architecture](./002-dual-role-architecture.md) (producer creates, processor views)
- [ADR-003: Database Design](./003-database-design-rls.md) (RLS for cut sheet access)
