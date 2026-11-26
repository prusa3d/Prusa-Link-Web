# One entry point for the web app, the firmware that embeds it, and the
# simulator that runs that firmware. `make help` lists the targets.

BUDDY   ?= ../Prusa-Firmware-Buddy-prusalink2
DEVENV  ?= ../buddy-dev-env
PRINTER ?= mk4
PORT    ?= 8180
API_KEY ?= devapikey123456

FW_BUILD_DIR = $(BUDDY)/build/$(PRINTER)_debug_noboot
# corepack runs the pnpm version package.json pins, without a global install.
PNPM = corepack pnpm
NODE_MIN = 22.12
MOCK_KEY = mockapikey12345
DEV_PORT ?= 5957

.DEFAULT_GOAL := start
.PHONY: start help node deps setup spec-sync spec-update spec-check dev dev-sim storybook \
        check test e2e demo demo-e2e package serve build fw-web fw-build sim ci all

start: ## Default: install what is missing, open the app on the mock printer
	@DEV_PORT=$(DEV_PORT) PORT=$(DEV_PORT) MOCK_KEY=$(MOCK_KEY) scripts/start.sh

help: ## List targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-12s %s\n", $$1, $$2}'

node:
	@command -v node >/dev/null || { echo "Node.js $(NODE_MIN)+ is needed (nvm install, see .nvmrc)"; exit 1; }
	@node -e 'const [a,b]=process.versions.node.split(".").map(Number),[x,y]="$(NODE_MIN)".split(".").map(Number);if(a<x||(a===x&&b<y)){console.error("Node.js $(NODE_MIN)+ is needed, found "+process.version+" (nvm use)");process.exit(1)}'

# Reinstalls only when package.json or the lockfile changed.
node_modules/.modules.yaml: package.json pnpm-lock.yaml | node
	$(PNPM) install
	@touch $@

deps: node_modules/.modules.yaml

setup: deps ## Also install the Playwright browser (for tests)
	$(PNPM) exec playwright install chromium
	$(PNPM) spec:sync

spec-sync: deps ## Make spec/openapi.yaml match the pin in spec/source.json
	$(PNPM) spec:sync

spec-update: deps ## Move the spec pin to the newest upstream commit
	$(PNPM) spec:update

spec-check: ## Fail if upstream has a newer spec than the pin
	$(PNPM) spec:check

dev: deps ## App on the mock printer, without opening a browser
	$(PNPM) dev --port $(DEV_PORT)

dev-sim: deps ## App against the running simulator (make sim in another terminal)
	PRINTER_URL=http://127.0.0.1:$(PORT) $(PNPM) dev --port $(DEV_PORT) --open '/#key=$(API_KEY)'

storybook: deps ## Component stories
	$(PNPM) storybook

check: deps ## Lint, format, type-check, unit and component tests
	$(PNPM) check

test: deps ## Unit and component tests
	$(PNPM) test

e2e: deps ## Playwright against the mock printer
	$(PNPM) test:e2e

build: deps ## dist/<printer>/index.html for every printer, with the size budget check
	$(PNPM) build

fw-web: build ## Copy every printer build and the icons into the firmware checkout
	node scripts/fw-web.ts $(BUDDY)

fw-build: fw-web ## Build PRINTER's debug noboot firmware with this web app
	cd $(BUDDY) && .venv/bin/python utils/build.py --preset $(PRINTER) \
		--build-type debug --bootloader no --skip-bootstrap

package: ## Every printer's page, zipped for releases: share/prusalink-web-<version>.zip
	$(PNPM) build
	node scripts/package.ts

demo: deps ## Browser-only demo on the mock printer, for GitHub Pages (dist-demo/)
	$(PNPM) build:demo

demo-e2e: deps ## Playwright against the demo build, served under /Prusa-Link-Web/
	$(PNPM) test:e2e:demo

serve: ## Built page against a real printer: make serve PRINTER_URL=http://192.168.1.20 [VARIANT=xl]
	node scripts/serve.mjs $(PRINTER_URL) $(or $(VARIANT),generic) $(or $(SERVE_PORT),5970)

sim: ## Run PRINTER's firmware from BUDDY in the simulator on PORT
	BUDDY_REPO=$(abspath $(BUDDY)) $(BUDDY)/.venv/bin/python $(DEVENV)/sim.py $(PRINTER) \
		--port $(PORT) --build-dir $(FW_BUILD_DIR)

ci: spec-sync check build e2e demo-e2e ## What CI runs

all: ci fw-build ## Everything, ending with a firmware image
