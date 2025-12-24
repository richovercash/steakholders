# Cut Sheet Constraints & Conflicts Reference
## For Steakholders Platform Cut Sheet Validation

This document outlines the mutually exclusive cuts and conditional logic required for the Steakholders cut sheet system. When a customer selects one cut option, certain other cuts become unavailable because they come from the same part of the animal.

---

## BEEF Cut Constraints

### 1. Short Loin - THE T-BONE CONFLICT (Critical)
**This is the most important constraint to implement.**

The short loin contains both the strip loin (NY Strip) and the tenderloin (Filet Mignon), connected by a T-shaped bone.

| If Customer Selects | Cannot Also Select | Reason |
|---------------------|-------------------|--------|
| T-Bone Steaks | NY Strip Steaks, Filet Mignon, Porterhouse | T-bone IS the strip + filet with bone |
| Porterhouse Steaks | NY Strip Steaks, Filet Mignon, T-Bone | Porterhouse IS the strip + filet with bone (larger filet portion) |
| NY Strip Steaks (boneless) | T-Bone, Porterhouse | Strip is separated from the bone |
| Filet Mignon / Tenderloin | T-Bone, Porterhouse | Tenderloin is removed separately |

**Customer Decision Point:**
- **Option A:** Bone-in T-bones/Porterhouse (get both muscles together with bone)
- **Option B:** Boneless NY Strips + Filets separately

### 2. Rib Primal - Steaks vs Roasts
The rib section (ribs 6-12) can be processed as steaks OR roasts.

| If Customer Selects | Reduces/Eliminates | Notes |
|---------------------|-------------------|-------|
| All Rib-Eye Steaks | Prime Rib / Standing Rib Roast | Same muscle, different cut |
| Prime Rib Roast (full) | Rib-Eye Steaks | One large roast uses all ribs |
| Partial: Some Steaks + Some Roasts | OK | Can split (e.g., 6 rib-eyes + 1 small roast) |

**Bone Option Sub-Choice:**
- Rib-Eye Steaks: Bone-in OR Boneless
- Rib Roast: Bone-in OR Boneless

### 3. Chuck - Steaks vs Roasts
| If Customer Selects | Reduces | Notes |
|---------------------|---------|-------|
| All Chuck Roasts | No Chuck Steaks | Chuck can be split between options |
| All Chuck Steaks | No Chuck Roasts | Same |
| Ground (from chuck) | Reduces both steaks and roasts | Customer may want all ground |

### 4. Round (Rear Leg) - Multiple Options
The round has several sub-sections with different processing options:

