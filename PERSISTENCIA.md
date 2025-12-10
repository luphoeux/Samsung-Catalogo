# Sistema de Persistencia de Datos

## 🔄 Cómo Funciona

El sistema de administración ahora guarda **automáticamente** todos los cambios en el navegador usando `localStorage`.

### Guardado Automático

Cada vez que realizas una acción, los datos se guardan automáticamente después de 1 segundo:

- ✅ Agregar producto → Auto-guardado
- ✅ Editar producto → Auto-guardado  
- ✅ Eliminar producto → Auto-guardado
- ✅ Agregar color → Auto-guardado
- ✅ Editar color → Auto-guardado
- ✅ Eliminar color → Auto-guardado

### Indicador de Estado

En la barra lateral verás:
```
Estado
Último guardado: 10/12/2025 12:45:30
```

Esto te indica cuándo se guardaron los cambios por última vez.

## 📥 Exportar Cambios

Para aplicar los cambios al catálogo público:

### 1. Exportar data.js
```
Click en "📥 Exportar data.js"
↓
Se descarga data.js actualizado
↓
Reemplazar en catalog-template/
```

### 2. Exportar color-variables.js
```
Click en "🎨 Exportar colores"
↓
Se descarga color-variables.js actualizado
↓
Reemplazar en la raíz del proyecto
```

## 🔄 Resetear Datos

Si quieres volver a los datos originales:

```
Click en "🔄 Resetear datos"
↓
Confirmar
↓
Se eliminan todos los cambios guardados
↓
Recarga con los datos de data.js original
```

⚠️ **Advertencia**: Esto elimina TODOS los cambios no exportados.

## 💾 Almacenamiento

### ¿Dónde se guardan los datos?

- **localStorage del navegador** - Los datos persisten entre sesiones
- **Límite**: ~5-10MB (suficiente para miles de productos)
- **Privado**: Solo en tu navegador, no se comparte

### ¿Qué se guarda?

1. **Productos** (`samsung_catalog_products`)
   - Todos los productos con sus variantes
   - Precios, descripciones, imágenes
   - SKUs y colores

2. **Variables de Colores** (`samsung_catalog_colors`)
   - Todos los colores definidos
   - Códigos hex asociados

## 🔒 Seguridad

### Backup Automático

Los datos originales están en:
- `data.js` - Productos originales
- `color-variables.js` - Colores originales

Siempre puedes resetear si algo sale mal.

### Exportación Regular

**Recomendación**: Exporta `data.js` regularmente para tener backups:

1. Después de cambios importantes
2. Al final del día
3. Antes de hacer cambios masivos

## 🚀 Flujo de Trabajo Completo

```
1. Abrir admin.html
   ↓
2. Cargar datos (localStorage o data.js)
   ↓
3. Hacer cambios
   ↓
4. Auto-guardado (1 segundo después)
   ↓
5. Ver "Último guardado: ..."
   ↓
6. Exportar data.js cuando estés listo
   ↓
7. Copiar a catalog-template/
   ↓
8. ¡Catálogo actualizado!
```

## 🛠️ Solución de Problemas

### Los cambios no se guardan

1. Verifica que localStorage esté habilitado en tu navegador
2. Revisa la consola del navegador (F12) para errores
3. Intenta resetear y volver a intentar

### El almacenamiento está lleno

1. Exporta data.js (backup)
2. Click en "Resetear datos"
3. Importa solo los productos necesarios

### Perdí mis cambios

Si no exportaste:
- Los cambios están en localStorage
- Abre el mismo navegador en la misma computadora
- Los datos deberían estar ahí

Si exportaste:
- Tienes el archivo data.js descargado
- Reemplázalo en el proyecto
- Abre admin.html nuevamente

## 📊 Ventajas del Sistema

✅ **Sin servidor** - Todo funciona en el navegador
✅ **Instantáneo** - Guardado en menos de 1 segundo
✅ **Automático** - No necesitas recordar guardar
✅ **Seguro** - Siempre puedes resetear
✅ **Portable** - Exporta y comparte fácilmente

## ⚡ Próximas Mejoras

- [ ] Sincronización con Google Sheets
- [ ] Historial de cambios (undo/redo)
- [ ] Exportación automática programada
- [ ] Backup en la nube
