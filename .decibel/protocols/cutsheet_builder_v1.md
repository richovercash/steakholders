---
id: cutsheet_builder_v1
version: 1
domain: cutsheets
status: active
---

# Cut Sheet Builder Protocol

## Purpose

Define the structure and validation rules for cut sheets.

## Cut Sheet Structure

```typescript
interface CutSheet {
  id: string;
  processing_order_id?: string;  // null for templates
  is_template: boolean;
  template_name?: string;
  producer_id?: string;          // owner of template
  animal_type: 'beef' | 'pork' | 'lamb' | 'goat';
  cuts: CutSpecification;
  special_instructions?: string;
  ground_meat_preferences: GroundMeatPrefs;
  keep_organs: OrganPrefs;
  keep_bones: boolean;
  bone_preferences?: BonePrefs;
  is_complete: boolean;
  validation_errors: string[];
}
```

## Cuts Specification

Organized by primal cuts:

### Beef Primals

```typescript
interface BeefCuts {
  chuck: {
    roasts?: { quantity: number; weight?: string };
    steaks?: { quantity: number; thickness: string };
    ground?: boolean;
  };
  rib: {
    ribeye_steaks?: { quantity: number; thickness: string };
    prime_rib?: { quantity: number };
    short_ribs?: boolean;
  };
  loin: {
    t_bone?: { quantity: number; thickness: string };
    porterhouse?: { quantity: number; thickness: string };
    strip_steaks?: { quantity: number; thickness: string };
    tenderloin?: { whole: boolean } | { filets: { quantity: number } };
  };
  round: {
    roasts?: { quantity: number };
    steaks?: { quantity: number; thickness: string };
    ground?: boolean;
  };
  brisket: {
    whole?: boolean;
    flat?: boolean;
    point?: boolean;
  };
  flank: {
    whole?: boolean;
    ground?: boolean;
  };
  plate: {
    short_ribs?: boolean;
    skirt_steak?: boolean;
    ground?: boolean;
  };
}
```

## The Rules

### 1. Template Management

- Producers can create reusable templates
- Templates stored with `is_template: true`
- Apply template to order by copying cuts data

### 2. Validation

Before submission, validate:

```typescript
function validateCutSheet(sheet: CutSheet): string[] {
  const errors: string[] = [];

  // Must have at least one cut specified
  if (Object.keys(sheet.cuts).length === 0) {
    errors.push('At least one cut must be specified');
  }

  // Thickness must be valid
  // (e.g., "1in", "1.5in", "3/4in")

  // Quantity must be positive

  return errors;
}
```

### 3. Ground Meat Options

```typescript
interface GroundMeatPrefs {
  lean_percentage?: 80 | 85 | 90;  // fat ratio
  package_size?: '1lb' | '2lb' | '5lb';
  patties?: boolean;
  patty_size?: '1/4lb' | '1/3lb' | '1/2lb';
}
```

### 4. Organ Meat Options

```typescript
interface OrganPrefs {
  heart: boolean;
  liver: boolean;
  tongue: boolean;
  kidneys?: boolean;
  oxtail?: boolean;
}
```

### 5. Visual Builder UI

The cut sheet builder should:
- Show animal diagram with clickable primal regions
- Reveal cut options when primal is selected
- Show running summary of selections
- Validate in real-time
- Allow save as template

## Anti-Patterns

- Never allow incomplete cut sheet on confirmed order
- Never modify cut sheet after `in_progress` status
- Never delete cuts that conflict (validate first)
- Never assume default values without user confirmation
