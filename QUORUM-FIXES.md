# Fixes para Regresiones de Quórum — Post-evento

## Resumen
3 archivos están hardcodeando `2 / 3` en lugar de usar `QUORUM_FRACTION`. Estos fixes deben aplicarse después del evento en vivo.

---

## Fix 1: `src/components/QuorumStatus.tsx`

### Ubicación: Línea ~1-5 (imports)
**Agregar import:**
```typescript
import { QUORUM_FRACTION } from '@/lib/quorum';
```

### Ubicación: Línea 21
**ANTES:**
```typescript
const membersNeededForQuorum = Math.ceil((2 / 3) * totalMembers);
```

**DESPUÉS:**
```typescript
const membersNeededForQuorum = Math.ceil(QUORUM_FRACTION * totalMembers);
```

### Ubicación: Línea ~45 (en el JSX)
**ANTES:**
```tsx
<span className="font-medium">Requerido: 2/3 (66.67%)</span>
```

**DESPUÉS:**
```tsx
<span className="font-medium">Requerido: 2/3 ({Math.round(QUORUM_FRACTION * 100)}%)</span>
```

---

## Fix 2: `src/components/ReportsSection.tsx`

### Ubicación: Línea ~1-10 (imports)
**Agregar import:**
```typescript
import { QUORUM_FRACTION } from '@/lib/quorum';
```

### Ubicación: Línea 25
**ANTES:**
```typescript
const membersNeededForQuorum = Math.ceil((2 / 3) * stats.totalMembers);
```

**DESPUÉS:**
```typescript
const membersNeededForQuorum = Math.ceil(QUORUM_FRACTION * stats.totalMembers);
```

---

## Fix 3: `src/pages/AdminReports.tsx`

### Ubicación: Línea ~1-15 (imports)
**Agregar import:**
```typescript
import { QUORUM_FRACTION } from '@/lib/quorum';
```

### Ubicación: Línea 12
**ANTES:**
```typescript
quorumRequired: (2 / 3) * 100,
```

**DESPUÉS:**
```typescript
quorumRequired: QUORUM_FRACTION * 100,
```

### Ubicación: Línea 43
**ANTES:**
```typescript
const quorumRequiredFraction = 2 / 3;
```

**DESPUÉS:**
```typescript
const quorumRequiredFraction = QUORUM_FRACTION;
```

---

## Verification Script (Post-fix)

```bash
# Verificar que no hay más hardcodeos de 2/3 en quórum
grep -r "2 / 3\|2/3\|0\.666\|66\.67" src \
  --include="*.tsx" --include="*.ts" \
  | grep -v "QUORUM_FRACTION" \
  | grep -v ".test" \
  | grep -v "node_modules"

# Debería devolver 0 resultados (excepto comentarios que mencionan 2/3)
```

## Testing

1. **Verificar build:**
   ```bash
   npm run build
   ```

2. **Verificar consistency de quórum en cada página:**
   - Abrir Index.tsx → verificar "Estado del Quórum"
   - Abrir Attendance.tsx → verificar quórum en tiempo real
   - Abrir Register.tsx → verificar quórum en tabla
   - Abrir AdminReports.tsx → verificar "Quorum Required %"
   - Todo debe mostrar el mismo % (66.67%)

3. **Git commit sugerido:**
   ```
   fix: use centralized QUORUM_FRACTION in QuorumStatus, ReportsSection, AdminReports
   
   Resolves regression where 3 components were hardcoding 2/3 instead of using
   the centralized QUORUM_FRACTION constant. This ensures consistency if the
   quorum requirement changes in the future.
   ```

---

## Impacto de No Aplicar Estos Fixes

- **Pre-evento:** ✅ Nada (todos los cálculos funcionan porque 2/3 es correcto)
- **Si cambia reglamento:** ⚠️ Estos 3 archivos mostrarían valores viejos
- **Mantenibilidad:** ⚠️ Violación del principio DRY (Don't Repeat Yourself)
