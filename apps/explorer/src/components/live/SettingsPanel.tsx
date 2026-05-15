import { useEffect, useMemo, useState, type BaseSyntheticEvent } from "react";
import {
  DEFAULT_CUSTOM_ENDPOINT,
  getEndpointById,
  loadRpcSettings,
  RPC_ENDPOINTS,
  saveRpcSettings,
  validateRpcUrl
} from "../../lib/live-explorer/settings";
import { getExplorerRuntime, useExplorerSnapshot } from "../../lib/live-explorer/singleton";

export default function SettingsPanel() {
  const snapshot = useExplorerSnapshot();
  const [selectedEndpointId, setSelectedEndpointId] = useState(RPC_ENDPOINTS[0].id);
  const [customEndpointUrl, setCustomEndpointUrl] = useState(DEFAULT_CUSTOM_ENDPOINT);
  const [error, setError] = useState("");
  const selectedEndpoint = useMemo(
    () => getEndpointById(selectedEndpointId, customEndpointUrl),
    [selectedEndpointId, customEndpointUrl]
  );

  useEffect(() => {
    const settings = loadRpcSettings();
    setSelectedEndpointId(settings.selectedEndpointId);
    setCustomEndpointUrl(settings.customEndpointUrl);
  }, []);

  function handleSave(event: BaseSyntheticEvent) {
    event.preventDefault();
    const validation = validateRpcUrl(selectedEndpoint.url);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setError("");
    const settings = saveRpcSettings({
      selectedEndpointId,
      customEndpointUrl: selectedEndpointId === "custom" ? validation.value : customEndpointUrl
    });
    const endpoint = getEndpointById(settings.selectedEndpointId, settings.customEndpointUrl);
    void getExplorerRuntime().reconnect(endpoint);
  }

  return (
    <section className="grid two settings-grid">
      <form className="card pad settings-card" onSubmit={handleSave}>
        <div className="card-inline-head">
          <div>
            <h3>RPC endpoint</h3>
            <p className="cell-sub">Choose the endpoint used for live blocks and block detail reads.</p>
          </div>
          <span className={`chip ${snapshot.status.phase === "live" ? "success" : "warn"}`}>
            <span className="dot" aria-hidden="true" />
            <span className="chip-label">{snapshot.status.phase.replace("_", " ")}</span>
          </span>
        </div>

        <div className="endpoint-list" role="radiogroup" aria-label="RPC endpoint presets">
          {RPC_ENDPOINTS.map((endpoint) => (
            <label className="endpoint-option" key={endpoint.id}>
              <input
                type="radio"
                name="endpoint"
                value={endpoint.id}
                checked={selectedEndpointId === endpoint.id}
                onChange={() => setSelectedEndpointId(endpoint.id)}
              />
              <span>
                <strong>{endpoint.label}</strong>
                <small>{endpoint.id === "custom" ? customEndpointUrl : endpoint.url}</small>
              </span>
            </label>
          ))}
        </div>

        <label className="field">
          <span>Custom endpoint</span>
          <input
            className="input"
            value={customEndpointUrl}
            onChange={(event) => setCustomEndpointUrl(event.currentTarget.value)}
            onFocus={() => setSelectedEndpointId("custom")}
            placeholder="wss://..."
          />
        </label>

        {error && <div className="callout warn" role="alert">{error}</div>}

        <div className="toolbar">
          <button className="btn primary" type="submit">
            Save endpoint
          </button>
          <button className="btn" type="button" onClick={() => setSelectedEndpointId("vara-testnet")}>
            Use testnet
          </button>
          <button className="btn" type="button" onClick={() => setSelectedEndpointId("local")}>
            Use local node
          </button>
        </div>
      </form>

      <section className="card pad settings-card">
        <div className="card-inline-head">
          <div>
            <h3>Local cache</h3>
            <p className="cell-sub">Bounded browser storage keeps recent block context available during RPC failures.</p>
          </div>
          <span className="chip neutral">
            <span className="chip-label">IndexedDB</span>
          </span>
        </div>
        <dl>
          <div className="kv"><dt>Endpoint</dt><dd>{snapshot.status.endpoint.label}</dd></div>
          <div className="kv"><dt>Rendered rows</dt><dd>8 overview · 50 block page</dd></div>
          <div className="kv"><dt>Block summaries</dt><dd>512 per endpoint</dd></div>
          <div className="kv"><dt>Block details</dt><dd>50 per endpoint</dd></div>
          <div className="kv"><dt>Current state</dt><dd>{snapshot.status.message}</dd></div>
        </dl>
      </section>
    </section>
  );
}