**Top Round Options (choose ONE):**
- Round Steaks
- London Broil (thick steaks ~2")
- Roasts
- Ground to Hamburger

**Bottom Round Options (choose ONE):**
- Roasts
- Cube Steaks (tenderized cutlets)
- Ground to Hamburger

**Eye Round Options (choose ONE):**
- Eye Round Roasts
- Eye Round Steaks (medallions)
- Ground to Hamburger

**Sirloin Tip Options (choose ONE):**
- Sirloin Tip Roasts
- Sirloin Tip Steaks
- Ground to Hamburger

### 5. Sirloin - Steaks vs Specialty Cuts
| If Customer Selects | May Reduce | Notes |
|---------------------|-----------|-------|
| Tri-Tip Roast (whole) | Sirloin Steaks | Tri-tip is part of sirloin |
| Picanha (coulotte) | Sirloin Steaks | Picanha is sirloin cap |
| All Sirloin Steaks | No Tri-tip, No Picanha | Uses whole section as steaks |

### 6. Brisket Options (choose ONE)
- Whole Packer Brisket (12-16 lbs)
- Split Brisket (flat and point separated)
- Corned Beef (cured)
- Ground to Hamburger

### 7. Short Ribs Options
- Bone-in Short Ribs
- Boneless Short Rib Meat
- Ground to Hamburger

---

## PORK Cut Constraints

### 1. Loin - Chops vs Roasts
| If Customer Selects | Reduces/Eliminates | Notes |
|---------------------|-------------------|-------|
| All Pork Chops | Loin Roast | Same muscle |
| Whole Loin Roast | Pork Chops | One piece |
| Baby Back Ribs | Reduces loin size slightly | Ribs are trimmed from loin |

**Chop Sub-Options (when choosing chops):**
- Center-Cut Chops (most tender)
- Rib Chops (bone-in, from rib end)
- Sirloin Chops (from sirloin end)
- Boneless vs Bone-in

**Note:** Tenderloin is a separate muscle that can always be kept whole or cut into medallions regardless of chop/roast choice.

### 2. Leg/Ham - Fresh vs Cured
| If Customer Selects | Cannot Also Select | Notes |
|---------------------|-------------------|-------|
| Fresh Ham (uncured roast) | Cured/Smoked Ham | Same cut, different processing |
| Cured Ham (smoked) | Fresh Ham Roast | Same cut, different processing |
| Ham Steaks | Reduces whole ham | Steaks cut from ham |

**Ham Sub-Options:**
- Bone-in vs Boneless
- Spiral-sliced vs Whole
- Shank end vs Butt end (if splitting)

### 3. Shoulder - Butt vs Picnic
| Cut | Options | Notes |
|-----|---------|-------|
| Boston Butt | Whole roast, Steaks, Ground for sausage | Upper shoulder |
| Picnic Shoulder | Whole roast, Ground for sausage | Lower shoulder |

### 4. Belly/Side
| If Customer Selects | Cannot Also Select | Notes |
|---------------------|-------------------|-------|
| Bacon (cured/smoked) | Fresh Pork Belly | Same cut, different processing |
| Fresh Pork Belly | Bacon | Same cut |
| Spare Ribs | Reduces belly size | Ribs cut from belly section |

---

## LAMB Cut Constraints

### 1. Rack - Chops vs Roast
| If Customer Selects | Cannot Also Select | Notes |
|---------------------|-------------------|-------|
| Whole Rack of Lamb | Rib Chops (cutlets) | Same section |
| Rib Chops | Whole Rack | Same section |
| Crown Roast | Rib Chops, Single Rack | Uses both racks tied together |
| French-trim Chops (lollipops) | Whole Rack | Same cut, individual portions |

### 2. Loin - Chops vs Roast
| If Customer Selects | Cannot Also Select | Notes |
|---------------------|-------------------|-------|
| Loin Chops (lamb T-bones) | Boneless Loin Roast | Same muscle |
| Saddle Roast (bone-in loin) | Loin Chops | Same section |
| Boneless Loin Roast | Loin Chops | Same muscle |

### 3. Leg - Roast vs Steaks
| If Customer Selects | Cannot Also Select | Notes |
|---------------------|-------------------|-------|
| Whole Leg Roast (bone-in) | Leg Steaks, Butterflied Leg | Same cut |
| Butterflied Leg (boneless) | Whole Leg Roast | Deboned and opened |
| Leg Steaks | Reduces whole leg portions | Cut across the leg |

### 4. Shoulder
| If Customer Selects | Reduces | Notes |
|---------------------|---------|-------|
| Whole Shoulder Roast | Shoulder Chops | Same section |
| Shoulder Chops (blade/arm) | Whole Roast | Same section |
| Stew Meat | Reduces roasts/chops | Cubed from shoulder |
| Ground Lamb | Reduces other cuts | From trim and shoulder |

---

## GOAT Cut Constraints

**Note:** Goat follows nearly identical structure to lamb due to similar anatomy.

### 1. Rack - Chops vs Roast
| If Customer Selects | Cannot Also Select |
|---------------------|-------------------|
| Whole Rack of Goat | Rib Chops |
| Rib Chops | Whole Rack |

### 2. Loin
| If Customer Selects | Cannot Also Select |
|---------------------|-------------------|
| Loin Chops | Loin Roast |
| Loin/Saddle Roast | Loin Chops |

### 3. Leg
| If Customer Selects | Cannot Also Select |
|---------------------|-------------------|
| Whole Leg Roast | Leg Steaks |
| Leg Steaks | Whole Leg |

### 4. Shoulder
| If Customer Selects | Reduces |
|---------------------|---------|
| Shoulder Roast | Shoulder Chops, Stew Meat |
| Stew Meat | Roast portions |
| Curry Meat (cubed) | Roast portions |

---

## Universal Parameters Per Cut

### Steak/Chop Parameters
- **Thickness:** 1/2", 3/4", 1", 1.25", 1.5", 2" (default: 1")
- **Per Package:** 1, 2, 4, 6 (default: 2)
- **Bone:** Bone-in or Boneless (where applicable)

### Roast Parameters
- **Weight:** 2-3 lbs, 3-4 lbs, 4-5 lbs, 5+ lbs (default: 3-4 lbs)
- **Style:** Bone-in, Boneless, Rolled & Tied

### Ground Meat Parameters
- **Package Size:** 1 lb, 2 lb, 5 lb (default: 1 lb)
- **Lean Ratio (beef):** 80/20, 85/15, 90/10
- **Patties:** 1/4 lb, 1/3 lb, 1/2 lb

---

## Implementation Notes for Steakholders

### Priority Validation Rules
1. **T-bone conflict must block immediately** - When user selects T-bone OR Porterhouse, disable NY Strip and Filet Mignon options (and vice versa)
2. **Show visual indicator** - Use color coding or strikethrough for unavailable options
3. **Allow splitting where possible** - Chuck, round sections can often be split between multiple options
4. **Track running totals** - If user chooses "all steaks" from one section, show 0 roasts available

### Suggested UI Patterns
- **Radio buttons** for strict either/or choices (T-bone conflict)
- **Sliders or input fields** for "how many as steaks vs roasts" when splitting is allowed
- **Dropdown** for processing options (ground, stew, keep as roast)
- **Progress indicator** showing completion of each primal section

### Halal/Kosher Considerations
- Additional field for certification type
- Some processors may have restrictions on certain processing (e.g., no stunning for kosher)
- Keep separate from cut logic but display during processor matching

---

## Sources
- USDA Meat Buyer's Guide
- Multiple USDA-inspected custom processor cut sheets
- Industry butcher training materials
- Search research December 2024
