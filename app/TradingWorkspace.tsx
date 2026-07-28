"use client";

export type TradingWorkspaceMode = "overview" | "paper" | "backtest" | "live";

type Props = {
  mode: Exclude<TradingWorkspaceMode, "overview">;
  onModeChange: (mode: TradingWorkspaceMode) => void;
  stockName: string;
  stockCode: string;
  price: number;
  isSignedIn: boolean;
  onLogin: () => void;
};

const modes = [
  { id: "paper", label: "Paper Trading", short: "PAPER", detail: "현재 시세 · 가상 자금" },
  { id: "backtest", label: "Backtest", short: "BACKTEST", detail: "과거 데이터 · 전략 검증" },
  { id: "live", label: "Live Trading", short: "LIVE", detail: "실제 계좌 · 실제 자금" },
] as const;

export default function TradingWorkspace({ mode, onModeChange, stockName, stockCode, price, isSignedIn, onLogin }: Props) {
  return (
    <section className={`trading-workspace mode-${mode}`}>
      <div className="mode-switcher" aria-label="Trading workspace">
        <button onClick={() => onModeChange("overview")}><span>OVERVIEW</span><strong>시장 대시보드</strong></button>
        {modes.map(item => <button key={item.id} className={mode === item.id ? "active" : ""} onClick={() => onModeChange(item.id)}><span>{item.short}</span><strong>{item.label}</strong><small>{item.detail}</small></button>)}
      </div>

      {mode === "paper" && <div className="mode-canvas">
        <div className="mode-hero">
          <div><span className="mode-badge paper">PAPER · 가상 자금</span><h2>실시간 시장에서, 돈을 잃지 않고 연습하세요.</h2><p>Toss 시세를 보며 주문 과정을 검증합니다. 체결과 손익은 모두 가상이며 실제 계좌에는 영향을 주지 않습니다.</p></div>
          <div className="mode-balance"><small>가상 투자 자산</small><strong>10,000,000원</strong><span>오늘 손익 <b>+0원 (0.00%)</b></span></div>
        </div>
        <div className="mode-grid">
          <article className="mode-card focus">
            <div className="mode-card-head"><div><span>현재 선택</span><h3>{stockName} <small>{stockCode}</small></h3></div><div className="quote"><strong>{Math.round(price).toLocaleString()}원</strong><small>5초마다 현재가 확인</small></div></div>
            <div className="mini-chart" aria-label="Paper trading chart preview"><i/><i/><i/><i/><i/><i/><i/><i/><i/></div>
            <div className="quote-strip"><span>주문 유형 <b>지정가</b></span><span>가상 현금 <b>10,000,000원</b></span><span>보유 수량 <b>0주</b></span></div>
          </article>
          <article className="mode-card ticket">
            <span className="card-label">PAPER ORDER</span><h3>첫 모의 주문 준비</h3><label>주문 가격<div><input readOnly value={Math.round(price)} /><span>원</span></div></label>
            <label>수량<div><input readOnly value="1" /><span>주</span></div></label>
            <button onClick={isSignedIn ? undefined : onLogin}>{isSignedIn ? "모의 주문 검토" : "로그인 후 모의 주문"}</button>
            <p>실제 주문이 실행되지 않습니다.</p>
          </article>
        </div>
      </div>}

      {mode === "backtest" && <div className="mode-canvas">
        <div className="mode-hero">
          <div><span className="mode-badge backtest">BACKTEST · 과거 데이터</span><h2>전략을 과거 시장에서 먼저 시험하세요.</h2><p>선택한 기간을 다시 재생해 수익률뿐 아니라 최대 낙폭, 승률, 거래 빈도와 실패 구간까지 확인합니다.</p></div>
          <div className="mode-balance purple"><small>검증 상태</small><strong>새 테스트</strong><span>결과는 실제 수익을 보장하지 않습니다.</span></div>
        </div>
        <div className="mode-grid backtest-grid">
          <article className="mode-card controls">
            <span className="card-label">TEST SETUP</span><h3>백테스트 조건</h3>
            <div className="control-pair"><label>종목<div className="static-input">{stockName} · {stockCode}</div></label><label>기간<div className="static-input">최근 1년</div></label></div>
            <div className="control-pair"><label>초기 자금<div className="static-input">10,000,000원</div></label><label>전략<div className="static-input">AI 추세 + 리스크 제한</div></label></div>
            <button onClick={isSignedIn ? undefined : onLogin}>{isSignedIn ? "백테스트 준비" : "로그인 후 백테스트"}</button>
          </article>
          <article className="mode-card result-placeholder">
            <div className="result-ring"><span>—</span><small>총 수익률</small></div>
            <div><span>최대 낙폭 <b>—</b></span><span>승률 <b>—</b></span><span>총 거래 <b>—</b></span></div>
            <p>조건을 확인하고 테스트를 실행하면 결과와 거래 타임라인이 이곳에 나타납니다.</p>
          </article>
        </div>
      </div>}

      {mode === "live" && <div className="mode-canvas live-canvas">
        <div className="mode-hero">
          <div><span className="mode-badge live">LIVE · 실제 자금</span><h2>실거래는 확인을 모두 통과한 뒤에만 열립니다.</h2><p>계좌 연결, 주문 권한, 손실 한도와 비상 정지 설정이 완료될 때까지 주문 기능은 잠겨 있습니다.</p></div>
          <div className="live-lock"><span>⌁</span><strong>LIVE LOCKED</strong><small>실제 주문 비활성화</small></div>
        </div>
        <div className="live-checklist">
          <article><span className={isSignedIn ? "done" : ""}>{isSignedIn ? "✓" : "1"}</span><div><strong>Dehua 계정 로그인</strong><small>사용자별 설정과 감사 기록 보호</small></div>{!isSignedIn && <button onClick={onLogin}>로그인</button>}</article>
          <article><span>2</span><div><strong>증권 계좌 연결</strong><small>승인된 브로커 API와 최소 권한 사용</small></div><em>대기</em></article>
          <article><span>3</span><div><strong>리스크 한도 설정</strong><small>일일 손실, 종목별 한도, 손절 기준</small></div><em>대기</em></article>
          <article><span>4</span><div><strong>주문 전 최종 확인</strong><small>Paper 성과와 약관을 검토한 후 활성화</small></div><em>대기</em></article>
        </div>
        <div className="live-warning"><strong>안전 장치</strong><p>Live Trading은 아직 실제 주문을 전송하지 않습니다. UI와 데이터 흐름을 먼저 검증한 후 별도 승인 단계에서 연결합니다.</p></div>
      </div>}
    </section>
  );
}
