# Ooba Model Selector - SillyTavern Extension

A lightweight SillyTavern extension that adds a draggable UI panel to load Ooba-style models via a local backend and provides convenient slash commands for loading models and toggling the panel.

---

## Features

- Draggable, resizable UI panel for model management
- Enter model name manually and send load request to your Ooba backend
- Save last-used model and base URL in persistent settings
- Slash commands for quick model loading:
  - `/obamodel "model-name"` — load a specific model
  - `/hide-obba-loader` — toggle (hide/show) the draggable panel
  - `/toggle-obamodel` — alias for `/hide-obba-loader`
- Status updates and notifications via **toastr**

---

## Installation

1. **Clone the extension repository** into your SillyTavern `scripts/extensions/third-party/` folder:

```bash
cd path/to/sillytavern/scripts/extensions/third-party/
git clone https://github.com/kainatquaderee/ooba-model-selector
