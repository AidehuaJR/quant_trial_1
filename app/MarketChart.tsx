"use client";

import { CandlestickSeries, ColorType, createChart, HistogramSeries, type UTCTimestamp } from "lightweight-charts";
import { useEffect, useRef, useState } from "react";

type Props = { name: string; code: string; price: number; entry: number; stop: number; target: number };
type RangeKey = "1일" | "3일" | "1주" | "1개월" | "3개월" | "1년";
type Interval = 1 | 3 | 5 | 10 | 30 | 60 | 300 | 720;
type Bar = { time: UTCTimestamp; open: number; high: number; low: number; close: number; volume: number };
type Detail = { time: UTCTimestamp; open: number; high: number; low: number; close: number; volume: number } | null;

const ranges: RangeKey[] = ["1일", "3일", "1주", "1개월", "3개월", "1년"];
const configs: Record<RangeKey, { days: number; defaultInterval: Interval }> = {
  "1일": { days: 1, defaultInterval: 1 },
  "3일": { days: 3, defaultInterval: 30 },
  "1주": { days: 7, defaultInterval: 60 },
  "1개월": { days: 30, defaultInterval: 720 },
  "3개월": { days: 90, defaultInterval: 720 },
  "1년": { days: 365, defaultInterval: 720 },
};
const intervals: { value: Interval; label: string }[] = [{value:1,label:"1분"},{value:3,label:"3분"},{value:5,label:"5분"},{value:10,label:"10분"},{value:30,label:"30분"},{value:60,label:"1시간"},{value:300,label:"5시간"},{value:720,label:"12시간"}];

function roundPrice(value: number) { return Math.round(value / 100) * 100; }

