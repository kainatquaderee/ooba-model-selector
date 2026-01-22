import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";
import { registerSlashCommand } from '../../../slash-commands.js';
import { SlashCommand } from  "../../../slash-commands/SlashCommand.js";
import { SlashCommandParser } from "../../../slash-commands/SlashCommandParser.js";
import { ARGUMENT_TYPE,SlashCommandArgument } from "../../../slash-commands/SlashCommandArgument.js"

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
//get oba model.

//uncomment those imports if not added already
//import { extension_settings } from "../../../extensions.js";
//import { saveSettingsDebounced } from "../../../../script.js";
//import { registerSlashCommand } from '../../../slash-commands.js';
//import { SlashCommand } from  "../../../slash-commands/SlashCommand.js";
//import { SlashCommandParser } from "../../../slash-commands/SlashCommandParser.js";
//import { ARGUMENT_TYPE,SlashCommandArgument } from "../../../slash-commands/SlashCommandArgument.js"

SlashCommandParser.addCommandObject(SlashCommand.fromProps({ name: 'get-oba-model',
    callback: callback_getModelName, //or to a function name
    aliases: [''], //command similer
    returns: 'current model name', //what it returns
    namedArgumentList: [],
    unnamedArgumentList: [],
    helpString: `
        <div>
           "".
        </div>
        <div>
            <strong>Example:</strong>
            <ul>
                <li>
                    <pre><code class="language-stscript">"/get-oba-model"</code></pre>
                    returns ""
                </li>
                <li>
                    <pre><code class="language-stscript"></code></pre>
                </li>
            </ul>
        </div>
    `,
}));
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


SlashCommandParser.addCommandObject(SlashCommand.fromProps({ name: 'obamodel',
    callback: postLoad,
    aliases: [''],
    returns: '',
    namedArgumentList: [],
    unnamedArgumentList: [
        SlashCommandArgument.fromProps({ description: 'model name',
            typeList: ARGUMENT_TYPE.STRING,
            isRequired: true,
        }),
    ],
    helpString: `
        <div>
           loads oba model
        </div>
        <div>
            <strong>Example:</strong>
            <ul>
                <li>
                    <pre><code class="language-stscript">/obamodel "RP-king-12b-II.Q3_K_L.gguf"</code></pre>
                    returns ""
                </li>
                <li>
                    <pre><code class="language-stscript"></code></pre>
                    returns ""
                </li>
            </ul>
        </div>
    `,
}));
/*
registerSlashCommand(
    'obamodel',
    async (modelName) => {
        if (!modelName) return '❌ Please provide a model name';
        modelName = modelName;
        toastr.info(`modelname: ${modelName}`);
        try {
            // save last used
            extension_settings[extensionName].lastModel = modelName;
            extension_settings[extensionName].previousModels ??= [];
            extension_settings[extensionName].previousModels.unshift(modelName);
            extension_settings[extensionName].previousModels = [...new Set(extension_settings[extensionName].previousModels)].slice(0, 20);
            saveSettingsDebounced();

            // call your loader
            await postLoad(modelName.toString);

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
);*/

registerSlashCommand(
    'unload_obamodel',
    async (modelName) => {
        try {
            await unload();

            return `Attempted to unload model:`;
        } catch (err) {
            console.error('obamodel command error:', err);
            return `Error loading model: ${err?.message ?? err}`;
        }
    },
    [], // args
    'unLoad obamodel"',
    false, // unnamed argument is required
    true  // show in help
);


async function unload() {
    const base = getBaseUrl();
    const url= `${base}/v1/internal/model/unload`;
  $("#ooba-status").text(`unloading_model...`);
  try {
      const res = await fetch(url, {
          method: "POST",
          headers: {
              "accept": "application/json"
        },
        body: ""
      });
   const txt = await res.text();
    if (!res.ok) {
      console.error("unLoad failed:", res.status, txt);
      $("#ooba-status").text(`unLoad failed: ${res.status} ${res.statusText}`);
      toastr.error(`unLoad failed (${res.status}) — see console`, "Ooba Model Loader");
      return;
    }
     $("#ooba-status").text(`unLoad request sent — server responded OK.`);
    toastr.success(`unLoad request sent`, "Ooba Model Loader");
    console.log("unload response:", txt);
  } catch (err) {
    console.error("postLoad error:", err);
    $("#ooba-status").text(`Failed to send request: ${err.message}`);
    toastr.error("Network error — check CORS / server", "Ooba Model Loader");
  }
}


// Fetch model name from Ollama-compatible backend
async function callback_getModelName() {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/v1/internal/model/info`);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  const data = await response.json();
  return data.model_name; // Returns: "None"
}

// Usage example:
// const modelName = await getModelName();
// console.log("Active model:", modelName);

async function postLoad(args,modelName) {
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
