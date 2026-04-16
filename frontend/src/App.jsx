import { useState, useRef, useEffect } from "react";
import PromptInput  from "./components/PromptInput";
import WorkflowPlan from "./components/WorkflowPlan";
import ExecutionLog from "./components/ExecutionLog";
import Results      from "./components/Results";

const DARK = {
  bg:      "#0a0a0a",
  bgGradient: "linear-gradient(145deg, #0b0b0b 0%, #242424 45%, #6f6f6f 100%)",
  card:    "#171717",
  border:  "#2a2a2a",
  text:    "#e8e8e8",
  muted:   "#888",
  accent:  "#5a3b6f",
  success: "#69db7c",
  error:   "#ff6b6b",
  logBg:   "#0a0a0a"
};

const SAMPLE_PROMPTS = [
  {
    category: "🌐 Web Search",
    prompts: [
      "Search Google for the latest AI news",
      "What is quantum computing?",
      "Who is Elon Musk?",
      "Latest news about SpaceX"
    ]
  },
  {
    category: "📊 Data Analysis",
    prompts: [
      "Analyze the CSV at ./data/sample.csv and provide top trends",
      "What are the sales trends in ./data/sample.csv?"
    ]
  },
  {
    category: "📅 Scheduling",
    prompts: [
      "Schedule a meeting about project planning tomorrow",
      "Schedule a meeting about quarterly review next week"
    ]
  },
  {
    category: "📰 Tech News",
    prompts: [
      "Summarize todays tech news",
      "Summarize todays tech news and send via email",
      "Find tech news on Hacker News and email me a summary"
    ]
  },
  {
    category: "🔍 Reddit",
    prompts: [
      "give the top 5 posts from r/cats",
      "Show me the top Reddit posts of all time",
      "What is hot on Reddit today?"
    ]
  },
  {
    category: "🔀 Multi-Tool",
    prompts: [
      "Search Reddit and Hacker News for AI news and compare them",
      "Search Google for Tesla news and summarize",
      "Find AI breakthroughs on Hacker News and email me"
    ]
  }
];