function sampleBars(base: number, code: string, range: RangeKey, minutes: Interval): Bar[] {
  const { days } = configs[range];
  const loadedDays = range === "1일" ? 30 : range === "3일" ? 30 : range === "1주" ? 45 : days;
  const seed = Number(code.slice(-3)) || 41;
  // Fixed Friday snapshot: includes NXT after-market and remains visible on weekends.
  const end = new Date("2026-07-17T11:00:00Z"); // 20:00 KST
  const result: Bar[] = [];
  let close = base * (range === "1년" ? .72 : range === "3개월" ? .86 : .96);
  let index = 0;

  if (minutes <= 720) {
    for (let dayOffset = loadedDays - 1; dayOffset >= 0; dayOffset--) {
      const session = new Date(end);
      session.setUTCDate(end.getUTCDate() - dayOffset);
      if (session.getUTCDay() === 0 || session.getUTCDay() === 6) continue;
      const y = session.getUTCFullYear(), m = session.getUTCMonth(), d = session.getUTCDate();
      const segments = [
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

function dateLabel(time: UTCTimestamp, intraday: boolean) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", ...(intraday ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}) }).format(new Date(time * 1000));
}

export default function MarketChart({ name, code, price, entry, stop, target }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<RangeKey>("3개월");
  const [interval, setInterval] = useState<Interval>(720);
  const [detail, setDetail] = useState<Detail>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState("—");
  const [refreshing, setRefreshing] = useState(false);
  function refreshChart() {
    setRefreshing(true);
    setDetail(null);
    window.setTimeout(() => {
      setRefreshKey(value => value + 1);
      setLastUpdated(new Date().toLocaleTimeString("ko-KR", { hour12: false }));
      setRefreshing(false);
    }, 350);
  }

  useEffect(() => {
    if (!container.current) return;
    const intraday = true;
    const chart = createChart(container.current, {
      height: 350,
      layout: { background: { type: ColorType.Solid, color: "#ffffff" }, textColor: "#7b8883", fontFamily: "Inter, Pretendard, sans-serif", fontSize: 11 },
      localization: { locale: "ko-KR", priceFormatter: value => `${Math.round(value).toLocaleString("ko-KR")}` },
      grid: { vertLines: { color: "#f1f4f2" }, horzLines: { color: "#edf1ef" } },
      rightPriceScale: { borderColor: "#e5ebe8", scaleMargins: { top: .08, bottom: .24 } },
      timeScale: { borderColor: "#e5ebe8", timeVisible: intraday, secondsVisible: false, rightOffset: 3, barSpacing: intraday ? (range === "1일" ? 6 : 4) : range === "1년" ? 4 : 8 },
      crosshair: { vertLine: { color: "#82928c", labelBackgroundColor: "#17251f" }, horzLine: { color: "#82928c", labelBackgroundColor: "#17251f" } },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });
    const bars = sampleBars(price, code, range, interval);
    const candle = chart.addSeries(CandlestickSeries, { upColor: "#e95762", downColor: "#2875d0", borderVisible: false, wickUpColor: "#e95762", wickDownColor: "#2875d0", priceFormat: { type: "price", precision: 0, minMove: 100 } });
    candle.setData(bars.map(bar => ({ time: bar.time, open: bar.open, high: bar.high, low: bar.low, close: bar.close })));
    const volume = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "volume" });
    volume.priceScale().applyOptions({ scaleMargins: { top: .82, bottom: 0 } });
    volume.setData(bars.map(bar => ({ time: bar.time, value: bar.volume, color: bar.close >= bar.open ? "#ef9ba14a" : "#77a9df4d" })));
    candle.createPriceLine({ price: entry, color: "#159b6e", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "매수" });
    candle.createPriceLine({ price: stop, color: "#e05f67", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "손절" });
    candle.createPriceLine({ price: target, color: "#d39a2e", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "익절" });
    chart.subscribeCrosshairMove(param => {
      if (!param.time) { setDetail(null); return; }
      const candlePoint = param.seriesData.get(candle) as { open?: number; high?: number; low?: number; close?: number } | undefined;
      const volumePoint = param.seriesData.get(volume) as { value?: number } | undefined;
      if (candlePoint?.open == null) { setDetail(null); return; }
      setDetail({ time: param.time as UTCTimestamp, open: candlePoint.open, high: candlePoint.high!, low: candlePoint.low!, close: candlePoint.close!, volume: volumePoint?.value ?? 0 });
    });
    let liveClose = bars.at(-1)?.close ?? price;
    const lastTime = bars.at(-1)?.time;
    const simulation = window.setInterval(() => {
      if (!lastTime) return;
      liveClose = roundPrice(liveClose * (1 + Math.sin(Date.now()/1300 + Number(code.slice(-2))) * .00022));
      const previous = bars.at(-1)!;
      candle.update({ time: lastTime, open: previous.open, high: Math.max(previous.high, liveClose), low: Math.min(previous.low, liveClose), close: liveClose });
      setLastUpdated(new Date().toLocaleTimeString("ko-KR", { hour12: false }));
    }, 1000);
    setLastUpdated(new Date().toLocaleTimeString("ko-KR", { hour12: false }));
    if (bars.length > 30) chart.timeScale().setVisibleLogicalRange({ from: bars.length - 30.5, to: bars.length - .25 });
    else chart.timeScale().fitContent();
    const observer = new ResizeObserver(entries => chart.applyOptions({ width: entries[0].contentRect.width }));
    observer.observe(container.current);
    return () => { window.clearInterval(simulation); observer.disconnect(); chart.remove(); };
  }, [code, price, entry, stop, target, range, interval, refreshKey]);

  const shown = detail;
  return <article className="market-chart panel">
    <div className="chart-head"><div><span className="sample-pill">INTERACTIVE SAMPLE</span><h2>{name} <small>{code}</small></h2><strong>{price.toLocaleString("ko-KR")}원</strong><em>사용자 제공 기준값 · 실시간 아님</em></div><div><div className="chart-tools"><div className="ranges">{ranges.map(item=><button key={item} className={range===item?"active":""} onClick={()=>{setRange(item);setInterval(configs[item].defaultInterval);setDetail(null)}}>{item}</button>)}</div><button className={`refresh-chart ${refreshing ? "loading" : ""}`} onClick={refreshChart} disabled={refreshing} aria-label="차트 새로고침"><span>↻</span>{refreshing ? "불러오는 중" : "새로고침"}</button></div><p className="interval-label"><i className="connection-dot"/> 화면 갱신 {lastUpdated} · 휠로 확대 · 좌우 드래그로 이전 거래일 보기</p></div></div>
    <div className="data-clock"><span><i/>시세 기준</span><b>2026.07.17 20:00 KST</b><em>마지막 거래일 · NXT 애프터마켓 포함</em></div>
    <div className="candle-toolbar"><label htmlFor="candle-interval">봉 간격</label><div className="interval-select"><select id="candle-interval" value={interval} onChange={event=>{setInterval(Number(event.target.value) as Interval);setDetail(null)}}>{intervals.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select><span>⌄</span></div><i>약 30개 봉으로 시작</i><small>왼쪽으로 이동하면 이전 거래일 데이터가 계속 표시돼요.</small></div>
    <div className="ohlc-strip">
      {shown ? <><b>{dateLabel(shown.time, true)}</b><span>시 <strong>{shown.open.toLocaleString()}</strong></span><span>고 <strong className="rise">{shown.high.toLocaleString()}</strong></span><span>저 <strong className="fall">{shown.low.toLocaleString()}</strong></span><span>종 <strong>{shown.close.toLocaleString()}</strong></span><span>거래량 <strong>{shown.volume.toLocaleString()}</strong></span></> : <><b>{range} · {intervals.find(item=>item.value===interval)?.label}봉</b><span>캔들 위에 마우스를 올리면 해당 시각의 상세 정보가 표시됩니다.</span></>}
    </div>
    <div ref={container} className="chart-canvas" />
    <div className="chart-legend"><span className="entry">매수 기준 {entry.toLocaleString()}원</span><span className="stop">손절 {stop.toLocaleString()}원</span><span className="target">익절 {target.toLocaleString()}원</span><small>데이터 연결 전 UI·분석 흐름 검토용입니다.</small></div>
  </article>;
}
