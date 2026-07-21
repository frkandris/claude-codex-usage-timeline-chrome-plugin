import { projectUsage, removeMeasurement } from "../lib/usage.js";

const $ = (id) => document.getElementById(id);
const state = {
  history: [],
  status: null,
  range: "1",
  hoverPoint: null,
  hoverSeries: null,
  providers: { claude: true, codex: true },
  showProjection: true
};
const rangeDurations = new Map([
  ["30m", 30 * 60 * 1000],
  ["1h", 60 * 60 * 1000],
  ["2h", 2 * 60 * 60 * 1000],
  ["3h", 3 * 60 * 60 * 1000],
  ["4h", 4 * 60 * 60 * 1000],
  ["6h", 6 * 60 * 60 * 1000],
  ["12h", 12 * 60 * 60 * 1000],
  ["1", 24 * 60 * 60 * 1000],
  ["48h", 48 * 60 * 60 * 1000],
  ["7", 7 * 24 * 60 * 60 * 1000],
  ["30", 30 * 24 * 60 * 60 * 1000]
]);
const validRanges = new Set([...rangeDurations.keys(), "all"]);
const colors = { claude: "#bd654b", codex: "#3f7766", projection: "#7b8ea1", bridge: "#b7b3ab", now: "#9d988f", grid: "#dedbd4", text: "#77736c", surface: "#fbfaf7" };
const series = [
  { provider: "claude", metric: "session", label: "Claude 5h", dash: [] },
  { provider: "claude", metric: "weekly", label: "Claude week", dash: [10, 7] },
  { provider: "claude", metric: "fable", label: "Claude Fable", dash: [8, 4, 2, 4], optional: true },
  { provider: "codex", metric: "session", label: "Codex 5h", dash: [] },
  { provider: "codex", metric: "weekly", label: "Codex week", dash: [10, 7], optional: true }
];
const activeSeries = () => series.filter((item) => state.providers[item.provider] && (!item.optional || hasCurrentMetric(item.provider, item.metric)));

function previewData() {
  const now = Date.now();
  const history = Array.from({ length: 56 }, (_, index) => {
    const progress = index / 55;
    return {
      timestamp: now - (55 - index) * 3 * 60 * 60 * 1000,
      claude: {
        session: { used: 12 + ((index * 9) % 67), resetsAt: now + 2.2 * 60 * 60 * 1000 },
        weekly: { used: 31 + progress * 38, resetsAt: now + 4.1 * 24 * 60 * 60 * 1000 },
        fable: { used: 5 + progress * 24, resetsAt: now + 4.1 * 24 * 60 * 60 * 1000 }
      },
      codex: {
        session: { used: 8 + ((index * 7) % 54), resetsAt: now + 3.4 * 60 * 60 * 1000 },
        weekly: { used: 22 + progress * 29, resetsAt: now + 5.6 * 24 * 60 * 60 * 1000 }
      }
    };
  });
  return { history, status: { lastAttempt: now, claude: { ok: true }, codex: { ok: true } } };
}

const preview = previewData();
const previewApi = {
  storage: {
    local: {
      get: async () => preview,
      set: async (changes) => Object.assign(preview, changes)
    },
    onChanged: { addListener: () => {} }
  },
  alarms: { get: async () => ({ scheduledTime: Date.now() + 15 * 60 * 1000 }) },
  runtime: { sendMessage: async () => ({ ok: true }) }
};
const extensionApi = globalThis.chrome?.storage?.local ? globalThis.chrome : previewApi;
const ALARM_NAME = "collect-usage";

