# 🛠️ Scripts de Mantenimiento de Datos

## Mejoras Implementadas sobre los Scripts de Julius

Este directorio contiene scripts mejorados para el mantenimiento y actualización de datos del catálogo Samsung.

---

## 📁 Estructura de Archivos

```
scripts/
├── maintenance.js                  # Script maestro (NUEVO)
├── update-data-placeholders.js     # Actualizar data.js (MEJORADO)
├── update-csv-placeholders.js      # Actualizar CSV (MEJORADO)
└── README.md                       # Esta documentación
```

---

## 🎯 Scripts Disponibles

### 1. **Script Maestro** (`maintenance.js`)

Script principal que combina todas las funcionalidades.

#### Comandos:

```bash
# Ver menú de ayuda
node scripts/maintenance.js

# Actualizar data.js con placeholders
node scripts/maintenance.js update-data 3 102

# Actualizar CSV con placeholders
node scripts/maintenance.js update-csv 3 102

# Sincronizar colores entre archivos
node scripts/maintenance.js sync-colors

# Validar integridad de datos
node scripts/maintenance.js validate

# Generar estadísticas
node scripts/maintenance.js stats

# Crear backup completo
node scripts/maintenance.js backup

# Ejecutar actualización completa (RECOMENDADO)
node scripts/maintenance.js full-update 3 102
```

---

### 2. **Actualizar data.js** (`update-data-placeholders.js`)

Actualiza productos en `data.js` con imágenes y colores placeholder.

#### Uso:

```bash
# Actualizar productos 3-102 (por defecto)
node scripts/update-data-placeholders.js

# Actualizar rango personalizado
node scripts/update-data-placeholders.js 10 50
```

#### Qué hace:

- ✅ Actualiza imagen principal con placeholder blanco
- ✅ Actualiza hex de variantes a `#111111`
- ✅ Crea variantes dummy si no existen
- ✅ Crea backup automático antes de modificar
- ✅ Muestra log detallado de cambios

---

### 3. **Actualizar CSV** (`update-csv-placeholders.js`)

Actualiza `products_export.csv` con placeholders.

#### Uso:

```bash
# Validar estructura del CSV
node scripts/update-csv-placeholders.js validate

# Actualizar productos 3-102 (por defecto)
node scripts/update-csv-placeholders.js update

# Actualizar rango personalizado
node scripts/update-csv-placeholders.js update 10 50
```

#### Qué hace:

- ✅ Actualiza imágenes de variantes con placeholder
- ✅ Mantiene hex existentes o usa `#111111`
- ✅ Actualiza objeto `colorCodes` automáticamente
- ✅ Parser CSV robusto que maneja comillas correctamente
- ✅ Crea backup antes de modificar

---

## 🆕 Mejoras Implementadas

### **Sobre los Scripts Originales de Julius:**

#### 1. **Mejor Manejo de Errores**
```javascript
// Antes: Error genérico
catch (error) {
    console.error('Error:', error);
}

// Ahora: Error detallado con stack trace
catch (error) {
    console.error('❌ Error durante la actualización:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}
```

#### 2. **Backups Automáticos con Timestamp**
```javascript
// Antes: Backup simple
fs.writeFileSync('data.backup.js', content);

// Ahora: Backup con timestamp en carpeta dedicada
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `backups/data.js.${timestamp}.backup`;
fs.writeFileSync(backupPath, content);
```

#### 3. **Logging Detallado**
```javascript
// Antes: Log simple
console.log('Updated products');

// Ahora: Log detallado con emojis y estadísticas
console.log('📝 Actualizando producto ID 5: "Galaxy S25"');
console.log('  ✓ 3 variante(s) actualizada(s)');
console.log('\n✅ Actualización completada:');
console.log('   - Productos actualizados: 45');
console.log('   - Productos omitidos: 2');
```

#### 4. **Validación de Datos**
```javascript
// NUEVO: Validación antes de procesar
function validateProduct(product) {
    if (!product.id) {
        console.warn(`⚠️ Producto sin ID encontrado`);
        return false;
    }
    return true;
}
```

#### 5. **Configuración Centralizada**
```javascript
// NUEVO: Configuración en un solo lugar
const CONFIG = {
    dataPath: path.join(__dirname, '..', 'data.js'),
    idRange: { min: 3, max: 102 },
    placeholders: {
        image: "https://placehold.co/600x600/ffffff/ffffff.png",
        hex: "#111111"
    }
};
```

#### 6. **Argumentos de Línea de Comandos**
```bash
# Antes: Valores hardcodeados en el código
# Ahora: Argumentos flexibles
node update-data-placeholders.js 10 50
```

#### 7. **Sincronización de Colores** (NUEVO)
```javascript
// Extrae colores de data.js y los sincroniza con color-variables.js
function syncColors() {
    // Extrae colores únicos de productos
    // Combina con colores existentes
    // Actualiza color-variables.js
}
```

#### 8. **Validación de Integridad** (NUEVO)
```javascript
// Valida que todos los productos tengan datos correctos
function validateDataIntegrity() {
    // Verifica campos requeridos
    // Valida formato de hex
    // Valida URLs de imágenes
    // Reporta problemas encontrados
}
```

#### 9. **Estadísticas** (NUEVO)
```javascript
// Genera estadísticas detalladas del catálogo
function generateStats() {
    // Productos por categoría
    // Colores más usados
    // Promedio de variantes
}
```

---

## 📊 Comparación: Antes vs Ahora

