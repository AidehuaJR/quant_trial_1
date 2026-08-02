"use client";

import { CandlestickSeries, ColorType, createChart, HistogramSeries, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import { localeFor, rangeLabel, type Language } from "./i18n";

type Props = {
  name: string;
  code: string;
  price: number;
  entry: number;
  stop: number;
  target: number;
  language: Language;
  dataSource?: "connecting" | "live" | "fallback";
  marketTimestamp?: string;
};
type RangeKey = "1일" | "1주" | "1개월" | "1년";
type Interval = 1 | 3 | 5 | 10 | 15 | 30 | 60 | 120 | 240 | 1440;
type BarSize = Interval | RangeKey;
type Bar = { time: UTCTimestamp; open: number; high: number; low: number; close: number; volume: number };
type Detail = { time: UTCTimestamp; open: number; high: number; low: number; close: number; volume: number } | null;
type TossCandle = {
  timestamp: string;
  openPrice: string | number;
  highPrice: string | number;
  lowPrice: string | number;
  closePrice: string | number;
  volume: string | number;
};
type TossCandlePage = {
  result?: TossCandle[] | {
    candles?: TossCandle[];
    nextBefore?: string | null;
  };
  nextBefore?: string | null;
};

const TOSS_GATEWAY_URL = "https://54-117-0-4.sslip.io";

const ranges: RangeKey[] = ["1일", "1주", "1개월", "1년"];
const intervals: Interval[] = [1, 3, 5, 10, 15, 30, 60, 120, 240];

const chartCopy: Record<Language, Record<string,string>> = {
  ko: {},
  en: {"사용자 제공 기준값 · 실시간 아님":"User-provided reference · Not live","새로고침":"Refresh","불러오는 중":"Loading","화면 갱신":"Screen refreshed","휠로 확대 · 좌우 드래그로 이전 거래일 보기":"Scroll to zoom · drag to view prior sessions","시세 기준":"Market data","마지막 거래일 · NXT 애프터마켓 포함":"Last trading day · includes NXT after-market","봉 간격":"Candle interval","약 30개 봉으로 시작":"Starts with about 30 candles","왼쪽으로 이동하면 이전 거래일 데이터가 계속 표시돼요.":"Drag left to reveal prior trading sessions.","분":"min","시간":"hr","시":"O","고":"H","저":"L","종":"C","거래량":"Volume","봉":"candle","캔들 위에 마우스를 올리면 해당 시각의 상세 정보가 표시됩니다.":"Hover a candle to view its details.","매수":"Buy","손절":"Stop","익절":"Target","매수 기준":"Buy price","데이터 연결 전 UI·분석 흐름 검토용입니다.":"UI and analysis-flow preview before live data connection."},
  zh: {"사용자 제공 기준값 · 실시간 아님":"用户参考值 · 非实时","새로고침":"刷新","불러오는 중":"加载中","화면 갱신":"画面刷新","휠로 확대 · 좌우 드래그로 이전 거래일 보기":"滚轮缩放 · 左右拖动查看以往交易日","시세 기준":"行情时间","마지막 거래일 · NXT 애프터마켓 포함":"最近交易日 · 包含 NXT 盘后","봉 간격":"K线周期","약 30개 봉으로 시작":"默认约30根K线","왼쪽으로 이동하면 이전 거래일 데이터가 계속 표시돼요.":"向左拖动可继续查看以往交易日。","분":"分钟","시간":"小时","시":"开","고":"高","저":"低","종":"收","거래량":"成交量","봉":"K线","캔들 위에 마우스를 올리면 해당 시각의 상세 정보가 표시됩니다.":"将鼠标移到K线上可查看详细信息。","매수":"买入","손절":"止损","익절":"止盈","매수 기준":"买入价","데이터 연결 전 UI·분석 흐름 검토용입니다.":"用于连接实时数据前检查界面与分析流程。"},
  es: {"사용자 제공 기준값 · 실시간 아님":"Valor de referencia · No en vivo","새로고침":"Actualizar","불러오는 중":"Cargando","화면 갱신":"Pantalla actualizada","휠로 확대 · 좌우 드래그로 이전 거래일 보기":"Rueda para ampliar · arrastra para sesiones anteriores","시세 기준":"Datos de mercado","마지막 거래일 · NXT 애프터마켓 포함":"Última sesión · incluye NXT posmercado","봉 간격":"Intervalo de vela","약 30개 봉으로 시작":"Comienza con unas 30 velas","왼쪽으로 이동하면 이전 거래일 데이터가 계속 표시돼요.":"Arrastra a la izquierda para ver sesiones anteriores.","분":"min","시간":"h","시":"A","고":"M","저":"m","종":"C","거래량":"Volumen","봉":"vela","캔들 위에 마우스를 올리면 해당 시각의 상세 정보가 표시됩니다.":"Pasa el cursor sobre una vela para ver detalles.","매수":"Compra","손절":"Stop","익절":"Objetivo","매수 기준":"Precio de compra","데이터 연결 전 UI·분석 흐름 검토용입니다.":"Vista previa de interfaz y análisis antes de conectar datos reales."}
};
function chartText(language: Language, key: string) { return chartCopy[language][key] ?? key; }
function intervalLabel(language: Language, minutes: Interval) { return minutes === 1440 ? rangeLabel(language, "1일") : `${minutes}${chartText(language,"분")}`; }

function roundPrice(value: number) { return Math.round(value / 100) * 100; }

function tossCandlesToBars(items: TossCandle[]): Bar[] {
  return items
    .map(item => ({
      time: Math.floor(new Date(item.timestamp).getTime() / 1000) as UTCTimestamp,
      open: Number(item.openPrice),
      high: Number(item.highPrice),
      low: Number(item.lowPrice),
      close: Number(item.closePrice),
      volume: Number(item.volume),
    }))
    .filter(item =>
      Number.isFinite(item.time) &&
      Number.isFinite(item.open) &&
      Number.isFinite(item.high) &&
      Number.isFinite(item.low) &&
      Number.isFinite(item.close) &&
      Number.isFinite(item.volume)
    )
    .sort((a, b) => a.time - b.time);
}

function unpackTossCandlePage(payload: TossCandlePage) {
  if (Array.isArray(payload.result)) {
    return { candles: payload.result, nextBefore: payload.nextBefore ?? undefined };
  }
  return {
    candles: payload.result?.candles ?? [],
    nextBefore: payload.result?.nextBefore ?? payload.nextBefore ?? undefined,
  };
}

function mergeBars(existing: Bar[], incoming: Bar[]): Bar[] {
  const byTimestamp = new Map<number, Bar>();
  for (const bar of existing) byTimestamp.set(bar.time, bar);
  for (const bar of incoming) byTimestamp.set(bar.time, bar);
  return Array.from(byTimestamp.values()).sort((a, b) => a.time - b.time);
}

const KST_OFFSET_SECONDS = 9 * 60 * 60;

function periodStartTimestamp(time: UTCTimestamp, period: RangeKey): UTCTimestamp {
  const shifted = new Date((Number(time) + KST_OFFSET_SECONDS) * 1000);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  let day = shifted.getUTCDate();

  if (period === "1주") {
    const daysSinceMonday = (shifted.getUTCDay() + 6) % 7;
    day -= daysSinceMonday;
  }

  const bucketMonth = period === "1년" ? 0 : month;
  const bucketDay = period === "1년" || period === "1개월" ? 1 : day;
  return (Math.floor(Date.UTC(year, bucketMonth, bucketDay) / 1000) - KST_OFFSET_SECONDS) as UTCTimestamp;
}

function aggregateDailyBars(bars: Bar[], period: RangeKey): Bar[] {
  if (period === "1일") return bars;

  const buckets = new Map<number, Bar>();
  for (const bar of bars) {
    const time = periodStartTimestamp(bar.time, period);
    const current = buckets.get(time);
    if (!current) {
      buckets.set(time, { ...bar, time });
      continue;
    }
    current.high = Math.max(current.high, bar.high);
    current.low = Math.min(current.low, bar.low);
    current.close = bar.close;
    current.volume += bar.volume;
  }
  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

function historyDaysFor(barSize: BarSize): number {
  if (typeof barSize === "number") return 14;
  return ({ "1일": 400, "1주": 1_825, "1개월": 3_650, "1년": 7_300 } as const)[barSize];
}

function sampleMinuteBars(base: number, code: string, minutes: Interval): Bar[] {
  const requestedDays = 30;
  const estimatedBarsPerDay = Math.max(1, Math.ceil(700 / minutes));
  const loadedDays = Math.min(requestedDays, Math.max(5, Math.floor(12000 / estimatedBarsPerDay)));
  const seed = Number(code.slice(-3)) || 41;
  // Fixed Friday snapshot: includes NXT after-market and remains visible on weekends.
  const end = new Date("2026-07-17T11:00:00Z"); // 20:00 KST
  const result: Bar[] = [];
  let close = base * .96;
  let index = 0;

  if (minutes <= 1440) {
    for (let dayOffset = loadedDays - 1; dayOffset >= 0; dayOffset--) {
      const session = new Date(end);
      session.setUTCDate(end.getUTCDate() - dayOffset);
      if (session.getUTCDay() === 0 || session.getUTCDay() === 6) continue;
      const y = session.getUTCFullYear(), m = session.getUTCMonth(), d = session.getUTCDate();
      const segments = minutes === 1440 ? [
        { start: Date.UTC(y, m, d, 0, 0), duration: 0, name: "일봉" },
      ] : [
        { start: Date.UTC(y, m, d - 1, 23, 0), duration: 50, name: "NXT 프리" },      // 08:00–08:50 KST
        { start: Date.UTC(y, m, d, 0, 0), duration: 390, name: "정규장" },            // 09:00–15:30 KST
        { start: Date.UTC(y, m, d, 6, 40), duration: 260, name: "NXT 애프터" },       // 15:40–20:00 KST
      ];
      for (const segment of segments) {
        for (let minute = 0; minute <= segment.duration; minute += minutes) {
          const time = new Date(segment.start + minute * 60_000);
          const wave = Math.sin((index + seed) * .47) * .0035 + Math.cos((index + seed) * .17) * .002;
          const drift = (base - close) * .018;
          const open = close;
          close = Math.max(base * .82, close * (1 + wave) + drift);
          const high = Math.max(open, close) * (1.002 + Math.abs(Math.sin(index)) * .0015);
          const low = Math.min(open, close) * (0.998 - Math.abs(Math.cos(index)) * .0013);
          result.push({ time: Math.floor(time.getTime()/1000) as UTCTimestamp, open: roundPrice(open), high: roundPrice(high), low: roundPrice(low), close: roundPrice(close), volume: Math.round(85000 + Math.abs(Math.sin(index*.61))*420000) });
          index++;
        }
      }
    }
  }
  if (result.length) result[result.length - 1].close = base;
  return result;
}

function samplePeriodBars(base: number, code: string, period: RangeKey): Bar[] {
  const stepDays: Record<RangeKey, number> = { "1일": 1, "1주": 7, "1개월": 30, "1년": 365 };
  const counts: Record<RangeKey, number> = { "1일": 120, "1주": 104, "1개월": 84, "1년": 20 };
  const seed = Number(code.slice(-3)) || 41;
  const end = new Date("2026-07-17T06:30:00Z");
  const result: Bar[] = [];
  let close = base * (period === "1년" ? .45 : period === "1개월" ? .68 : period === "1주" ? .82 : .92);
  let index = 0;

  for (let offset = counts[period] - 1; offset >= 0; offset--) {
    const point = new Date(end);
    point.setUTCDate(end.getUTCDate() - offset * stepDays[period]);
    if (period === "1일" && (point.getUTCDay() === 0 || point.getUTCDay() === 6)) continue;
    const wave = Math.sin((index + seed) * .43) * .022 + Math.cos((index + seed) * .16) * .011;
    const drift = (base - close) * .025;
    const open = close;
    close = Math.max(base * .32, close * (1 + wave) + drift);
    const high = Math.max(open, close) * (1.008 + Math.abs(Math.sin(index)) * .008);
    const low = Math.min(open, close) * (0.992 - Math.abs(Math.cos(index)) * .007);
    result.push({ time: Math.floor(point.getTime() / 1000) as UTCTimestamp, open: roundPrice(open), high: roundPrice(high), low: roundPrice(low), close: roundPrice(close), volume: Math.round(420000 + Math.abs(Math.sin(index * .61)) * 2800000) });
    index++;
  }
  if (result.length) result[result.length - 1].close = base;
  return result;
}

function dateLabel(time: UTCTimestamp, intraday: boolean, language: Language) {
  return new Intl.DateTimeFormat(localeFor[language], { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", ...(intraday ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}) }).format(new Date(time * 1000));
}

export default function MarketChart({ name, code, price, entry, stop, target, language, dataSource = "fallback", marketTimestamp }: Props) {
  const t = (key: string) => chartText(language,key);
  const container = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const liveBarRef = useRef<Omit<Bar, "volume"> | null>(null);
  const candleHistoryRef = useRef<Bar[]>([]);
  const [barSize, setBarSize] = useState<BarSize>(30);
  const [minuteInterval, setMinuteInterval] = useState<Interval>(30);
  const [detail, setDetail] = useState<Detail>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState("—");
  const [refreshing, setRefreshing] = useState(false);
  const [candleStatus, setCandleStatus] = useState<"idle" | "connecting" | "live" | "fallback">("idle");
  const [liveCandleCount, setLiveCandleCount] = useState(0);
  function chooseRange(next: RangeKey) {
    setBarSize(next);
    setDetail(null);
  }

  function chooseInterval(next: Interval) {
    setMinuteInterval(next);
    setBarSize(next);
    setDetail(null);
  }
  function refreshChart() {
    setRefreshing(true);
    setDetail(null);
    window.setTimeout(() => {
      setRefreshKey(value => value + 1);
      setLastUpdated(new Date().toLocaleTimeString(localeFor[language], { hour12: false }));
      setRefreshing(false);
    }, 350);
  }

  useEffect(() => {
    if (!container.current) return;
    const intraday = typeof barSize === "number";
    const chart = createChart(container.current, {
      height: 350,
      layout: { background: { type: ColorType.Solid, color: "#ffffff" }, textColor: "#7b8883", fontFamily: "Inter, Pretendard, sans-serif", fontSize: 11 },
      localization: { locale: localeFor[language], priceFormatter: (value: number) => `${Math.round(value).toLocaleString(localeFor[language])}` },
      grid: { vertLines: { color: "#f1f4f2" }, horzLines: { color: "#edf1ef" } },
      rightPriceScale: { borderColor: "#e5ebe8", scaleMargins: { top: .08, bottom: .24 } },
      timeScale: { borderColor: "#e5ebe8", timeVisible: intraday, secondsVisible: false, rightOffset: 1, barSpacing: 14 },
      crosshair: { vertLine: { color: "#82928c", labelBackgroundColor: "#17251f" }, horzLine: { color: "#82928c", labelBackgroundColor: "#17251f" } },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });
    const bars = typeof barSize === "number" ? sampleMinuteBars(price, code, barSize) : samplePeriodBars(price, code, barSize);
    const candle = chart.addSeries(CandlestickSeries, { upColor: "#e95762", downColor: "#2875d0", borderVisible: false, wickUpColor: "#e95762", wickDownColor: "#2875d0", priceFormat: { type: "price", precision: 0, minMove: 100 } });
    chartRef.current = chart;
    candleRef.current = candle;
    liveBarRef.current = null;
    candle.setData(bars.map(bar => ({ time: bar.time, open: bar.open, high: bar.high, low: bar.low, close: bar.close })));
    const volume = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "volume" });
    volumeRef.current = volume;
    volume.priceScale().applyOptions({ scaleMargins: { top: .82, bottom: 0 } });
    volume.setData(bars.map(bar => ({ time: bar.time, value: bar.volume, color: bar.close >= bar.open ? "#ef9ba14a" : "#77a9df4d" })));
    candle.createPriceLine({ price: entry, color: "#159b6e", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: chartText(language,"매수") });
    candle.createPriceLine({ price: stop, color: "#e05f67", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: chartText(language,"손절") });
    candle.createPriceLine({ price: target, color: "#d39a2e", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: chartText(language,"익절") });
    chart.subscribeCrosshairMove(param => {
      if (!param.time) { setDetail(null); return; }
      const candlePoint = param.seriesData.get(candle) as { open?: number; high?: number; low?: number; close?: number } | undefined;
      const volumePoint = param.seriesData.get(volume) as { value?: number } | undefined;
      if (candlePoint?.open == null) { setDetail(null); return; }
      setDetail({ time: param.time as UTCTimestamp, open: candlePoint.open, high: candlePoint.high!, low: candlePoint.low!, close: candlePoint.close!, volume: volumePoint?.value ?? 0 });
    });
    if (bars.length > 5) chart.timeScale().setVisibleLogicalRange({ from: bars.length - 5.5, to: bars.length - .25 });
    else chart.timeScale().fitContent();
    const observer = new ResizeObserver(entries => chart.applyOptions({ width: entries[0].contentRect.width }));
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      candleRef.current = null;
      volumeRef.current = null;
      chartRef.current = null;
      liveBarRef.current = null;
      candleHistoryRef.current = [];
      chart.remove();
    };
  }, [code, entry, stop, target, barSize, refreshKey, language]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    let controller: AbortController | null = null;
    const historyDays = historyDaysFor(barSize);
    const historyStart = Math.floor((Date.now() - historyDays * 24 * 60 * 60 * 1000) / 1000);

    async function fetchCandlePage(before?: string) {
      controller = new AbortController();
      const query = new URLSearchParams({
        interval: typeof barSize === "number" ? `${barSize}m` : "1d",
        count: "200",
        _ts: String(Date.now()),
      });
      if (before) query.set("before", before);
      const response = await fetch(
        `${TOSS_GATEWAY_URL}/api/candles/${encodeURIComponent(code)}?${query.toString()}`,
        { cache: "no-store", signal: controller.signal }
      );
      if (!response.ok) throw new Error(`Toss candles HTTP ${response.status}`);
      return await response.json() as TossCandlePage;
    }

    function renderBars(bars: Bar[], keepCurrentView = false) {
      if (cancelled || !bars.length || !candleRef.current || !volumeRef.current) return;
      candleHistoryRef.current = bars;
      const displayBars = typeof barSize === "number" ? bars : aggregateDailyBars(bars, barSize);
      candleRef.current.setData(displayBars.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
      volumeRef.current.setData(displayBars.map(bar => ({
        time: bar.time,
        value: bar.volume,
        color: bar.close >= bar.open ? "#ef9ba14a" : "#77a9df4d",
      })));
      const latest = displayBars[displayBars.length - 1];
      liveBarRef.current = { time: latest.time, open: latest.open, high: latest.high, low: latest.low, close: latest.close };
      setLiveCandleCount(displayBars.length);
      setCandleStatus("live");
      setLastUpdated(new Date().toLocaleTimeString(localeFor[language], {
        timeZone: "Asia/Seoul",
        hour12: false,
      }));
      if (!keepCurrentView) {
        chartRef.current?.timeScale().setVisibleLogicalRange({
          from: Math.max(0, displayBars.length - 5.5),
          to: displayBars.length - .25,
        });
      }
    }

    async function loadInitialHistory() {
      try {
        let bars: Bar[] = [];
        let before: string | undefined;
        const visitedCursors = new Set<string>();

        for (let page = 0; page < 80; page += 1) {
          const payload = await fetchCandlePage(before);
          const pageData = unpackTossCandlePage(payload);
          const pageBars = tossCandlesToBars(pageData.candles);
          if (!pageBars.length) break;
          bars = mergeBars(bars, pageBars);

          const oldest = bars[0]?.time ?? Number.POSITIVE_INFINITY;
          const nextBefore = pageData.nextBefore;
          if (oldest <= historyStart || !nextBefore || visitedCursors.has(nextBefore)) break;
          visitedCursors.add(nextBefore);
          before = nextBefore;
        }

        if (!bars.length) throw new Error("Toss returned no candles");
        renderBars(bars);
      } catch (error) {
        if (cancelled || (error instanceof DOMException && error.name === "AbortError")) return;
        setCandleStatus("fallback");
        setLiveCandleCount(0);
      }
    }

    async function refreshLatest() {
      try {
        const payload = await fetchCandlePage();
        const latestBars = tossCandlesToBars(unpackTossCandlePage(payload).candles);
        if (!latestBars.length) return;
        renderBars(mergeBars(candleHistoryRef.current, latestBars), true);
      } catch (error) {
        if (cancelled || (error instanceof DOMException && error.name === "AbortError")) return;
      }
    }

    setCandleStatus("connecting");
    void loadInitialHistory().finally(() => {
      if (!cancelled) timer = window.setInterval(refreshLatest, 5_000);
    });
    return () => {
      cancelled = true;
      controller?.abort();
      if (timer != null) window.clearInterval(timer);
    };
  }, [code, barSize, language]);

  useEffect(() => {
    const candle = candleRef.current;
    if (!candle || dataSource !== "live" || !marketTimestamp || !Number.isFinite(price) || price <= 0) return;

    const quoteTime = new Date(marketTimestamp).getTime();
    if (!Number.isFinite(quoteTime)) return;

    const quoteTimestamp = Math.floor(quoteTime / 1000) as UTCTimestamp;
    const bucket = typeof barSize === "number"
      ? (Math.floor(Number(quoteTimestamp) / (barSize * 60)) * barSize * 60) as UTCTimestamp
      : periodStartTimestamp(quoteTimestamp, barSize);
    const previous = liveBarRef.current;
    const next = previous?.time === bucket
      ? { time: bucket, open: previous.open, high: Math.max(previous.high, price), low: Math.min(previous.low, price), close: price }
      : { time: bucket, open: price, high: price, low: price, close: price };

    liveBarRef.current = next;
    candle.update(next);
    setLastUpdated(new Date(marketTimestamp).toLocaleTimeString(localeFor[language], { timeZone: "Asia/Seoul", hour12: false }));
    chartRef.current?.timeScale().scrollToRealTime();
  }, [price, marketTimestamp, dataSource, barSize, language]);

  const shown = detail;
  return <article className="market-chart panel">
    <div className="chart-head"><div><span className="sample-pill">{candleStatus === "live" ? "TOSS LIVE CANDLES" : dataSource === "live" ? "TOSS LIVE PRICE" : dataSource === "connecting" || candleStatus === "connecting" ? "CONNECTING TO TOSS" : "INTERACTIVE SAMPLE"}</span><h2>{name} <small>{code}</small></h2><strong>{price.toLocaleString(localeFor[language])} {language === "ko" ? "원" : "KRW"}</strong><em>{candleStatus === "live" ? `토스증권 Open API · 실시간 봉 ${liveCandleCount}개` : dataSource === "live" ? "토스증권 Open API 현재가" : t("사용자 제공 기준값 · 실시간 아님")}</em></div><div><div className="chart-tools"><button className={`refresh-chart ${refreshing ? "loading" : ""}`} onClick={refreshChart} disabled={refreshing} aria-label={t("새로고침")}><span>↻</span>{refreshing ? t("불러오는 중") : t("새로고침")}</button></div><p className="interval-label"><i className="connection-dot"/> {t("화면 갱신")} {lastUpdated} · {t("휠로 확대 · 좌우 드래그로 이전 거래일 보기")}</p></div></div>
    <div className="data-clock"><span><i/>{t("시세 기준")}</span><b>{marketTimestamp ? new Date(marketTimestamp).toLocaleString(localeFor[language], { timeZone: "Asia/Seoul", hour12: false }) : "데모 데이터"}</b><em>{candleStatus === "live" ? "AWS 보안 게이트웨이 · 5초마다 캔들 갱신" : dataSource === "live" ? "현재가 연결됨 · 캔들 연결 확인 중" : "토스 연결 실패 시 데모로 자동 전환"}</em></div>
    <div className="chart-control-bar">
      <label className={`minute-dropdown ${typeof barSize === "number" ? "active" : ""}`}><span>{intervalLabel(language,minuteInterval)}</span><select value={minuteInterval} onChange={event=>chooseInterval(Number(event.target.value) as Interval)} aria-label="Minute candle length">{intervals.map(item=><option key={item} value={item}>{intervalLabel(language,item)}</option>)}</select><i aria-hidden="true" /></label>
      <div className="range-bar" aria-label="Candle length">{ranges.map(item=><button type="button" key={item} className={barSize === item ? "active" : ""} onClick={()=>chooseRange(item)}>{rangeLabel(language,item)}</button>)}</div>
    </div>
    <div className="ohlc-strip">
      {shown ? <><b>{dateLabel(shown.time, typeof barSize === "number", language)}</b><span>{t("시")} <strong>{shown.open.toLocaleString(localeFor[language])}</strong></span><span>{t("고")} <strong className="rise">{shown.high.toLocaleString(localeFor[language])}</strong></span><span>{t("저")} <strong className="fall">{shown.low.toLocaleString(localeFor[language])}</strong></span><span>{t("종")} <strong>{shown.close.toLocaleString(localeFor[language])}</strong></span><span>{t("거래량")} <strong>{shown.volume.toLocaleString(localeFor[language])}</strong></span></> : <><b>{typeof barSize === "number" ? intervalLabel(language, barSize) : rangeLabel(language, barSize)}</b><span>{t("캔들 위에 마우스를 올리면 해당 시각의 상세 정보가 표시됩니다.")}</span></>}
    </div>
    <div ref={container} className="chart-canvas" />
    <div className="chart-legend"><span className="entry">{t("매수 기준")} {entry.toLocaleString(localeFor[language])} KRW</span><span className="stop">{t("손절")} {stop.toLocaleString(localeFor[language])} KRW</span><span className="target">{t("익절")} {target.toLocaleString(localeFor[language])} KRW</span><small>{candleStatus === "live" ? `Toss OHLCV ${liveCandleCount}개 · 5초 자동 갱신` : dataSource === "live" ? "현재가는 실시간 · 캔들은 연결 확인 중" : t("데이터 연결 전 UI·분석 흐름 검토용입니다.")}</small></div>
  </article>;
}
