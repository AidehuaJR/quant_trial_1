"use client";

import { useEffect, useMemo, useState } from "react";
import MarketChart from "./MarketChart";

type Stock = {
  code: string; name: string; price: number; change: number; signal: string;
  confidence: number; spark: number[]; sector: string; aliases?: string[];
};

const stocks: Stock[] = [
  { code: "005930", name: "삼성전자", price: 255000, change: 1.22, signal: "매수 관찰", confidence: 72, sector: "반도체", aliases: ["SSNLF", "SMSN", "SAMSUNG"], spark: [44,43,46,45,49,51,50,54,52,57,60,62] },
  { code: "000660", name: "SK하이닉스", price: 214500, change: 2.14, signal: "상승 추세", confidence: 81, sector: "반도체", aliases: ["SKHY", "SK HYNIX", "HYNIX"], spark: [38,41,39,44,49,48,53,55,58,56,62,66] },
  { code: "035420", name: "NAVER", price: 189200, change: -0.63, signal: "중립", confidence: 54, sector: "인터넷", spark: [61,59,62,58,56,57,53,55,51,49,52,50] },
  { code: "035720", name: "카카오", price: 42150, change: -1.08, signal: "대기", confidence: 46, sector: "인터넷", spark: [64,62,60,61,58,55,57,54,52,48,50,47] },
  { code: "005380", name: "현대차", price: 246000, change: 0.82, signal: "매수 관찰", confidence: 68, sector: "자동차", spark: [42,45,44,48,47,51,54,52,55,58,57,61] },
  { code: "000270", name: "기아", price: 112400, change: 1.31, signal: "상승 추세", confidence: 74, sector: "자동차", spark: [39,42,46,44,49,52,55,53,59,62,61,65] },
  { code: "373220", name: "LG에너지솔루션", price: 352500, change: -0.42, signal: "중립", confidence: 51, sector: "2차전지", spark: [59,57,58,55,53,55,51,52,49,48,50,49] },
  { code: "207940", name: "삼성바이오로직스", price: 1008000, change: 0.70, signal: "매수 관찰", confidence: 65, sector: "바이오", spark: [45,47,46,50,49,53,51,55,56,59,58,62] },
  { code: "068270", name: "셀트리온", price: 186700, change: -0.16, signal: "대기", confidence: 48, sector: "바이오", spark: [55,53,54,51,52,49,50,48,47,49,48,47] },
  { code: "105560", name: "KB금융", price: 92700, change: 1.09, signal: "상승 추세", confidence: 76, sector: "금융", spark: [41,44,43,48,50,49,54,56,55,60,62,64] },
  { code: "055550", name: "신한지주", price: 51800, change: 0.58, signal: "매수 관찰", confidence: 63, sector: "금융", spark: [46,45,48,47,51,50,53,55,54,57,58,60] },
  { code: "005490", name: "POSCO홀딩스", price: 328000, change: -0.91, signal: "대기", confidence: 44, sector: "철강", spark: [62,60,58,59,55,56,52,50,51,48,49,46] },
  { code: "034020", name: "두산에너빌리티", price: 29850, change: 2.45, signal: "상승 추세", confidence: 79, sector: "에너지", spark: [37,40,44,42,47,51,50,55,58,61,63,67] },
  { code: "012450", name: "한화에어로스페이스", price: 816000, change: 1.72, signal: "매수 관찰", confidence: 71, sector: "방산", spark: [40,43,45,48,46,52,54,56,59,58,63,65] },
];

function won(value: number) { return `${Math.round(value).toLocaleString("ko-KR")}원`; }
const portfolioSeries: Record<string, number[]> = {
  "1일": [42,44,43,47,45,49,52,50,54,53,57,59,58,62],
  "3일": [48,45,47,43,46,50,49,54,52,55,59,57,61,63],
  "1주": [39,42,41,45,44,48,46,51,53,52,57,59,61,64],
  "1개월": [52,49,47,50,46,48,51,49,54,56,55,59,61,65],
  "3개월": [35,38,36,41,44,42,48,46,52,55,53,58,62,66],
  "1년": [28,31,35,33,39,42,46,43,50,54,57,55,61,67],
};

function Sparkline({ values, positive = true }: { values: number[]; positive?: boolean }) {
  const points = values.map((v, i) => `${(i/(values.length-1))*100},${70-v}`).join(" ");
  return <svg className="spark" viewBox="0 0 100 42" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} fill="none" stroke={positive ? "#18b87a" : "#ef6a6a"} strokeWidth="2.4" vectorEffect="non-scaling-stroke" /></svg>;
}

