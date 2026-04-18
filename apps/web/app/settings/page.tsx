import type { ReactElement } from "react";

import { SettingsForm } from "@/components/settings-form";
import { getSettings } from "@/lib/api";

export default async function SettingsPage(): Promise<ReactElement> {
  const settings = await getSettings();

  return (
    <main className="stack">
      <div>
        <h1 className="page-title">System settings</h1>
        <p className="page-subtitle">
          Runtime flags and defaults exposed by the backend.
        </p>
      </div>

      <SettingsForm settings={settings} />
      <section className="card">
        <h3>Settings</h3>
        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((setting) => (
              <tr key={setting.key}>
                <td>
                  <code>{setting.key}</code>
                </td>
                <td>{setting.value}</td>
                <td>{setting.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
