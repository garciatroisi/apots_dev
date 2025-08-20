# Bulk Collection Analysis

Este conjunto de scripts te permite analizar eficientemente múltiples colecciones (hasta 700+) para obtener detalles de todos los assets de una dirección específica.

## 🚀 Características Principales

- **Procesamiento en lotes**: Procesa colecciones en grupos de 50 para optimizar rendimiento
- **Control de concurrencia**: Limita las peticiones concurrentes para evitar sobrecarga
- **Rate limiting**: Evita ser bloqueado por demasiadas peticiones
- **Manejo de errores**: Continúa procesando aunque algunas colecciones fallen
- **Progreso en tiempo real**: Muestra el progreso del análisis
- **Resultados detallados**: Información completa de cada asset encontrado

## 📁 Archivos

- `bulk-collection-assets.ts` - Script principal de análisis masivo
- `collections-loader.ts` - Utilidades para cargar colecciones desde archivos
- `generate-collections.ts` - Generador de colecciones de ejemplo
- `get-wallet-assets.ts` - Análisis de todos los assets de una wallet
- `get-wallet-assets-cli.ts` - Versión CLI del análisis de wallet

## 🛠️ Configuración

### 1. Configurar la dirección del usuario

Edita `bulk-collection-assets.ts` y cambia la variable `USER_ADDRESS`:

```typescript
const USER_ADDRESS = "0xTU_DIRECCION_AQUI";
```

### 2. Configurar parámetros de rendimiento

Puedes ajustar estos valores según tus necesidades:

```typescript
const BATCH_SIZE = 50; // Colecciones por lote
const TOKEN_BATCH_SIZE = 100; // Tokens por petición
const MAX_CONCURRENT_REQUESTS = 10; // Peticiones concurrentes máximas
```

## 📋 Uso

### Opción 1: Usar colecciones de ejemplo

```bash
# Generar 700 colecciones de ejemplo
npm run generate-collections

# Ejecutar análisis masivo
npm run bulk-analysis
```

### Opción 2: Usar tus propias colecciones

1. Crea un archivo `collections.json` con el formato:

```json
[
  {
    "address": "0x1234567890abcdef...",
    "name": "Mi Colección 1"
  },
  {
    "address": "0xabcdef1234567890...",
    "name": "Mi Colección 2"
  }
]
```

2. Ejecuta el análisis:

```bash
npm run bulk-analysis
```

### Opción 3: Usar el cargador de colecciones directamente

```bash
npm run collections-loader
```

### Opción 4: Analizar todos los assets de una wallet

```bash
# Usar dirección hardcodeada
npm run wallet-assets

# Especificar dirección como parámetro
npm run wallet-assets-cli 0xTU_DIRECCION_AQUI
```

## 📊 Resultados

### Para Análisis de Colecciones Específicas

El script mostrará:

1. **Resumen general**:

   - Total de colecciones procesadas
   - Total de assets encontrados
   - Colecciones con errores

2. **Resumen por colección**:

   - Estado de cada colección (✅ con assets, ⚠️ sin assets, ❌ con errores)
   - Número de assets por colección

3. **Detalles de assets**:
   - Nombre del token
   - Token ID
   - URI del token
   - Propiedades del token
   - Información del digital asset

### Para Análisis de Wallet Completa

El script mostrará:

1. **Resumen general**:

   - Total de assets en la wallet
   - Total de colecciones únicas
   - Tiempo de análisis

2. **Resumen por colección**:

   - Colecciones ordenadas por cantidad de assets
   - Número de assets por colección

3. **Detalles de assets**:
   - Nombre del token
   - Colección a la que pertenece
   - Token ID y cantidad
   - URI del token
   - Propiedades detalladas (si están habilitadas)

## ⚡ Optimizaciones de Rendimiento

### Rate Limiting

- Controla automáticamente el número de peticiones concurrentes
- Evita sobrecargar la API de Aptos

### Procesamiento en Lotes

- Procesa colecciones en grupos de 50
- Muestra progreso en tiempo real
- Permite interrumpir y reanudar fácilmente

### Paginación Eficiente

- Obtiene tokens en lotes de 100
- Maneja automáticamente la paginación completa

## 🔧 Personalización

### Cambiar el archivo de colecciones

Edita `bulk-collection-assets.ts`:

```typescript
const COLLECTIONS_FILE = "./tu-archivo-collections.json";
```

### Modificar el formato de salida

Puedes descomentar estas líneas en `main()` para guardar resultados:

```typescript
// await fs.writeFile('./analysis-results.json', JSON.stringify(results, null, 2));
```

### Ajustar parámetros de rendimiento

Para conexiones más lentas, reduce la concurrencia:

```typescript
const MAX_CONCURRENT_REQUESTS = 5; // Menos peticiones concurrentes
const BATCH_SIZE = 25; // Lotes más pequeños
```

### Configurar análisis de wallet

En `get-wallet-assets.ts` puedes ajustar:

```typescript
const SHOW_DETAILED_INFO = true; // Set to false for faster execution
const BATCH_SIZE = 100; // Tokens por petición
const MAX_CONCURRENT_REQUESTS = 10; // Peticiones concurrentes
```

## 🐛 Solución de Problemas

### Error de rate limiting

- Reduce `MAX_CONCURRENT_REQUESTS`
- Aumenta el tiempo entre peticiones

### Memoria insuficiente

- Reduce `BATCH_SIZE`
- Procesa menos colecciones por vez

### Timeouts

- Verifica tu conexión a internet
- Considera usar un servidor más cercano

## 📈 Monitoreo

El script muestra:

- Progreso en tiempo real
- Tiempo transcurrido
- Colecciones procesadas
- Errores encontrados

## 🔄 Reanudar Procesamiento

Si necesitas interrumpir y reanudar:

1. Guarda los resultados parciales
2. Modifica la lista de colecciones para excluir las ya procesadas
3. Ejecuta nuevamente el script

## 📝 Ejemplo de Salida

```
🚀 Starting bulk collection analysis...
🌐 Network: mainnet
👤 User Address: 0xf0c680055d459b5f260672e03e0482077d1f61daa664d6369b0a00b368b309f3
📚 Total Collections: 700
⚙️  Batch Size: 50
🔄 Max Concurrent Requests: 10

📦 Processing batch 1/14 (50 collections)
🔍 Processing collection: Sample Collection 1
   ⚠️  No tokens found in collection: Sample Collection 1
   ✅ Completed collection: Sample Collection 1

📈 Progress: 50/700 (7.1%) - Elapsed: 45.2s

==========================================
📊 BULK COLLECTION ANALYSIS RESULTS
==========================================
👤 User Address: 0xf0c680055d459b5f260672e03e0482077d1f61daa664d6369b0a00b368b309f3
📚 Collections Processed: 700
🎯 Total Assets Found: 15
✅ Collections with Assets: 3
❌ Collections with Errors: 0
```
