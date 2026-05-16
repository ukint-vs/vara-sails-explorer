import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_CUSTOM_ENDPOINT,
  getEndpointById,
  loadRpcSettings,
  RPC_ENDPOINTS,
  saveRpcSettings,
  validateRpcUrl
} from "../../lib/live-explorer/settings";
import { getExplorerRuntime } from "../../lib/live-explorer/singleton";
import type { ExplorerRuntimeSnapshot } from "../../lib/live-explorer/types";

export default function SettingsDropdown() {
  const [snapshot, setSnapshot] = useState<ExplorerRuntimeSnapshot>(() => getExplorerRuntime().snapshot());
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [selectedEndpointId, setSelectedEndpointId] = useState(RPC_ENDPOINTS[0].id);
  const [customEndpointUrl, setCustomEndpointUrl] = useState(DEFAULT_CUSTOM_ENDPOINT);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const selectedEndpoint = useMemo(
    () => getEndpointById(selectedEndpointId, customEndpointUrl),
    [selectedEndpointId, customEndpointUrl]
  );

  useEffect(() => {
    const unsubscribe = getExplorerRuntime().subscribe(setSnapshot);
    const settings = loadRpcSettings();
    setSelectedEndpointId(settings.selectedEndpointId);
    setCustomEndpointUrl(settings.customEndpointUrl);
    if (shouldOpenFromUrl()) {
      setOpen(true);
    }

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function applyEndpoint(event: { preventDefault: () => void }) {
    event.preventDefault();
    const validation = validateRpcUrl(selectedEndpoint.url);
    if (!validation.valid) {
      setSaved(false);
      setError(validation.error);
      return;
    }

    setError("");
    const settings = saveRpcSettings({
      selectedEndpointId,
      customEndpointUrl: selectedEndpointId === "custom" ? validation.value : customEndpointUrl
    });
    const endpoint = getEndpointById(settings.selectedEndpointId, settings.customEndpointUrl);
    setSaved(true);
    void getExplorerRuntime().reconnect(endpoint);
  }

  function usePreset(endpointId: string) {
    setSelectedEndpointId(endpointId);
    setSaved(false);
    setError("");
  }

  return (
    <div className="settings-menu-wrap" ref={menuRef}>
      <button
        className={`network-chip settings-trigger ${open ? "active" : ""}`}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Explorer settings, current endpoint ${snapshot.status.endpoint.label}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="vara-mark" aria-hidden="true" />
        <span className="settings-trigger-label">{snapshot.status.endpoint.label}</span>
        <span className="settings-chevron" aria-hidden="true" />
      </button>

      {open && (
        <form className="settings-popover" role="dialog" aria-label="Explorer settings" onSubmit={applyEndpoint}>
          <div className="settings-popover-head">
            <div>
              <h3>Explorer settings</h3>
              <p className="cell-sub">Endpoint, cache state, and live RPC status.</p>
            </div>
            <span className={`chip compact ${snapshot.status.phase === "live" ? "success" : "warn"}`}>
              <span className="dot" aria-hidden="true" />
              <span className="chip-label">{snapshot.status.phase.replace("_", " ")}</span>
            </span>
          </div>

          <div className="settings-popover-section">
            <div className="settings-section-title">Endpoint</div>
            <div className="endpoint-menu-list" role="radiogroup" aria-label="RPC endpoint presets">
              {RPC_ENDPOINTS.map((endpoint) => (
                <label className="endpoint-option compact" key={endpoint.id}>
                  <input
                    type="radio"
                    name="topbar-endpoint"
                    value={endpoint.id}
                    checked={selectedEndpointId === endpoint.id}
                    onChange={() => usePreset(endpoint.id)}
                  />
                  <span>
                    <strong>{endpoint.label}</strong>
                    <small>{endpoint.id === "custom" ? customEndpointUrl : endpoint.url}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <label className="field">
            <span>Custom endpoint</span>
            <input
              className="input"
              value={customEndpointUrl}
              onChange={(event) => {
                setCustomEndpointUrl(event.currentTarget.value);
                setSaved(false);
              }}
              onFocus={() => setSelectedEndpointId("custom")}
              placeholder="wss://..."
            />
          </label>

          <dl className="settings-menu-kv">
            <div className="kv"><dt>Endpoint</dt><dd>{snapshot.status.endpoint.label}</dd></div>
            <div className="kv"><dt>Cache</dt><dd>512 summaries · 50 details</dd></div>
            <div className="kv"><dt>State</dt><dd>{snapshot.status.message}</dd></div>
          </dl>

          <div className="toolbar settings-actions">
            <button className="btn primary" type="submit">
              Apply endpoint
            </button>
            <button className="btn" type="button" onClick={() => usePreset("vara-testnet")}>
              Testnet
            </button>
            <button className="btn" type="button" onClick={() => usePreset("local")}>
              Local
            </button>
          </div>

          {error && <div className="callout warn" role="alert">{error}</div>}
          {saved && !error && <div className="callout info" role="status">Endpoint saved. Reconnecting stream.</div>}
        </form>
      )}
    </div>
  );
}

function shouldOpenFromUrl(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return window.location.pathname === "/settings" || params.get("settings") === "open";
}
