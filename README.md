# Samsung Catálogo 2026 - Sistema Completo

Sistema de gestión y visualización de catálogo de productos Samsung con panel de administración.

## 📁 Estructura del Proyecto

```
Samsung Catalogo/
├── catalog-template/          # 🎨 Template del catálogo (frontend)
│   ├── index.html            # Página del catálogo
│   ├── style.css             # Estilos
│   ├── script.js             # Lógica frontend
│   ├── data.js               # Datos de productos
│   └── README.md             # Documentación del template
│
├── admin.html                # 🔧 Panel de administración
├── admin.js                  # Lógica del admin
├── color-variables.js        # Variables globales de colores
│
├── scripts/                  # 📜 Scripts de utilidad
│   ├── download_csv.js       # Descargar CSV desde Google Sheets
│   ├── update_from_local_csv.js  # Actualizar data.js desde CSV
│   ├── update_prices.js      # Actualizar precios masivamente
│   └── extract_colors.js     # Extraer colores únicos
│
└── server.js                 # Servidor local (opcional)
```

## 🎯 Componentes Principales

### 1. **Catalog Template** (`catalog-template/`)
Template estático del catálogo de productos para el cliente final.
- Visualización de productos
- Filtros y búsqueda
- Selector de colores
- Responsive design

### 2. **Panel de Administración** (`admin.html`)
Sistema de gestión completo con:
- **Base de Datos**: Ver y editar todos los productos
- **Catálogos**: Gestionar catálogos por categoría
- **Variables**: Gestionar colores globales

### 3. **Variables de Colores** (`color-variables.js`)
Sistema centralizado de colores:
- 30 colores predefinidos
- Sincronización automática
- Gestión desde el admin

## 🚀 Flujo de Trabajo

### Opción 1: Gestión desde Admin (Recomendado)

1. **Abrir Admin**
   ```
   Abre admin.html en tu navegador
   ```

2. **Gestionar Productos**
   - Ve a "Base de Datos"
   - Agrega/Edita/Elimina productos
   - Los colores se seleccionan de las variables

3. **Gestionar Colores**
   - Ve a "Variables"
   - Agrega/Edita colores
   - Los cambios se aplican automáticamente

4. **Generar Catálogo**
   - Ve a "Catálogos"
   - Selecciona una categoría
   - Click en "Exportar Excel"
   - Guarda el archivo

5. **Actualizar Template**
   - Ejecuta: `npm run update-data`
   - Copia `data.js` a `catalog-template/`

### Opción 2: Desde Google Sheets

1. **Descargar CSV**
   ```bash
   node scripts/download_csv.js
   ```

2. **Actualizar Data**
   ```bash
   npm run update-data
   ```

3. **Copiar a Template**
   ```bash
   Copy-Item data.js catalog-template/
   ```

## 📊 Gestión de Catálogos

El sistema permite crear catálogos por categoría:

- 📱 Smartphones
- 📱 Tablets
- ⌚ Smartwatches
- 🎧 Buds
- 💻 Laptops
- 📺 Televisores
- 🖥️ Monitores
- 🧺 Lavadoras
- ❄️ Refrigeradores
- 🏠 Línea Blanca
- 🔌 Accesorios

Cada catálogo se exporta como Excel independiente.

## 🎨 Sistema de Variables de Colores

### Ventajas:
- ✅ Centralizado - Un solo lugar para todos los colores
- ✅ Automático - Los hex se llenan solos al seleccionar
- ✅ Consistente - Imposible tener duplicados
- ✅ Trazable - Sabes dónde se usa cada color

### Uso:
1. Define colores en "Variables"
2. Al agregar productos, selecciona del dropdown
3. El hex se llena automáticamente
4. Si cambias un color, se actualiza en todos los productos

## 🔄 Modo Preview

Antes de exportar, puedes previsualizar:
1. Ve a "Catálogos"
2. Click en "👁️ Previsualizar"
3. Se abre el catálogo con los datos actuales
4. Banner naranja indica modo preview

## 📝 Scripts Disponibles

```bash
# Iniciar servidor local
npm start

# Modo desarrollo con auto-reload
npm run dev

# Actualizar data.js desde CSV local
npm run update-data
```

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Admin**: JavaScript (Vanilla)
- **Export**: SheetJS (xlsx)
- **Backend**: Node.js (opcional, solo para scripts)

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Listo para usar
# Abre admin.html o catalog-template/index.html
```

## 🎯 Próximos Pasos

1. ✅ Sistema de variables implementado
2. ✅ CRUD completo de productos
3. ✅ Exportación por categorías
4. ⏳ Persistencia de datos (guardar cambios automáticamente)
5. ⏳ Sincronización con Google Sheets desde admin
6. ⏳ Sistema de usuarios y autenticación

## 📄 Licencia

Proyecto interno Samsung Bolivia

---

**Versión**: 2.2
**Última actualización**: Diciembre 2025