export default function Home() {
  const [selected, setSelected] = useState(stocks[0]);
  const [autopilot, setAutopilot] = useState(false);
  const [mode, setMode] = useState<"ai" | "rule">("ai");
  const [capital, setCapital] = useState(500000);
  const [entry, setEntry] = useState(250400);
  const [stop, setStop] = useState(238400);
  const [target, setTarget] = useState(276700);
  const [simulated, setSimulated] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [portfolioRange, setPortfolioRange] = useState("3개월");
  const [marketTick, setMarketTick] = useState(0);
  const [lastSampleUpdate, setLastSampleUpdate] = useState("—");
  const [analysisCount, setAnalysisCount] = useState(0);
  const [analysisTime, setAnalysisTime] = useState("방금 전");

  useEffect(() => {
    const update = () => { setMarketTick(value => value + 1); setLastSampleUpdate(new Date().toLocaleTimeString("ko-KR", { hour12: false })); };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const risk = useMemo(() => Math.max(0, entry - stop), [entry, stop]);
  const reward = useMemo(() => Math.max(0, target - entry), [entry, target]);
  const quantity = Math.max(1, Math.floor(capital / Math.max(entry, 1)));
  const ratio = risk ? (reward / risk).toFixed(1) : "—";
  const normalizedQuery = query.trim().toLowerCase();
  const filteredStocks = stocks.filter(stock =>
    `${stock.name} ${stock.code} ${stock.sector} ${(stock.aliases ?? []).join(" ")}`.toLowerCase().includes(normalizedQuery)
  );
  const searchSuggestions = normalizedQuery ? filteredStocks.slice(0, 6) : [];
  const visibleStocks = showAll || query ? filteredStocks : filteredStocks.slice(0, 5);
  const samplePrice = (stock: Stock) => Math.round((stock.price * (1 + Math.sin((marketTick + Number(stock.code.slice(-2))) * .71) * .00035)) / 100) * 100;

  function chooseStock(stock: Stock) {
    setSelected(stock);
    setEntry(Math.round(stock.price * .982 / 100) * 100);
    setStop(Math.round(stock.price * .935 / 100) * 100);
    setTarget(Math.round(stock.price * 1.085 / 100) * 100);
    setSimulated(false);
    setQuery("");
    setSearchOpen(false);
  }

  function runAiAnalysis() {
    const adjustment = (analysisCount % 3) * .002;
    setEntry(Math.round(selected.price * (.982 + adjustment) / 100) * 100);
    setStop(Math.round(selected.price * (.935 + adjustment / 2) / 100) * 100);
    setTarget(Math.round(selected.price * (1.085 + adjustment) / 100) * 100);
    setAnalysisCount(value => value + 1);
    setAnalysisTime(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }));
    setSimulated(false);
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brandmark">D</span><span>DEHUA <b>AI</b></span></div>
        <nav>
          <button className="nav active"><span>◫</span> 오버뷰</button>
          <button className="nav"><span>⌁</span> 오토파일럿</button>
          <button className="nav"><span>◎</span> 전략</button>
          <button className="nav"><span>↗</span> 거래 내역</button>
          <button className="nav"><span>☆</span> 관심종목</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="paper-badge"><i /> PAPER TRADING</div>
          <button className="nav"><span>⚙</span> 설정</button>
          <div className="profile"><div className="avatar">EK</div><div><strong>Edward Kim</strong><small>기본 플랜</small></div><span>⌄</span></div>
        </div>
      </aside>

      <section className="workspace">
        <header>
          <div><p className="eyebrow">2026년 7월 19일 · 장 마감</p><h1>좋은 저녁이에요, Edward</h1><p className="sub">Dehua가 시장을 지켜보고 있어요.</p></div>
          <div className="header-actions"><div className={`global-search ${searchOpen && normalizedQuery ? "open" : ""}`} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)) setSearchOpen(false)}}><span>⌕</span><input value={query} onFocus={()=>setSearchOpen(true)} onChange={e=>{setQuery(e.target.value);setSearchOpen(true)}} onKeyDown={e=>{if(e.key === "Escape") setSearchOpen(false); if(e.key === "Enter" && searchSuggestions[0]) chooseStock(searchSuggestions[0])}} placeholder="종목명 또는 코드 검색" autoComplete="off" />{searchOpen && normalizedQuery && <div className="search-suggestions" role="listbox">{searchSuggestions.map(stock=><button key={stock.code} role="option" aria-selected={selected.code === stock.code} onMouseDown={e=>e.preventDefault()} onClick={()=>chooseStock(stock)}><span className={`stock-logo logo-${stock.code}`}>{stock.name.slice(0,1)}</span><span className="suggestion-name"><strong>{stock.name}</strong><small>{stock.code} · {stock.sector}</small></span><span className="ticker-alias">{stock.aliases?.find(alias=>alias.toLowerCase().includes(normalizedQuery)) ?? stock.code}</span></button>)}{searchSuggestions.length === 0 && <div className="no-suggestion"><strong>검색 결과가 없어요</strong><small>종목명이나 코드를 다시 확인해 주세요.</small></div>}</div>}</div><button className="icon-btn">♢<em>2</em></button><button className="primary" onClick={() => setAutopilot(!autopilot)}><span className={autopilot ? "live-dot on" : "live-dot"}/>{autopilot ? "오토파일럿 실행 중" : "오토파일럿 시작"}</button></div>
        </header>

        <section className="hero-grid">
          <article className="balance-card">
            <div className="card-top"><span>모의 투자 자산 <i className="sim-tag">SIM</i></span><button>···</button></div>
            <strong className="balance">10,248,500원</strong>
            <div className="positive">+248,500원 <small>(+2.49%)</small></div>
            <div className="portfolio-ranges">{Object.keys(portfolioSeries).map(item=><button key={item} className={portfolioRange===item?"active":""} onClick={()=>setPortfolioRange(item)}>{item}</button>)}</div>
            <div className="chart-wrap"><Sparkline values={portfolioSeries[portfolioRange]} /><div className="chart-glow" /></div>
            <div className="card-foot"><span>투자 가능 <b>7,536,000원</b></span><span>투자 중 <b>2,712,500원</b></span></div>
          </article>

          <article className={`pilot-card ${autopilot ? "running" : ""}`}>
            <div className="pilot-heading"><div className="orb"><span /></div><div><p>DEHUA AUTOPILOT</p><h2>{autopilot ? "자동 운용 중" : "준비 완료"}</h2></div><label className="switch"><input type="checkbox" checked={autopilot} onChange={() => setAutopilot(!autopilot)} /><span /></label></div>
            <p className="pilot-copy">{autopilot ? "승인된 5개 종목의 조건을 실시간으로 확인하고 있어요." : "설정한 한도 안에서 Dehua가 시장을 관찰하고 모의 거래해요."}</p>
            <div className="pilot-stats"><div><small>오늘 거래</small><strong>{autopilot ? "3" : "0"}건</strong></div><div><small>일일 손실 한도</small><strong>2.0%</strong></div><div><small>리스크 사용</small><strong>{autopilot ? "18" : "0"}%</strong></div></div>
            <button className="pilot-settings">운용 설정 보기 <span>→</span></button>
          </article>
        </section>

        <MarketChart name={selected.name} code={selected.code} price={selected.price} entry={entry} stop={stop} target={target} />

        <section className="content-grid">
          <div className="market-panel panel">
            <div className="section-title"><div><h2>주요 종목 <i className="sim-tag pulse">SIMULATED 1s</i></h2><p>{query ? `“${query}” 검색 결과 ${filteredStocks.length}개` : `데이터 연결 전 시세 동작 미리보기 · ${lastSampleUpdate}`}</p></div><button onClick={()=>setShowAll(!showAll)}>{showAll ? "간단히 보기 ↑" : "전체보기 →"}</button></div>
            <div className="stock-list">
              {visibleStocks.map(stock => <button key={stock.code} className={`stock-row ${selected.code === stock.code ? "selected" : ""}`} onClick={() => chooseStock(stock)}>
                <div className={`stock-logo logo-${stock.code}`}>{stock.name.slice(0,1)}</div>
                <div className="stock-name"><strong>{stock.name}</strong><small>{stock.code} · {stock.sector}</small></div>
                <Sparkline values={stock.spark} positive={stock.change >= 0} />
                <div className="stock-price"><strong>{samplePrice(stock).toLocaleString()}</strong><small className={stock.change >= 0 ? "up" : "down"}>{stock.change >= 0 ? "+" : ""}{stock.change}%</small></div>
                <div className={`signal ${stock.signal === "상승 추세" ? "strong" : stock.signal === "중립" ? "neutral" : stock.signal === "대기" ? "wait" : ""}`}><i />{stock.signal}</div>
              </button>)}
              {visibleStocks.length === 0 && <div className="empty-search"><span>⌕</span><strong>검색 결과가 없어요</strong><small>다른 종목명이나 종목 코드를 입력해 보세요.</small></div>}
            </div>
          </div>

          <div className="order-panel panel">
            <div className="section-title"><div><span className="ai-label">AI PLAN</span><h2>{selected.name} 자동 주문</h2></div><div className="confidence"><span>{selected.confidence}%</span> 신뢰도</div></div>
            <div className="tabs"><button className={mode === "ai" ? "active" : ""} onClick={() => setMode("ai")}>AI 추천</button><button className={mode === "rule" ? "active" : ""} onClick={() => setMode("rule")}>직접 설정</button></div>
            {mode === "ai" ? <div className="ai-recommendation">
              <div className="ai-note"><span>✦</span><p><b>단기 스윙 전략</b> · 지지 구간과 거래량 회복 신호를 조합해 Dehua가 계산한 추천안이에요.</p></div>
              <div className="ai-plan-head"><span><i /> 분석 완료 · {analysisTime}</span><button onClick={runAiAnalysis}>↻ 다시 분석</button></div>
              <div className="ai-price-grid">
                <div><small>추천 매수가</small><strong>{entry.toLocaleString()}원</strong><em>현재가 대비 -1.8%</em></div>
                <div className="loss"><small>자동 손절</small><strong>{stop.toLocaleString()}원</strong><em>위험 제한 -4.8%</em></div>
                <div className="gain"><small>1차 목표가</small><strong>{target.toLocaleString()}원</strong><em>예상 상승 +8.5%</em></div>
              </div>
              <div className="ai-reasons"><span>거래량 회복 <b>강함</b></span><span>단기 추세 <b>상승</b></span><span>변동성 <b>보통</b></span></div>
              <div className="ai-allocation"><span>추천 투자금액</span><strong>{capital.toLocaleString()}원 · {quantity}주</strong></div>
            </div> : <>
              <div className="ai-note manual"><span>⌁</span><p>원하는 가격과 투자 금액을 직접 입력하면 해당 조건으로 모의 주문을 실행해요.</p></div>
              <div className="input-grid">
                <label>투자 금액<div><input value={capital} onChange={e=>setCapital(Number(e.target.value))}/><span>원</span></div></label>
                <label>매수 기준가<div><input value={entry} onChange={e=>setEntry(Number(e.target.value))}/><span>원</span></div></label>
                <label>손절가<div className="loss"><input value={stop} onChange={e=>setStop(Number(e.target.value))}/><span>원</span></div></label>
                <label>익절가<div className="gain"><input value={target} onChange={e=>setTarget(Number(e.target.value))}/><span>원</span></div></label>
              </div>
            </>}
            <div className="summary"><div><small>예상 수량</small><strong>{quantity}주</strong></div><div><small>최대 예상 손실</small><strong className="red">-{won(risk*quantity)}</strong></div><div><small>손익비</small><strong>1 : {ratio}</strong></div></div>
            <button className="simulate" onClick={() => setSimulated(true)}>{simulated ? "✓ 전략 시뮬레이션 완료" : "이 전략 시뮬레이션하기"}</button>
            <p className="disclaimer">실제 주문이 아닌 모의 거래입니다. AI 분석은 수익을 보장하지 않습니다.</p>
          </div>
        </section>

        <section className="activity panel">
          <div className="section-title"><div><h2>최근 Dehua 활동</h2><p>모든 판단과 실행 과정이 투명하게 기록돼요.</p></div><button>전체 기록 →</button></div>
          <div className="activity-row"><span className="event buy">매수</span><div><strong>SK하이닉스 모의 매수</strong><small>AI 전략 · 2주 · 212,500원</small></div><p>지지 구간 진입 및 거래량 반등 확인</p><time>오늘 14:32</time></div>
          <div className="activity-row"><span className="event protect">보호</span><div><strong>삼성전자 손절가 조정</strong><small>72,100원 → 72,800원</small></div><p>수익 보호 규칙에 따라 자동 조정</p><time>오늘 11:08</time></div>
        </section>
      </section>
    </main>
  );
}
