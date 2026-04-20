"use client";

import type { ReactElement } from "react";

import { useI18n } from "@/components/i18n-provider";
import type { Run, RunArtifact, RunLog } from "@/lib/types";

interface AuditTimelineEvent {
  id: string;
  timestamp: string | null;
  title: string;
  detail: string;
  tone: "neutral" | "success" | "warning";
}

interface RunAuditTimelineProps {
  artifacts: RunArtifact[];
  logs: RunLog[];
  run: Run;
}

function findDecisiveLog(logs: RunLog[]): RunLog | undefined {
  return [...logs].reverse().find((log) => log.level === "ERROR") ?? logs[logs.length - 1];
}

function formatDateTime(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString() : "pending";
}

export function RunAuditTimeline({
  artifacts,
  logs,
  run,
}: RunAuditTimelineProps): ReactElement {
  const { t } = useI18n();
  const decisiveLog = findDecisiveLog(logs);
  const events: AuditTimelineEvent[] = [
    {
      detail: `${run.trigger} ${t("auditTimeline.requestFrom")} ${run.requested_by}`,
      id: "request",
      timestamp: run.started_at,
      title: t("auditTimeline.requestReceived"),
      tone: "neutral",
    },
    {
      detail: run.command_preview,
      id: "command",
      timestamp: run.started_at,
      title: t("auditTimeline.commandCaptured"),
      tone: "neutral",
    },
  ];

  if (run.status === "blocked") {
    events.push({
      detail: decisiveLog?.message ?? t("auditTimeline.noDecisiveLog"),
      id: "blocked",
      timestamp: decisiveLog?.timestamp ?? run.finished_at ?? run.started_at,
      title: t("auditTimeline.executionBlocked"),
      tone: "warning",
    });
  } else if (run.status === "failed") {
    events.push({
      detail: decisiveLog?.message ?? t("auditTimeline.noDecisiveLog"),
      id: "failed",
      timestamp: decisiveLog?.timestamp ?? run.finished_at ?? run.started_at,
      title: t("auditTimeline.executionFailed"),
      tone: "warning",
    });
  } else if (run.status === "completed") {
    events.push({
      detail: run.dry_run
        ? t("auditTimeline.dryRunCompletedDetail")
        : t("auditTimeline.executionCompletedDetail"),
      id: "completed",
      timestamp: run.finished_at ?? run.started_at,
      title: run.dry_run
        ? t("auditTimeline.dryRunCompleted")
        : t("auditTimeline.executionCompleted"),
      tone: "success",
    });
  }

  if (artifacts.length > 0) {
    events.push({
      detail: artifacts.map((artifact) => artifact.name).join(", "),
      id: "artifacts",
      timestamp: artifacts[artifacts.length - 1]?.created_at ?? run.finished_at,
      title: t("auditTimeline.artifactsRecorded"),
      tone: "neutral",
    });
  }

  return (
    <section className="card">
      <h3>{t("auditTimeline.title")}</h3>
      <ol className="audit-timeline">
        {events.map((event) => (
          <li className={`audit-timeline-item audit-timeline-${event.tone}`} key={event.id}>
            <div>
              <strong>{event.title}</strong>
              <p>{event.detail}</p>
            </div>
            <time>{formatDateTime(event.timestamp)}</time>
          </li>
        ))}
      </ol>
    </section>
  );
}
