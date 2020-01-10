# Prusa-Connect-Web
This is a printer connect webservice. It is compatible with another 3D printer services, so many applications which use this service.

### Install
```bash
npm install
```

## OpenAPI specification:

### Run api dev
  - Documentation (ReDoc)
  - Documentation (SwaggerUI)
  - Swagger Editor
```bash
npm run api:dev
```

### Validate api
```bash
npm run api:test
```

## UI

### Run ui dev
```bash
npm run ui:dev
```

### Build ui
```bash
npm run ui:build
```

#### First time (create the .cache):
```bash
npm run ui:build
rm -fr ./dist
npm run ui:build
```

### access-control-allow-origin
The browser does not permit fetch data from a different port, then ./scripts/proxy.js resolves it (proxy: 8000 -> 8080). 