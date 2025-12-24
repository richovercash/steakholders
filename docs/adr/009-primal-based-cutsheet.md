# ADR-009: Primal-Based Cut Sheet Schema

## Status

Accepted

## Date

2024-12-23

## Context

The current cut sheet implementation has limitations:

1. **Static options**: All cuts are hardcoded in `cut-sheet-data.ts`
2. **Simple conflicts**: Only T-bone conflict is implemented
3. **No processor control**: Every producer sees the same options regardless of processor
4. **Incomplete anatomy modeling**: Doesn't reflect that an animal is a finite resource with interdependent cuts

Real-world cut sheets are complex because:
- Choosing one cut eliminates others from the same primal (T-bone vs separate NY Strip + Filet)
- Processors offer different services and cuts
- Parameters vary (thickness, weight, packaging)
- Some processing (curing, smoking) has additional fees

We have industry-standard reference documents (`cutsheet/logic/cut_constraints.md` and `cut_sheet_schema.json`) that define the correct constraints.

## Decision

### 1. Adopt Primal-Based Data Model

Structure cut options by anatomical primals rather than flat lists:

```typescript
interface CutSheetSchema {
  animals: {
    [animalType: string]: {
      displayName: string
      primals: {
        [primalId: string]: Primal
      }
      groundOptions: GroundParameters
    }
  }
}

interface Primal {
  displayName: string
  description?: string
  conflictGroup?: string      // All choices in this group are mutually exclusive
  allowSplit?: boolean        // Can split between multiple options
  exclusiveChoice?: boolean   // Only ONE option allowed
  subSections?: Record<string, Primal>  // For complex primals like Round
  choices: CutChoice[]
}

interface CutChoice {
  id: string
  name: string
  type: 'steak' | 'roast' | 'chop' | 'ribs' | 'ground' | 'cubed' | 'cured' | 'shank'
  excludes?: string[]           // Hard conflict - disables these options
  conflictsWith?: string[]      // Soft conflict - reduces yield
  reducesYield?: string         // Comes from same area
  requires?: string[]           // Must be selected together
  independent?: boolean         // Can keep regardless of other choices
  additionalFee?: boolean       // Requires extra processing fee
  specialty?: boolean           // Not commonly requested
  parameters?: CutParameters
}
```

### 2. Validation Rule Types

| Rule | Behavior | UI Treatment |
|------|----------|--------------|
| `exclusiveChoice` | Only one from group | Radio buttons |
| `excludes` | Hard disable | Greyed out + tooltip |
| `conflictsWith` | Soft conflict | Warning message |
| `reducesYield` | Reduces quantity | Yield indicator |
| `requires` | Must select together | Auto-select or group |
| `independent` | No constraints | Always available |

### 3. Validation Engine

Create a standalone validation engine that:

```typescript
interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  disabledOptions: Map<string, string>  // cutId -> reason
}

function validateCutSheet(
  animalType: AnimalType,
  selections: CutSelection[],
  schema: CutSheetSchema
): ValidationResult
```

The engine:
- Processes all selected cuts
- Checks each against exclusion rules
- Builds list of disabled options with explanations
- Returns warnings for soft conflicts
- Is pure function (no side effects, easy to test)

### 4. Processor Customization Layer

Processors can override the base schema:

```typescript
interface ProcessorCutConfig {
  processor_id: string
  enabled_animals: AnimalType[]           // Which animals they process
  disabled_cuts: string[]                 // Cuts they don't offer
  disabled_sausage_flavors: string[]      // Flavors they don't make
  custom_cuts: CustomCut[]                // Processor-specific options
  cut_pricing: Map<string, number>        // Optional pricing per cut
  default_templates: ProcessorTemplate[]  // Their standard packages
}
```

Database tables:
- `processor_cut_config` - main configuration
- `processor_custom_cuts` - custom options
- `processor_cut_pricing` - pricing (for Phase 2)

### 5. UI Updates

The CutSheetBuilder will:
1. Organize by primal sections (collapsible)
2. Show radio groups for exclusive choices
3. Disable options with tooltips explaining why
4. Show yield warnings for conflicts
5. Filter by processor's enabled options
6. Support both "quick pick" (common packages) and "custom" modes

## Consequences

### Positive

- **Anatomically accurate**: Models real constraints
- **Processor control**: Each processor configures their options
- **Extensible**: New cuts/rules added via schema, not code changes
- **Testable**: Pure validation function with clear inputs/outputs
- **Industry standard**: Based on USDA meat buyer's guide

### Negative

- **Significant refactor**: CutSheetBuilder needs major changes
- **Migration needed**: Existing cut sheets use old IDs
- **More complex UI**: Primal sections add visual complexity
- **Learning curve**: Producers must understand primal concept

### Neutral

- JSON schema could be stored in DB for hot updates (future)
- Processor config adds admin UI work
- Some processors may not want this level of control

## Implementation Plan

### Phase 1: Schema & Validation
1. Copy JSON schema to `app/src/lib/cut-sheet-schema.ts`
2. Create TypeScript types from schema
3. Build validation engine
4. Write comprehensive tests

### Phase 2: UI Updates
1. Refactor CutSheetBuilder to use primal sections
2. Implement radio groups for exclusive choices
3. Add disabled state with tooltips
4. Show yield warnings

### Phase 3: Processor Config
1. Create database tables
2. Build processor settings UI
3. Filter CutSheetBuilder by processor config
4. Add default templates

### Phase 4: Migration
1. Map old cut IDs to new schema
2. Migrate existing cut sheets
3. Update order display pages

## Alternatives Considered

### 1. Keep Simple Flat List
Add more `conflictsWith` arrays to existing structure.

**Rejected because**:
- Doesn't scale to full constraint set
- No processor customization
- Hard to maintain as rules grow

### 2. Database-Only Rules
Store all rules in database, no schema file.

**Rejected because**:
- Harder to version control
- Need admin UI to edit rules
- Base rules are industry standard, shouldn't change often

### 3. GraphQL-Style Dependencies
Model cuts as graph nodes with edges for relationships.

**Rejected because**:
- Over-engineered for this use case
- Harder to reason about
- Schema approach is more readable

## Related

- ADR-004: Cut Sheet Architecture (original design)
- `cutsheet/logic/cut_constraints.md` - Industry reference
- `cutsheet/logic/cut_sheet_schema.json` - Full schema
- ROADMAP.md Phase 1.5 - Processor Cut Sheet Configuration