| Característica | Script Original | Script Mejorado |
|----------------|----------------|-----------------|
| **Backups** | Manual | ✅ Automático con timestamp |
| **Logging** | Básico | ✅ Detallado con emojis |
| **Validación** | ❌ No | ✅ Completa |
| **Manejo de errores** | Básico | ✅ Robusto con stack trace |
| **Configuración** | Hardcodeada | ✅ Centralizada |
| **Argumentos CLI** | ❌ No | ✅ Sí |
| **Sincronización** | ❌ No | ✅ Sí (colores) |
| **Estadísticas** | ❌ No | ✅ Sí |
| **Modularidad** | Monolítico | ✅ Modular |

---

## 🚀 Flujo de Trabajo Recomendado

### **Actualización Completa (Recomendado)**

```bash
# 1. Ejecutar actualización completa
node scripts/maintenance.js full-update 3 102
```

Este comando ejecuta automáticamente:
1. ✅ Crea backup de todos los archivos
2. ✅ Actualiza `data.js` con placeholders
3. ✅ Actualiza `products_export.csv` con placeholders
4. ✅ Sincroniza colores en `color-variables.js`
5. ✅ Valida integridad de datos
6. ✅ Muestra resumen completo

### **Actualización Individual**

```bash
# Solo data.js
node scripts/maintenance.js update-data 3 102

# Solo CSV
node scripts/maintenance.js update-csv 3 102

# Solo sincronizar colores
node scripts/maintenance.js sync-colors
```

---

## 📋 Casos de Uso

### **Caso 1: Agregar Productos Nuevos sin Imágenes**

```bash
# 1. Agregar productos en admin.html (IDs 103-120)
# 2. Ejecutar actualización
node scripts/maintenance.js full-update 103 120
```

### **Caso 2: Validar Datos Antes de Deploy**

```bash
# Validar integridad
node scripts/maintenance.js validate

# Ver estadísticas
node scripts/maintenance.js stats
```

### **Caso 3: Sincronizar Colores Después de Ediciones**

```bash
# Después de editar colores en admin
node scripts/maintenance.js sync-colors
```

### **Caso 4: Backup Manual**

```bash
# Crear backup antes de cambios importantes
node scripts/maintenance.js backup
```

---

## 🔧 Configuración

### **Modificar Placeholders**

Editar en `scripts/maintenance.js`:

```javascript
const CONFIG = {
    placeholders: {
        image: "https://tu-url-personalizada.com/placeholder.png",
        hex: "#FF0000",  // Cambiar color
        defaultColor: "Sin Color"
    }
};
```

### **Modificar Rutas**

```javascript
const CONFIG = {
    paths: {
        data: path.join(__dirname, '..', 'data.js'),
        csv: path.join(__dirname, '..', 'products_export.csv'),
        colorVariables: path.join(__dirname, '..', 'color-variables.js'),
        backupDir: path.join(__dirname, '..', 'backups')
    }
};
```

---

## 📝 Logs de Ejemplo

### **Actualización Completa:**

```
🚀 ACTUALIZACIÓN COMPLETA

Rango: ID 3 - 102

============================================================
💾 Creando backup completo...

💾 Backup creado: backups/data.js.2025-12-10T19-45-00.backup
💾 Backup creado: backups/products_export.csv.2025-12-10T19-45-00.backup

============================================================
🚀 Iniciando actualización de productos...

✓ Archivo data.js leído correctamente
✓ 102 productos encontrados

📝 Actualizando producto ID 3: "Galaxy Z Flip7"
  ✓ 2 variante(s) actualizada(s)
📝 Actualizando producto ID 4: "Galaxy S25+"
  + Variante dummy creada

...

✅ Actualización completada:
   - Productos actualizados: 100
   - Productos omitidos: 0
   - Total procesados: 102

============================================================
🎨 Sincronizando colores...

✓ 45 colores únicos encontrados
  + Nuevo color: Azul Titanio (#3c5b8a)

✅ Sincronización completada:
   - Total de colores: 47
   - Colores nuevos: 2

============================================================
✅ ACTUALIZACIÓN COMPLETA FINALIZADA
```

---

## ⚠️ Notas Importantes

1. **Siempre se crean backups** antes de modificar archivos
2. **Los backups se guardan** en `backups/` con timestamp
3. **Los rangos de ID** son inclusivos (3-102 incluye ambos)
4. **La sincronización de colores** no elimina colores existentes
5. **La validación** solo reporta problemas, no los corrige

---

## 🐛 Solución de Problemas

### **Error: "Archivo no encontrado"**
```bash
# Verificar que estás en el directorio correcto
cd /ruta/a/Samsung\ Catalogo
node scripts/maintenance.js
```

### **Error: "Cannot find module"**
```bash
# Instalar dependencias (si las hay)
npm install
```

### **Backups ocupan mucho espacio**
```bash
# Limpiar backups antiguos manualmente
rm backups/*.backup
```

---

## 📚 Recursos Adicionales

- **Documentación de mejoras de Julius**: `MEJORAS_JULIUS.md`
- **Sistema de categorías**: `SISTEMA_CATEGORIAS.md`
- **Panel de administración**: `admin.html`

---

## 🎉 Créditos

**Scripts originales:** Julius  
**Mejoras implementadas:** Antigravity AI  
**Fecha:** 10 de Diciembre, 2025  
**Versión:** 2.6

---

## 📞 Soporte

Si encuentras algún problema:
1. Revisa los logs en consola
2. Verifica que los archivos existan
3. Comprueba los backups en `backups/`
4. Ejecuta `validate` para ver problemas de datos
