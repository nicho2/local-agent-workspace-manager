import type { ReactElement } from "react";

import { T } from "@/components/i18n-provider";
import { SettingsForm } from "@/components/settings-form";
import { getSettings } from "@/lib/api";

export default async function SettingsPage(): Promise<ReactElement> {
  const settings = await getSettings();

  return (
    <main className="stack">
      <div>
        <h1 className="page-title">
          <T k="settings.title" />
        </h1>
        <p className="page-subtitle">
          <T k="settings.subtitle" />
        </p>
      </div>

      <SettingsForm settings={settings} />
      <section className="card">
        <h3>
          <T k="settings.listTitle" />
        </h3>
        <table>
          <thead>
            <tr>
              <th>
                <T k="table.key" />
              </th>
              <th>
                <T k="table.value" />
              </th>
              <th>
                <T k="table.description" />
              </th>
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