const formatPercent = (value) => Number.isFinite(value) ? `${Math.round(value)}%` : "–";
const formatTime = (timestamp) => timestamp ? new Intl.DateTimeFormat("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(timestamp) : "–";
const resetLabel = (timestamp) => timestamp ? `Resets ${formatTime(timestamp)}` : "No reset";

function updateCollectionTooltip(scheduledTime) {
  const lines = [
    "Collect usage",
    `Last collected: ${state.status?.lastAttempt ? formatTime(state.status.lastAttempt) : "Never"}`,
    `Next automatic: ${scheduledTime ? formatTime(scheduledTime) : "Not scheduled"}`
  ];
  const button = $("refreshButton");
  button.dataset.tooltip = lines.join("\n");
  button.setAttribute("aria-label", lines.join(". "));
}

function distanceToSegment(x, y, segment) {
  const dx = segment.x2 - segment.x1; const dy = segment.y2 - segment.y1;
  const lengthSquared = dx * dx + dy * dy;
  const ratio = lengthSquared
    ? Math.max(0, Math.min(1, ((x - segment.x1) * dx + (y - segment.y1) * dy) / lengthSquared))
    : 0;
  return Math.hypot(x - (segment.x1 + ratio * dx), y - (segment.y1 + ratio * dy));
}

function latest(provider) {
  return [...state.history].reverse().find((sample) => sample?.[provider])?.[provider] ?? null;
}

function hasCurrentMetric(provider, metricName) {
  return Number.isFinite(latest(provider)?.[metricName]?.used);
}

function renderProvider(provider) {
  const data = latest(provider);
  const providerStatus = state.status?.[provider];
  const metrics = provider === "claude" ? ["session", "weekly", "fable"] : ["session", "weekly"];
  for (const metric of metrics) {
    const prefix = `${provider}${metric[0].toUpperCase()}${metric.slice(1)}`;
    const used = data?.[metric]?.used;
    $(prefix).textContent = formatPercent(used);
    $(`${prefix}Bar`).style.width = `${Number.isFinite(used) ? used : 0}%`;
    $(`${prefix}Reset`).textContent = resetLabel(data?.[metric]?.resetsAt);
  }
  const status = $(`${provider}Status`);
  const authError = /\b(401|403)\b|sign.?in|session|access token|unauthorized|forbidden/i.test(providerStatus?.error ?? "");
  status.hidden = Boolean(providerStatus?.ok);
  status.classList.toggle("error", providerStatus && !providerStatus.ok);
  status.textContent = authError ? "Sign in" : providerStatus?.error ? "Error" : "No data";
  status.title = providerStatus?.error ?? "";
  status.tabIndex = authError ? 0 : -1;
  if (!authError) status.removeAttribute("href");
  else status.href = provider === "claude" ? "https://claude.ai/new" : "https://chatgpt.com/codex";
  status.setAttribute("aria-label", authError ? `Open ${provider} to sign in` : status.textContent);
}

function filteredHistory(now = Date.now()) {
  if (state.range === "all") return state.history;
  const cutoff = now - rangeDurations.get(state.range);
  return state.history.filter((sample) => sample.timestamp >= cutoff);
}

function drawChart() {
  const canvas = $("usageChart");
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
  const context = canvas.getContext("2d"); context.scale(dpr, dpr);
  const now = Date.now();
  const data = filteredHistory(now);
  const visibleSeries = activeSeries();
  $("emptyState").hidden = data.some((sample) => visibleSeries.some((item) => sample[item.provider]?.[item.metric]?.used != null));
  context.fillStyle = colors.surface; context.fillRect(0, 0, rect.width, rect.height);
  const padding = { top: 24, right: 20, bottom: 38, left: 48 };
  const width = rect.width - padding.left - padding.right; const height = rect.height - padding.top - padding.bottom;
  context.font = "10px system-ui"; context.textAlign = "right"; context.textBaseline = "middle";
  for (let value = 0; value <= 100; value += 25) {
    const y = padding.top + height - (value / 100) * height;
    context.strokeStyle = colors.grid; context.lineWidth = 1; context.beginPath(); context.moveTo(padding.left, y); context.lineTo(padding.left + width, y); context.stroke();
    context.fillStyle = colors.text; context.fillText(`${value}%`, padding.left - 10, y);
  }
  if (!data.length) return;
  const start = state.range === "all"
    ? data[0].timestamp
    : now - rangeDurations.get(state.range);
  const baseEnd = now;
  const projections = state.showProjection
    ? visibleSeries.map((item) => {
        const projection = projectUsage(state.history, item.provider, item.metric, now);
        return projection ? { ...projection, item } : null;
      }).filter(Boolean)
    : [];
  const end = baseEnd + Math.max(baseEnd - start, 1);
  const centeredSingleSample = data.length === 1;
  const xForTimestamp = (timestamp) => centeredSingleSample
    ? padding.left + width / 2
    : padding.left + ((timestamp - start) / (end - start)) * width;
  context.textAlign = "center"; context.textBaseline = "top";
  const labelCount = centeredSingleSample ? 1 : rect.width < 520 ? 3 : 5;
  const labels = centeredSingleSample
    ? [{ timestamp: start, x: padding.left + width / 2 }]
    : Array.from({ length: labelCount }, (_, index) => {
        const ratio = index / (labelCount - 1);
        return { timestamp: start + (end - start) * ratio, x: padding.left + width * ratio };
      });
  labels.forEach((label, index) => {
    context.textAlign = index === 0 ? "left" : index === labels.length - 1 ? "right" : "center";
    if (centeredSingleSample) context.textAlign = "center";
    context.fillStyle = colors.text; context.fillText(formatTime(label.timestamp), label.x, padding.top + height + 13);
  });
  const nowX = xForTimestamp(baseEnd);
  context.strokeStyle = colors.now; context.lineWidth = 1.35; context.setLineDash([3, 4]); context.beginPath();
  context.moveTo(nowX, padding.top); context.lineTo(nowX, padding.top + height); context.stroke(); context.setLineDash([]);
  const points = [];
  const forecastMarkers = [];
  const lineSegments = [];
  for (const item of visibleSeries) {
    const isFocused = state.hoverSeries?.provider === item.provider && state.hoverSeries?.metric === item.metric;
    const isDimmed = state.hoverSeries && !isFocused;
    const isSecondary = item.metric !== "session";
    const baseLineWidth = isSecondary ? 1.7 : 2.2;
    context.globalAlpha = isDimmed ? 0.18 : 1;
    context.strokeStyle = colors[item.provider]; context.lineWidth = baseLineWidth + (isFocused ? 0.7 : 0); context.lineJoin = "round"; context.lineCap = isSecondary ? "butt" : "round"; context.setLineDash(item.dash); context.beginPath();
    let started = false;
    const seriesPoints = [];
    data.forEach((sample, index) => {
      const value = sample[item.provider]?.[item.metric]?.used;
      if (!Number.isFinite(value)) { started = false; return; }
      const x = xForTimestamp(sample.timestamp);
      const y = padding.top + height - (value / 100) * height;
      started ? context.lineTo(x, y) : context.moveTo(x, y); started = true;
      const point = { index, provider: item.provider, metric: item.metric, label: item.label, x, y, value, timestamp: sample.timestamp };
      points.push(point); seriesPoints.push(point);
    });
    context.stroke();
    for (let index = 1; index < seriesPoints.length; index += 1) {
      const previous = seriesPoints[index - 1]; const current = seriesPoints[index];
      lineSegments.push({ x1: previous.x, y1: previous.y, x2: current.x, y2: current.y, provider: item.provider, metric: item.metric, label: item.label });
    }
    const firstPoint = seriesPoints[0];
    if (firstPoint?.timestamp > start) {
      const firstSample = data[firstPoint.index];
      const firstHistoryIndex = state.history.indexOf(firstSample);
      let previousEntry = null;
      for (let index = firstHistoryIndex - 1; index >= 0; index -= 1) {
        const sample = state.history[index];
        const value = sample[item.provider]?.[item.metric]?.used;
        if (Number.isFinite(value)) {
          previousEntry = { index, timestamp: sample.timestamp, value };
          break;
        }
      }
      if (previousEntry?.timestamp < start && firstPoint.timestamp > previousEntry.timestamp) {
        const ratio = (start - previousEntry.timestamp) / (firstPoint.timestamp - previousEntry.timestamp);
        const boundaryValue = previousEntry.value + (firstPoint.value - previousEntry.value) * ratio;
        const crossesMissingSamples = firstHistoryIndex - previousEntry.index > 1;
        context.strokeStyle = crossesMissingSamples ? colors.bridge : colors[item.provider];
        context.lineWidth = crossesMissingSamples ? 1.2 : isSecondary ? 1.8 : 2.2;
        context.setLineDash(crossesMissingSamples ? [2, 4] : item.dash);
        context.beginPath();
        const boundaryY = padding.top + height - (boundaryValue / 100) * height;
        context.moveTo(padding.left, boundaryY);
        context.lineTo(firstPoint.x, firstPoint.y);
        context.stroke();
        lineSegments.push({ x1: padding.left, y1: boundaryY, x2: firstPoint.x, y2: firstPoint.y, provider: item.provider, metric: item.metric, label: item.label });
      }
    }
    context.strokeStyle = colors.bridge; context.lineWidth = 1.2; context.setLineDash([2, 4]);
    for (let index = 1; index < seriesPoints.length; index += 1) {
      const previous = seriesPoints[index - 1]; const current = seriesPoints[index];
      if (current.index - previous.index <= 1) continue;
      context.beginPath(); context.moveTo(previous.x, previous.y); context.lineTo(current.x, current.y); context.stroke();
    }
    if (seriesPoints.length === 1) {
      const [point] = seriesPoints;
      context.setLineDash([]); context.fillStyle = colors.surface; context.strokeStyle = colors[item.provider]; context.lineWidth = 2;
      context.beginPath(); context.arc(point.x, point.y, isSecondary ? 3 : 4, 0, Math.PI * 2); context.fill(); context.stroke();
    }
    context.globalAlpha = 1;
  }
  if (points.length <= 160) {
    points.forEach((point) => {
      const isDimmed = state.hoverSeries && (state.hoverSeries.provider !== point.provider || state.hoverSeries.metric !== point.metric);
      context.globalAlpha = isDimmed ? 0.18 : 1;
      context.setLineDash([]); context.fillStyle = colors[point.provider];
      context.beginPath(); context.arc(point.x, point.y, 1.8, 0, Math.PI * 2); context.fill();
    });
    context.globalAlpha = 1;
  }
  for (const projection of projections) {
    const targetTimestamp = Math.min(projection.targetTimestamp, end);
    const targetValue = Math.max(0, Math.min(100, projection.last.value + projection.slope * (targetTimestamp - projection.last.timestamp)));
    const currentValue = Math.max(0, Math.min(100, projection.last.value + projection.slope * (baseEnd - projection.last.timestamp)));
    const isFocused = state.hoverSeries?.provider === projection.item.provider && state.hoverSeries?.metric === projection.item.metric;
    const isDimmed = state.hoverSeries && !isFocused;
    context.globalAlpha = isDimmed ? 0.18 : 1;
    context.strokeStyle = colors.bridge;
    context.lineWidth = 1.2;
    context.setLineDash([2, 4]);
    context.beginPath();
    context.moveTo(xForTimestamp(projection.last.timestamp), padding.top + height - (projection.last.value / 100) * height);
    context.lineTo(xForTimestamp(baseEnd), padding.top + height - (currentValue / 100) * height);
    context.stroke();
    lineSegments.push({
      x1: xForTimestamp(projection.last.timestamp),
      y1: padding.top + height - (projection.last.value / 100) * height,
      x2: xForTimestamp(baseEnd),
      y2: padding.top + height - (currentValue / 100) * height,
      provider: projection.item.provider,
      metric: projection.item.metric,
      label: projection.item.label
    });
    context.strokeStyle = colors.projection;
    context.lineWidth = (projection.item.metric === "session" ? 2 : 1.6) + (isFocused ? 0.7 : 0);
    context.setLineDash(projection.item.metric === "weekly" ? [2, 5] : projection.item.metric === "fable" ? [7, 4, 2, 4] : [5, 4]);
    context.beginPath();
    context.moveTo(xForTimestamp(baseEnd), padding.top + height - (currentValue / 100) * height);
    context.lineTo(xForTimestamp(targetTimestamp), padding.top + height - (targetValue / 100) * height);
    context.stroke();
    lineSegments.push({
      x1: xForTimestamp(baseEnd),
      y1: padding.top + height - (currentValue / 100) * height,
      x2: xForTimestamp(targetTimestamp),
      y2: padding.top + height - (targetValue / 100) * height,
      provider: projection.item.provider,
      metric: projection.item.metric,
      label: projection.item.label
    });
    if (projection.targetTimestamp <= end) {
      const marker = {
        x: xForTimestamp(projection.targetTimestamp),
        y: padding.top + height - (projection.targetValue / 100) * height,
        timestamp: projection.targetTimestamp,
        label: projection.item.label,
        provider: projection.item.provider,
        metric: projection.item.metric,
        reason: projection.targetReason,
        value: projection.targetValue
      };
      forecastMarkers.push(marker);
      context.setLineDash([]); context.fillStyle = colors.surface; context.strokeStyle = colors.projection; context.lineWidth = 2;
      context.beginPath(); context.arc(marker.x, marker.y, marker.reason === "limit" ? 4.5 : 3.5, 0, Math.PI * 2); context.fill(); context.stroke();
    }
    context.globalAlpha = 1;
  }
  context.setLineDash([]);
  if (state.hoverPoint) {
    const selected = points.find((point) =>
      point.timestamp === state.hoverPoint.timestamp &&
      point.provider === state.hoverPoint.provider &&
      point.metric === state.hoverPoint.metric
    );
    if (selected) {
      context.fillStyle = colors.surface; context.strokeStyle = colors[selected.provider]; context.lineWidth = 2;
      context.beginPath(); context.arc(selected.x, selected.y, 4.5, 0, Math.PI * 2); context.fill(); context.stroke();
    }
  }
  canvas._chart = { data, points, forecastMarkers, lineSegments, padding, width, start, end, centeredSingleSample, xForTimestamp };
}

function render() {
  const enabledCount = Object.values(state.providers).filter(Boolean).length;
  document.querySelector(".provider-grid").classList.toggle("single-provider", enabledCount === 1);
  document.querySelector(".overview").hidden = enabledCount === 0;
  document.querySelectorAll("[data-provider]").forEach((element) => {
    element.hidden = !state.providers[element.dataset.provider];
  });
  const hasClaudeFable = hasCurrentMetric("claude", "fable");
  const hasCodexWeekly = hasCurrentMetric("codex", "weekly");
  $("claudeFableLegend").hidden = !state.providers.claude || !hasClaudeFable;
  $("codexWeeklyMetric").hidden = !hasCodexWeekly;
  $("codexWeeklyLegend").hidden = !state.providers.codex || !hasCodexWeekly;
  document.querySelector(".codex-provider .metrics").classList.toggle("single-metric", !hasCodexWeekly);
  $("projectionLegend").hidden = !state.showProjection;
  renderProvider("claude"); renderProvider("codex"); drawChart();
}

async function load() {
  const stored = await extensionApi.storage.local.get([
    "history", "status", "selectedRange", "claudeEnabled", "codexEnabled", "showProjection"
  ]);
  let alarm = null;
  try { alarm = await extensionApi.alarms?.get?.(ALARM_NAME); } catch { /* Alarm data is optional in previews. */ }
  state.history = stored.history ?? [];
  state.status = stored.status ?? null;
  state.range = validRanges.has(stored.selectedRange) ? stored.selectedRange : "1";
  state.providers.claude = stored.claudeEnabled !== false;
  state.providers.codex = stored.codexEnabled !== false;
  state.showProjection = stored.showProjection !== false;
  $("rangeSelect").value = state.range;
  updateCollectionTooltip(alarm?.scheduledTime);
  render();
}

$("refreshButton").addEventListener("click", async () => {
  const button = $("refreshButton"); button.disabled = true; button.setAttribute("aria-busy", "true");
  try { await extensionApi.runtime.sendMessage({ type: "collect-now" }); await load(); }
  finally { button.disabled = false; button.removeAttribute("aria-busy"); }
});
$("rangeSelect").addEventListener("change", async (event) => {
  state.range = validRanges.has(event.target.value) ? event.target.value : "1";
  await extensionApi.storage.local.set({ selectedRange: state.range });
  drawChart();
});
$("usageChart").addEventListener("mousemove", (event) => {
  const chart = event.currentTarget._chart; if (!chart?.data.length) return;
  const bounds = event.currentTarget.getBoundingClientRect(); const mouseX = event.clientX - bounds.left; const mouseY = event.clientY - bounds.top;
  const forecastMarker = chart.forecastMarkers.reduce((closest, marker) => {
    const distance = Math.hypot(marker.x - mouseX, marker.y - mouseY);
    return !closest || distance < closest.distance ? { ...marker, distance } : closest;
  }, null);
  if (forecastMarker?.distance <= 14) {
    const changed = state.hoverPoint ||
      state.hoverSeries?.provider !== forecastMarker.provider ||
      state.hoverSeries?.metric !== forecastMarker.metric;
    state.hoverPoint = null;
    state.hoverSeries = { provider: forecastMarker.provider, metric: forecastMarker.metric };
    if (changed) drawChart();
    event.currentTarget.style.cursor = "default";
    const tooltip = $("tooltip"); tooltip.hidden = false;
    tooltip.style.left = `${Math.max(80, Math.min(bounds.width - 80, forecastMarker.x))}px`;
    tooltip.style.top = `${Math.max(84, forecastMarker.y)}px`;
    tooltip.innerHTML = forecastMarker.reason === "limit"
      ? `<strong>${forecastMarker.label}</strong><br>Estimated limit reach: ${formatTime(forecastMarker.timestamp)}`
      : `<strong>${forecastMarker.label}</strong><br>Resets: ${formatTime(forecastMarker.timestamp)}<br>Estimated: ${formatPercent(forecastMarker.value)}`;
    return;
  }
  const closest = chart.points.reduce((best, point) => {
    const distance = Math.hypot(point.x - mouseX, point.y - mouseY);
    return !best || distance < best.distance ? { ...point, distance } : best;
  }, null);
  if (closest?.distance <= 10) {
    const changed = state.hoverPoint?.timestamp !== closest.timestamp ||
      state.hoverPoint?.provider !== closest.provider ||
      state.hoverPoint?.metric !== closest.metric ||
      state.hoverSeries?.provider !== closest.provider ||
      state.hoverSeries?.metric !== closest.metric;
    state.hoverPoint = { timestamp: closest.timestamp, provider: closest.provider, metric: closest.metric };
    state.hoverSeries = { provider: closest.provider, metric: closest.metric };
    event.currentTarget.style.cursor = "pointer";
    const tooltip = $("tooltip"); tooltip.hidden = false;
    tooltip.style.left = `${Math.max(80, Math.min(bounds.width - 80, closest.x))}px`;
    tooltip.style.top = `${Math.max(78, closest.y)}px`;
    tooltip.innerHTML = `<strong>${closest.label} · ${formatPercent(closest.value)}</strong><br>${formatTime(closest.timestamp)}<br>Click to delete`;
    if (changed) drawChart();
    return;
  }
  const closestSegment = chart.lineSegments.reduce((best, segment) => {
    const distance = distanceToSegment(mouseX, mouseY, segment);
    return !best || distance < best.distance ? { ...segment, distance } : best;
  }, null);
  if (closestSegment?.distance <= 8) {
    const changed = state.hoverPoint ||
      state.hoverSeries?.provider !== closestSegment.provider ||
      state.hoverSeries?.metric !== closestSegment.metric;
    state.hoverPoint = null;
    state.hoverSeries = { provider: closestSegment.provider, metric: closestSegment.metric };
    if (changed) drawChart();
    event.currentTarget.style.cursor = "default"; $("tooltip").hidden = true;
    return;
  }
  if (state.hoverPoint || state.hoverSeries) { state.hoverPoint = null; state.hoverSeries = null; drawChart(); }
  event.currentTarget.style.cursor = "default"; $("tooltip").hidden = true;
});
$("usageChart").addEventListener("click", async (event) => {
  const chart = event.currentTarget._chart; if (!chart?.points.length) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  const mouseX = event.clientX - bounds.left; const mouseY = event.clientY - bounds.top;
  const closest = chart.points.reduce((best, point) => {
    const distance = Math.hypot(point.x - mouseX, point.y - mouseY);
    return !best || distance < best.distance ? { ...point, distance } : best;
  }, null);
  if (!closest || closest.distance > 10) return;
  if (!confirm(`Delete ${closest.label} measurement from ${formatTime(closest.timestamp)}?`)) return;
  const stored = await extensionApi.storage.local.get(["history"]);
  const history = removeMeasurement(stored.history, closest.timestamp, closest.provider, closest.metric);
  await extensionApi.storage.local.set({ history });
  state.hoverPoint = null; state.hoverSeries = null; event.currentTarget.style.cursor = "default"; $("tooltip").hidden = true;
  await load();
});
$("usageChart").addEventListener("mouseleave", (event) => {
  if (state.hoverPoint || state.hoverSeries) { state.hoverPoint = null; state.hoverSeries = null; drawChart(); }
  event.currentTarget.style.cursor = "default"; $("tooltip").hidden = true;
});
window.addEventListener("resize", drawChart);
extensionApi.storage.onChanged.addListener((changes, area) => area === "local" && (
  changes.history || changes.status || changes.claudeEnabled || changes.codexEnabled || changes.showProjection
) && load());
load();