export default function App() {
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);
  const [data,           setData]           = useState(null);
  const [progress,       setProgress]       = useState(0);
  const [showResults,    setShowResults]    = useState(false);
  const [showTips,       setShowTips]       = useState(true);
  const [uploadedFile,   setUploadedFile]   = useState(null);
  const [uploading,      setUploading]      = useState(false);
  const [uploadError,    setUploadError]    = useState(null);
  const fileInputRef = useRef(null);
  const progressTimerRef = useRef(null);
  const revealTimerRef = useRef(null);
  const progressRef = useRef(0);

  function stopProgressAnimation() {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }

  function stopRevealTimer() {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }

  function startProgressAnimation() {
    stopProgressAnimation();
    setProgress(2);
    progressRef.current = 2;

    progressTimerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 84) return prev;
        const step = Math.max(0.06, (84 - prev) * 0.018);
        const next = Math.min(84, Number((prev + step).toFixed(2)));
        progressRef.current = next;
        return next;
      });
    }, 180);
  }

  async function rampProgressTo100() {
    stopProgressAnimation();
    const start = progressRef.current;
    const duration = 1800;
    const tick = 32;
    const steps = Math.ceil(duration / tick);

    await new Promise(resolve => {
      let i = 0;
      const timer = setInterval(() => {
        i += 1;
        const t = Math.min(1, i / steps);
        const eased = 1 - Math.pow(1 - t, 3);
        const value = start + (100 - start) * eased;
        const next = Number(value.toFixed(2));
        progressRef.current = next;
        setProgress(next);

        if (t >= 1) {
          clearInterval(timer);
          progressRef.current = 100;
          setProgress(100);
          resolve();
        }
      }, tick);
    });
  }

  useEffect(() => {
    return () => {
      stopProgressAnimation();
      stopRevealTimer();
    };
  }, []);

  async function handleRun(prompt) {
    setLoading(true);
    setError(null);
    setData(null);
    setShowResults(false);
    setShowTips(false);
    stopRevealTimer();
    startProgressAnimation();

    try {
      const res = await fetch("http://localhost:3001/api/workflow/run", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ prompt })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      await rampProgressTo100();
      await new Promise(resolve => {
        revealTimerRef.current = setTimeout(() => {
          revealTimerRef.current = null;
          resolve();
        }, 3000);
      });
      setData(json);
      setTimeout(() => setShowResults(true), 10);

    } catch (err) {
      stopProgressAnimation();
      stopRevealTimer();
      progressRef.current = 0;
      setProgress(0);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      setUploadError("Only CSV files are supported");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:3001/api/upload", {
        method: "POST",
        body:   formData
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");

      setUploadedFile(json);
      console.log("Uploaded:", json);

    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function handleAnalyzeUploaded() {
    if (!uploadedFile) return;
    handleRun(`Analyze the CSV at ${uploadedFile.path} and provide top trends`);
  }

  return (
    <div style={{ ...styles.page, backgroundColor: DARK.bg, backgroundImage: DARK.bgGradient, color: DARK.text }}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <h1 style={{ ...styles.title, color: DARK.text }}>🤖 AI Workflow Generator</h1>
          <p style={{ ...styles.subtitle, color: DARK.muted }}>
            Enter a prompt — AI plans the workflow, picks the tools, and runs it
          </p>
        </div>

        {/* Prompt Input */}
        <PromptInput onRun={handleRun} loading={loading} theme={DARK} />

        {/* File Upload Section */}
        <div style={{ ...styles.uploadBox, background: DARK.card, border: `1px solid ${DARK.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ color: DARK.muted, fontSize: 13 }}>📁 Upload CSV for analysis:</span>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                background:   uploading ? "#1a1a1a" : "#241a2f",
                color:        DARK.accent,
                border:       `1px solid ${DARK.accent}`,
                borderRadius: 6,
                padding:      "6px 14px",
                fontSize:     13,
                cursor:       uploading ? "not-allowed" : "pointer",
                fontFamily:   "system-ui, sans-serif"
              }}
            >
              {uploading ? "Uploading..." : "Choose CSV File"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />

            {uploadedFile && (
              <>
                <span style={{ color: DARK.success, fontSize: 13 }}>
                  ✅ {uploadedFile.filename} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  onClick={handleAnalyzeUploaded}
                  disabled={loading}
                  style={{
                    background:   DARK.accent,
                    color:        "#fff",
                    border:       "none",
                    borderRadius: 6,
                    padding:      "6px 14px",
                    fontSize:     13,
                    cursor:       loading ? "not-allowed" : "pointer",
                    fontFamily:   "system-ui, sans-serif",
                    fontWeight:   600
                  }}
                >
                  Analyze This File →
                </button>
                <button
                  onClick={() => setUploadedFile(null)}
                  style={{
                    background:   "transparent",
                    color:        DARK.muted,
                    border:       "none",
                    cursor:       "pointer",
                    fontSize:     13
                  }}
                >
                  ✕ Clear
                </button>
              </>
            )}

            {uploadError && (
              <span style={{ color: DARK.error, fontSize: 13 }}>❌ {uploadError}</span>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{ ...styles.banner, background: "#2a1010", border: `1px solid ${DARK.error}`, color: DARK.error }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Loading Banner */}
        {loading && (
          <div style={{ ...styles.banner, background: "#1b1424", border: `1px solid ${DARK.accent}`, color: DARK.accent }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span>⟳ Running workflow...</span>
              <span style={{ fontFamily: "monospace", fontSize: 12 }}>{Math.round(progress)}%</span>
            </div>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, background: DARK.accent, width: `${progress}%` }} />
            </div>
            <p style={{ margin: "10px 0 0 0", fontSize: 12, color: DARK.muted }}>
              Planning steps, executing tools, and preparing response...
            </p>
          </div>
        )}

        {/* Sample Prompts */}
        {showTips && !loading && !data && (
          <div style={{ marginTop: 32 }}>
            <p style={{ color: DARK.muted, fontSize: 13, marginBottom: 16 }}>
              Try one of these example prompts:
            </p>
            {SAMPLE_PROMPTS.map((group, gi) => (
              <div key={gi} style={{ marginBottom: 20 }}>
                <p style={{ color: DARK.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, fontFamily: "monospace" }}>
                  {group.category}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {group.prompts.map((prompt, pi) => (
                    <button
                      key={pi}
                      onClick={() => handleRun(prompt)}
                      style={{
                        background:   DARK.card,
                        border:       `1px solid ${DARK.border}`,
                        borderRadius: 6,
                        padding:      "7px 12px",
                        fontSize:     13,
                        color:        DARK.text,
                        cursor:       "pointer",
                        textAlign:    "left",
                        fontFamily:   "system-ui, sans-serif",
                        maxWidth:     360
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = DARK.accent}
                      onMouseLeave={e => e.currentTarget.style.borderColor = DARK.border}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {data && (
          <div
            style={{
              ...styles.resultsWrap,
              opacity: showResults ? 1 : 0,
              transform: showResults ? "translateY(0)" : "translateY(10px)"
            }}
          >
            <button
              onClick={() => { setData(null); setShowTips(true); setShowResults(false); progressRef.current = 0; setProgress(0); }}
              style={{
                marginTop:    16,
                background:   "transparent",
                border:       `1px solid ${DARK.border}`,
                borderRadius: 6,
                padding:      "6px 14px",
                fontSize:     12,
                color:        DARK.muted,
                cursor:       "pointer",
                fontFamily:   "system-ui, sans-serif"
              }}
            >
              ← New Workflow
            </button>

            <WorkflowPlan plan={data.plan} theme={DARK} />
            <ExecutionLog logs={data.logs} theme={DARK} />
            <Results      results={data.results} theme={DARK} />
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  page:      { minHeight: "100vh", padding: "40px 0" },
  container: { maxWidth: 820, margin: "0 auto", padding: "0 24px" },
  header:    { marginBottom: 32 },
  title:     { fontSize: 32, fontWeight: 700, margin: "0 0 8px 0", fontFamily: "system-ui, sans-serif" },
  subtitle:  { fontSize: 15, margin: 0, fontFamily: "system-ui, sans-serif" },
  uploadBox: { borderRadius: 8, padding: "12px 16px", marginTop: 12 },
  banner:    { borderRadius: 8, padding: "14px 18px", marginTop: 16, fontSize: 14, fontFamily: "system-ui, sans-serif" },
  progressTrack: { width: "100%", height: 8, borderRadius: 999, overflow: "hidden", background: "#2a2433", border: "1px solid #3a2f46" },
  progressFill: { height: "100%", borderRadius: 999, transition: "width 240ms ease" },
  resultsWrap: { transition: "opacity 420ms ease, transform 420ms ease" }
};
