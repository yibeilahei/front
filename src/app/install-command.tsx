"use client";

import { useCallback, useState } from "react";

export function InstallCommand({
  label,
  hint,
  command,
}: {
  label: string;
  hint: string;
  command: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }, [command]);

  return (
    <div className="install-block">
      <div className="install-head">
        <p className="install-label">
          <span className="install-os">{label}</span>
          <span className="install-hint">{hint}</span>
        </p>
        <button
          type="button"
          className="copy-btn"
          onClick={copy}
          aria-label={`Copy ${label} install command`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="install-code">
        <code>{command}</code>
      </pre>
    </div>
  );
}
