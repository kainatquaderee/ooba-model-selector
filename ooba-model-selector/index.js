import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

const extensionName = "ooba-model-selector";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

const defaultSettings = {
  lastModel: "",
  baseUrl: "http://localhost:5000"
};

function ensureSettings() {
  extension_settings[extensionName] ??= {};
  Object.assign(extension_settings[extensionName], defaultSettings, extension_settings[extensionName]);
  saveSettingsDebounced();
}

function getBaseUrl() {
  const raw = (extension_settings[extensionName].baseUrl || defaultSettings.baseUrl).trim();
  return raw.replace(/\/+$/, ""); // remove trailing slash
}



// --- Slash Command Registration ---

// ensure panelVisible is tracked in settings (add to defaultSettings if not already)
defaultSettings.panelVisible = defaultSettings.panelVisible ?? true;

// Slash command to toggle the draggable UI
registerSlashCommand(
  'hide-obba-loader',
  () => {
    // make sure settings exist
    extension_settings[extensionName] ??= {};
    // toggle saved preference
    extension_settings[extensionName].panelVisible = !extension_settings[extensionName].panelVisible;
    saveSettingsDebounced();

    // apply immediately if the element exists in DOM
    const $deck = $("#ooba-deck");
    if ($deck.length) {
      if (extension_settings[extensionName].panelVisible) $deck.show();
      else $deck.hide();
    }

    return `Ooba loader is now ${extension_settings[extensionName].panelVisible ? "visible" : "hidden"}.`;
  },
  [], // no args
  'Toggle the Ooba model loader panel (show/hide).',
  false,
  true
);

// alias for convenience
registerSlashCommand(
  'toggle-obamodel',
  () => {
    extension_settings[extensionName] ??= {};
    extension_settings[extensionName].panelVisible = !extension_settings[extensionName].panelVisible;
    saveSettingsDebounced();

    const $deck = $("#ooba-deck");
    if ($deck.length) {
      if (extension_settings[extensionName].panelVisible) $deck.show();
      else $deck.hide();
    }

    return `Ooba loader is now ${extension_settings[extensionName].panelVisible ? "visible" : "hidden"}.`;
  },
  [],
  'Alias for /hide-obba-loader',
  false,
  true
);

import { registerSlashCommand } from '../../../slash-commands.js';
registerSlashCommand(
    'obamodel',
    async (modelName) => {
        if (!modelName) return '❌ Please provide a model name';
        try {
            // save last used
            extension_settings[extensionName].lastModel = modelName;
            extension_settings[extensionName].previousModels ??= [];
            extension_settings[extensionName].previousModels.unshift(modelName);
            extension_settings[extensionName].previousModels = [...new Set(extension_settings[extensionName].previousModels)].slice(0, 20);
            saveSettingsDebounced();

            // call your loader
            await postLoad(modelName);

            return `Attempted to load model: ${modelName}`;
        } catch (err) {
            console.error('obamodel command error:', err);
            return `Error loading model: ${err?.message ?? err}`;
        }
    },
    ['string:modelName'], // args
    'Load a model by name, e.g. /obamodel "mistral-7b-q4f"',
    true, // unnamed argument is required
    true  // show in help
);


async function postLoad(modelName) {
  if (!modelName || !modelName.trim()) {
    toastr.error("Please enter a model name.", "Ooba Model Loader");
    return;
  }
  const base = getBaseUrl();
  const url = `${base}/v1/internal/model/load`;
  const body = {
    model_name: modelName,
    args: { additionalProp1: {} },
    settings: { additionalProp1: {} }
  };

  $("#ooba-status").text(`Sending load request for "${modelName}"...`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const txt = await res.text();
    if (!res.ok) {
      console.error("Load failed:", res.status, txt);
      $("#ooba-status").text(`Load failed: ${res.status} ${res.statusText}`);
      toastr.error(`Load failed (${res.status}) — see console`, "Ooba Model Loader");
      return;
    }

    $("#ooba-status").text(`Load request sent — server responded OK.`);
    toastr.success(`Load request sent for ${modelName}`, "Ooba Model Loader");
    console.log("load response:", txt);
  } catch (err) {
    console.error("postLoad error:", err);
    $("#ooba-status").text(`Failed to send request: ${err.message}`);
    toastr.error("Network error — check CORS / server", "Ooba Model Loader");
  }
}

function makeDraggable() {
  let dragging = false;
  let offsetX = 0, offsetY = 0;
  const $deck = $("#ooba-deck");
  const $hdr = $("#ooba-deck-header");

  $hdr.on("mousedown", function (e) {
    dragging = true;
    const pos = $deck.offset();
    offsetX = e.pageX - pos.left;
    offsetY = e.pageY - pos.top;
    $("body").css("user-select", "none");
  });

  $(document).on("mousemove", function (e) {
    if (!dragging) return;
    $deck.css({
      left: Math.max(6, e.pageX - offsetX),
      top: Math.max(6, e.pageY - offsetY),
      right: "auto"
    });
  });

  $(document).on("mouseup", function () {
    if (dragging) {
      dragging = false;
      $("body").css("user-select", "");
    }
  });
}

jQuery(async () => {
  ensureSettings();

  // load the HTML UI from example.html (same folder)
  const html = await $.get(`${extensionFolderPath}/example.html`);
  $("body").append(html);
    // apply saved visibility state
    if (extension_settings[extensionName].panelVisible === false) {
      $("#ooba-deck").hide();
    } else {
      $("#ooba-deck").show();
    }
  // init draggable
  makeDraggable();

  // fill inputs from saved settings
  $("#ooba-model-input").val(extension_settings[extensionName].lastModel || "");
  $("#ooba-baseurl").val(extension_settings[extensionName].baseUrl || defaultSettings.baseUrl);

  // load button
  $("#ooba-load-btn").on("click", function () {
    const model = $("#ooba-model-input").val().trim();
    extension_settings[extensionName].lastModel = model;
    saveSettingsDebounced();
    postLoad(model);
  });

  // save base URL when changed
  $("#ooba-baseurl").on("change input", function () {
    const v = $("#ooba-baseurl").val().trim() || defaultSettings.baseUrl;
    extension_settings[extensionName].baseUrl = v;
    saveSettingsDebounced();
  });

  // convenience: press Enter in model input -> load
  $("#ooba-model-input").on("keypress", function (e) {
    if (e.which === 13) { // Enter
      $("#ooba-load-btn").click();
      return false;
    }
  });

  // refresh button simply clears status and re-fills input from saved value
  $("#ooba-refresh-btn").on("click", function () {
    $("#ooba-status").text("");
    $("#ooba-model-input").val(extension_settings[extensionName].lastModel || "");
    toastr.info("Input refreshed from saved settings", "Ooba Model Loader");
  });
});


