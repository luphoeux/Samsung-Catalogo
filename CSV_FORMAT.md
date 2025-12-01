# CSV Format Documentation

Este documento describe el formato del archivo CSV que se utiliza para importar productos al catálogo Samsung.

## Estructura de Columnas

El CSV debe tener las siguientes columnas en este orden exacto:

1. **id** (número): ID único del producto
2. **name** (texto): Nombre del producto
3. **category** (texto): Categoría del producto
   - Valores válidos: `smartphones`, `tablets`, `smartwatches`, `buds`, `laptops`, `accessories`, `televisions`, `monitors`, `washing_machines`, `refrigerators`, `kitchen_cleaning`
4. **price** (número): Precio actual del producto en Bs
5. **originalPrice** (número): Precio original (antes de descuento) en Bs
6. **link** (texto): URL del producto en la tienda oficial
7. **description** (texto): Descripción breve del producto
8. **badge** (texto): Texto del badge/etiqueta (opcional, puede estar vacío)
9. **storage** (JSON array): Opciones de almacenamiento disponibles
   - Formato: `["128 GB","256 GB"]`
   - Puede estar vacío: `[]`

### Variantes de Color (Columnas 10-29)

Las variantes se definen en columnas separadas para cada color (hasta 5 variantes):

10. **SKU1** (texto): SKU de la variante 1 (por defecto)
11. **Color1** (texto): Nombre del color de la variante 1
12. **Imagen1** (texto): URL de la imagen de la variante 1
13. **Hex1** (texto): Código hexadecimal del color 1 (ej: #1C2E4A)
14. **SKU2** (texto): SKU de la variante 2 (opcional)
15. **Color2** (texto): Nombre del color de la variante 2 (opcional)
16. **Imagen2** (texto): URL de la imagen de la variante 2 (opcional)
17. **Hex2** (texto): Código hexadecimal del color 2 (opcional)
18. **SKU3** (texto): SKU de la variante 3 (opcional)
19. **Color3** (texto): Nombre del color de la variante 3 (opcional)
20. **Imagen3** (texto): URL de la imagen de la variante 3 (opcional)
21. **Hex3** (texto): Código hexadecimal del color 3 (opcional)
22. **SKU4** (texto): SKU de la variante 4 (opcional)
23. **Color4** (texto): Nombre del color de la variante 4 (opcional)
24. **Imagen4** (texto): URL de la imagen de la variante 4 (opcional)
25. **Hex4** (texto): Código hexadecimal del color 4 (opcional)
26. **SKU5** (texto): SKU de la variante 5 (opcional)
27. **Color5** (texto): Nombre del color de la variante 5 (opcional)
28. **Imagen5** (texto): URL de la imagen de la variante 5 (opcional)
29. **Hex5** (texto): Código hexadecimal del color 5 (opcional)

30. **colorCodes** (JSON object): OBSOLETO - Ahora usa las columnas Hex1-5
    - Mantener como `{}` vacío
    - Las columnas Hex1-5 tienen prioridad sobre este campo

## Notas Importantes sobre Variantes

### Variante por Defecto

- **La variante 1 (SKU1, Color1, Imagen1, Hex1) es OBLIGATORIA** y se mostrará por defecto
- Las variantes 2-5 son opcionales
- Si un producto tiene solo un color, solo llena SKU1, Color1, Imagen1 y Hex1
- Deja las columnas de variantes no usadas vacías

### Ejemplo de Producto con 2 Colores

```
SKU1: SM-F966BDBKCHO
Color1: Azul Metálico
Imagen1: https://samsung-bolivia.s3.amazonaws.com/...image1.png
Hex1: #1C2E4A
SKU2: SM-F966BZKKCHO
Color2: Negro
Imagen2: https://samsung-bolivia.s3.amazonaws.com/...image2.png
Hex2: #000000
SKU3-5: (vacío)
Color3-5: (vacío)
Imagen3-5: (vacío)
Hex3-5: (vacío)
```

## Ejemplo de Fila CSV Completa

```csv
1,"Galaxy Z Fold7","smartphones",100,500,"https://shop.samsung.com.bo/smartphones/galaxy-z/galaxy-z-fold7-blue-shadow-512gb-sm-f966bdbkcho","Diseño ultra delgado 8.9mm, Cámara 200MP, Snapdragon 8 Elite y Galaxy AI.","1234","[""512 GB""]","SM-F966BDBKCHO","Azul Metálico","https://samsung-bolivia.s3.amazonaws.com/product-family-item-image-image/square/product-family-item-image-image_REVFsxTyaj9XMYmDK7Qf.png","#1C2E4A","SM-F966BZKKCHO","Negro","https://samsung-bolivia.s3.amazonaws.com/product-family-item-image-image/original/product-family-item-image-image_x79DA312UjEYKePb50Xd.png","#000000","","","","","","","","","","","","","{}"
```

## Reglas de Formato

1. **Comillas dobles**: Los valores de texto que contienen comas deben estar entre comillas dobles
2. **JSON válido**: Las columnas `storage` y `colorCodes` deben contener JSON válido
3. **Escape de comillas**: Dentro de campos JSON, las comillas dobles deben escaparse duplicándolas: `""`
4. **Variante 1 obligatoria**: Siempre debe haber al menos SKU1, Color1 e Imagen1
5. **Orden de variantes**: La variante 1 es la que se muestra por defecto en el catálogo
6. **Códigos hexadecimales**: Los valores Hex deben empezar con # (ej: #1C2E4A, #000000)

## Exportación desde Google Sheets

Para exportar correctamente desde Google Sheets:

1. Asegúrate de que las columnas JSON estén formateadas como texto
2. Usa la función `ARRAYTOTEXT()` o similar para convertir arrays a JSON
3. Crea 20 columnas para las variantes: SKU1, Color1, Imagen1, Hex1, SKU2, Color2, Imagen2, Hex2, etc.
4. Publica la hoja como CSV: Archivo → Compartir → Publicar en la web → CSV
5. Copia la URL generada y úsala en el código

## Validación

El código JavaScript validará automáticamente:
- Que el JSON sea válido en las columnas correspondientes
- Que los números sean numéricos
- Que la variante 1 esté completa (SKU1, Color1, Imagen1)
- Los códigos Hex se usan para mostrar los círculos de color correctamente

Si hay errores, se mostrarán en la consola del navegador.
