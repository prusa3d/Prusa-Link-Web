# Prusa-Connect-Local

This is a printer connect webservice. It is compatible with another 3D printer services, so many applications which use this service.

### Install

```bash
npm install
```

## OpenAPI specification:

### Run api

- Documentation (ReDoc)
- Documentation (SwaggerUI)
- Swagger Editor

```bash
npm run api:start
```

### Validate api

```bash
npm run api:test
```

## UI

### Run ui sla

```bash
npm run ui:start
```

### Run ui fdm

```bash
npm run ui:start-mini
```

### Build dev

```bash
npm run ui:dev
```

### Build ui

```bash
rm -fr ./dist
npm run ui:build
```

### update translations ui

```bash
npm run ui:translations
```
