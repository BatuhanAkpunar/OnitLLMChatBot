"use client";

import { type ReactNode } from "react";
import {
  Copy,
  PencilSimple,
  ArrowClockwise,
  ThumbsUp,
  ThumbsDown,
} from "@phosphor-icons/react";
import { Markdown } from "./markdown";
import { RoleAvatar } from "./role-visual";
import { OrbMark } from "@/components/brand/orb";
import { useI18n } from "@/components/i18n-provider";
import type { Agent, Message } from "./chat-view";

function IconButton({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** Onit (the coordinator) shown as busy: orb avatar + label + typing dots. */
export function OnitWorking({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-[34px] w-[34px] shrink-0 place-items-center">
        <OrbMark size={24} />
      </span>
      <span className="inline-flex items-center gap-2.5 rounded-2xl rounded-tl-md border border-border/70 bg-card px-4 py-3 text-xs text-muted-foreground">
        {label}
        <span className="typing-dots" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </span>
    </div>
  );
}

/** Splits a trailing ```options block off an answer into clickable choices. */
function splitOptions(content: string): { body: string; options: string[] } {
  const m = content.match(/```options\s*\n([\s\S]*?)\n?```\s*$/);
  if (!m || m.index === undefined) return { body: content, options: [] };
  const options = m[1]
    .split("\n")
    .map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
  if (!options.length) return { body: content, options: [] };
  return { body: content.slice(0, m.index).trimEnd(), options };
}

export function MessageRow({
  message,
  agent,
  busy,
  editing,
  editValue,
  onEditChange,
  onCopy,
  onRegenerate,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onFeedback,
  canPickOption,
  onPickOption,
}: {
  message: Message;
  agent?: Agent;
  busy: boolean;
  editing: boolean;
  editValue: string;
  onEditChange: (v: string) => void;
  onCopy: (content: string) => void;
  onRegenerate: (m: Message) => void;
  onStartEdit: (m: Message) => void;
  onSaveEdit: (m: Message) => void;
  onCancelEdit: () => void;
  onFeedback: (m: Message, value: 1 | -1) => void;
  canPickOption: boolean;
  onPickOption: (option: string) => void;
}) {
  const { t } = useI18n();
  if (message.role === "user") {
    if (editing) {
      return (
        <div className="flex justify-end">
          <div className="w-full max-w-[85%]">
            <textarea
              autoFocus
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-2xl border border-border bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-ring/20"
            />
            <div className="mt-1.5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-md border border-border px-3 py-1 text-xs transition-colors hover:bg-accent"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={() => onSaveEdit(message)}
                className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground transition-opacity hover:opacity-90"
              >
                {t("saveResend")}
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="group flex flex-col items-end gap-1">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-muted px-4 py-2.5 text-[15px] leading-relaxed text-foreground">
          {message.content}
        </div>
        <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <IconButton title={t("copy")} onClick={() => onCopy(message.content)}>
            <Copy size={14} />
          </IconButton>
          <IconButton title={t("edit")} onClick={() => onStartEdit(message)}>
            <PencilSimple size={14} />
          </IconButton>
        </div>
      </div>
    );
  }

  const isCoordinator = message.agent_key === "coordinator";
  const color = isCoordinator
    ? "var(--agent-indigo)"
    : agent
      ? `var(--agent-${agent.color})`
      : "var(--muted-foreground)";
  const name = isCoordinator ? "Onit" : (agent?.display_name ?? "Agent");
  const waiting =
    message.status === "streaming" && !message.content && !message.thinking;

  return (
    <div className="group flex gap-3">
      {/* The teammate answering speaks as a character; Onit appears as the orb.
          A role-colored frame + name plate sells the "party member" feel. */}
      <span className="mt-1 shrink-0">
        {isCoordinator ? (
          <span className="grid h-[46px] w-[46px] place-items-center rounded-xl border-[1.5px] border-border bg-card">
            <OrbMark size={28} />
          </span>
        ) : agent ? (
          <span
            className="inline-block rounded-[12px] border-[1.5px]"
            style={{ borderColor: `color-mix(in srgb, var(--agent-${agent.color}) 60%, transparent)` }}
          >
            <RoleAvatar
              roleKey={agent.key}
              color={agent.color}
              size={46}
              rounded="rounded-[10px]"
              state={message.status === "streaming" ? "speaking" : "static"}
            />
          </span>
        ) : (
          <span className="h-[46px] w-[46px] rounded-xl bg-muted" />
        )}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span
            className="text-[13px] font-semibold tracking-wide"
            style={{ color }}
          >
            {name}
          </span>
          {!isCoordinator && agent?.handle ? (
            <span className="rounded border border-border px-1 font-mono text-[10px] text-muted-foreground">
              {agent.handle}
            </span>
          ) : null}
          {message.edited_at ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-1.5 py-px text-[10px] font-medium text-violet-600 dark:text-violet-300">
              <PencilSimple size={10} weight="bold" />
              {t("edited")}
            </span>
          ) : null}
          {message.status === "error" ? (
            <span className="text-[11px] font-medium text-destructive">
              {t("couldntFinish")}
            </span>
          ) : null}
        </div>

        {waiting ? (
          <span className="thinking-pill scanlines inline-flex w-fit items-center gap-2 rounded-full border-[1.5px] border-border bg-card px-3 py-1.5 text-[12px] text-muted-foreground">
            <span className="typing-dots" aria-hidden>
              <span />
              <span />
              <span />
            </span>
            <span className="font-pixel tracking-wide">{t("thinking")}</span>
          </span>
        ) : null}

        {editing ? (
          <div className="w-full">
            <textarea
              autoFocus
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              rows={Math.min(18, Math.max(6, editValue.split("\n").length + 1))}
              className="w-full resize-y rounded-2xl border border-violet-500/30 bg-card p-3 font-mono text-[13px] leading-relaxed outline-none focus:ring-2 focus:ring-ring/20"
            />
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                onClick={() => onSaveEdit(message)}
                className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground transition-opacity hover:opacity-90"
              >
                {t("save")}
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-md border border-border px-3 py-1 text-xs transition-colors hover:bg-accent"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        ) : null}

        {message.content && !editing
          ? (() => {
              const { body, options } = splitOptions(message.content);
              return (
                <>
                  {body ? (
                    <div className="max-w-full text-[15px] leading-relaxed text-foreground/90">
                      <Markdown>{body}</Markdown>
                    </div>
                  ) : null}
                  {options.length && message.status === "complete" ? (
                    canPickOption ? (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {options.map((opt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => onPickOption(opt)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-left text-[13px] leading-snug transition-colors hover:border-violet-500/40 hover:bg-violet-500/[0.06]"
                          >
                            <span
                              className="font-mono text-[11px] font-bold"
                              style={{ color }}
                            >
                              {i + 1}
                            </span>
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <ol className="mt-1 space-y-0.5 pl-0.5 text-xs text-muted-foreground">
                        {options.map((opt, i) => (
                          <li key={i}>
                            {i + 1}. {opt}
                          </li>
                        ))}
                      </ol>
                    )
                  ) : null}
                </>
              );
            })()
          : null}

        {message.status !== "streaming" && message.content && !editing ? (
          <div
            className={`flex gap-0.5 transition-opacity group-hover:opacity-100 ${
              message.feedback ? "opacity-100" : "opacity-0"
            }`}
          >
            <IconButton title={t("copy")} onClick={() => onCopy(message.content)}>
              <Copy size={14} />
            </IconButton>
            <IconButton
              title={t("edit")}
              onClick={() => onStartEdit(message)}
              disabled={busy}
            >
              <PencilSimple size={14} />
            </IconButton>
            <IconButton
              title={t("regenerate")}
              onClick={() => onRegenerate(message)}
              disabled={busy}
            >
              <ArrowClockwise size={14} />
            </IconButton>
            {!isCoordinator ? (
              <>
                <IconButton title={t("goodAnswer")} onClick={() => onFeedback(message, 1)}>
                  <ThumbsUp
                    size={14}
                    weight={message.feedback === 1 ? "fill" : "regular"}
                    className={message.feedback === 1 ? "text-emerald-500" : ""}
                  />
                </IconButton>
                <IconButton title={t("badAnswer")} onClick={() => onFeedback(message, -1)}>
                  <ThumbsDown
                    size={14}
                    weight={message.feedback === -1 ? "fill" : "regular"}
                    className={message.feedback === -1 ? "text-red-400" : ""}
                  />
                </IconButton>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
