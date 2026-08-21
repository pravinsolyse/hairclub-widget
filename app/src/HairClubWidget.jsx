import { useState, useRef, useEffect, useCallback } from "react";

const COLORS = {
  navy: "#1B2838",
  blue: "#2B5C8A",
  blueHover: "#234A72",
  white: "#FFFFFF",
  gray50: "#F5F7F9",
  gray100: "#E8ECF0",
  gray200: "#D0D6DE",
  gray400: "#8B97A5",
  gray600: "#5A6978",
  gray800: "#2D3A47",
  teal: "#407F8E",
  success: "#2E7D4F",
};

const STEPS = [
  { id: "splash", label: "Start" },
  { id: "upload", label: "Upload" },
  { id: "draw", label: "Draw" },
  { id: "form", label: "Details" },
  { id: "generating", label: "Creating" },
  { id: "results", label: "Results" },
];

export default function HairClubWidget() {
  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [maskData, setMaskData] = useState(null);
  const isDrawingRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [results, setResults] = useState(null);
  const [direction, setDirection] = useState(1);
  const [sliderPos, setSliderPos] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const sliderRef = useRef(null);

  const goTo = (s) => {
    setDirection(s > step ? 1 : -1);
    setStep(s);
  };

  const goNext = () => goTo(step + 1);
  const goBack = () => goTo(step - 1);

  // Handle photo upload
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoUrl(ev.target.result);
      setTimeout(() => goTo(2), 300);
    };
    reader.readAsDataURL(file);
  };

  // Canvas drawing setup
  useEffect(() => {
    if (step !== 2 || !canvasRef.current || !photoUrl) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      canvas.width = 340;
      canvas.height = 340 / ratio;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = photoUrl;
  }, [step, photoUrl]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0] || e;
    return {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    isDrawingRef.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(43, 92, 138, 0.35)";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => {
    isDrawingRef.current = false;
    if (canvasRef.current) {
      setMaskData(canvasRef.current.toDataURL());
    }
  };

  // Trigger generation
  const startGeneration = async () => {
    goTo(4);
    setProgress(0);

    let p = 0;
    const interval = setInterval(() => {
      if (p < 95) {
        p += 1;
        setProgress(p);
      }
    }, 150);

    try {
      const res = await fetch("http://127.0.0.1:3001/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoUrl: photoUrl,
          maskData: maskData
        })
      });

      if (!res.ok) {
        throw new Error("Generation API failed");
      }

      const data = await res.json();

      clearInterval(interval);
      setProgress(100);
      setResults({
        beforeUrl: photoUrl,
        afterUrl: data.resultUrl || photoUrl,
      });
      setTimeout(() => goTo(5), 500);

    } catch (err) {
      console.error("Fetch error:", err);
      clearInterval(interval);
      alert("Error: " + err.message + "\nCheck browser console for more details.");
      goTo(1);
    }
  };

  // Slider handling
  const handleSliderMove = useCallback((e) => {
    if (!isDraggingSlider || !sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const touch = e.touches?.[0] || e;
    const x = touch.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  }, [isDraggingSlider]);

  useEffect(() => {
    if (isDraggingSlider) {
      window.addEventListener("mousemove", handleSliderMove);
      window.addEventListener("mouseup", () => setIsDraggingSlider(false));
      window.addEventListener("touchmove", handleSliderMove);
      window.addEventListener("touchend", () => setIsDraggingSlider(false));
    }
    return () => {
      window.removeEventListener("mousemove", handleSliderMove);
      window.removeEventListener("mouseup", () => setIsDraggingSlider(false));
      window.removeEventListener("touchmove", handleSliderMove);
      window.removeEventListener("touchend", () => setIsDraggingSlider(false));
    };
  }, [isDraggingSlider, handleSliderMove]);

  const formValid = formData.firstName && formData.lastName && formData.email;

  // ── DOT INDICATOR ──
  const Dots = () => {
    const visible = [1, 2, 3]; // The 3 main interactive steps
    if (!visible.includes(step)) return null;
    return (
      <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
        {visible.map((s, i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: "50%",
            background: s === step ? "#083B61" : "#D1D5DB",
            transition: "background 0.3s",
          }} />
        ))}
      </div>
    );
  };

  // ── SCREEN 1: SPLASH ──
  const SplashScreen = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#101B2A" }}>
      <div style={{ padding: "16px 20px", textAlign: "center" }}>
        <span style={{ fontFamily: '"Area Normal", sans-serif', fontWeight: 800, fontSize: 18, color: COLORS.white, letterSpacing: 2 }}>HAIRCLUB</span>
      </div>

      {/* The main card */}
      <div style={{
        flex: 1,
        margin: "0 12px 16px",
        borderRadius: 16,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",

      }}>
        {/* Top Image Area */}
        <div style={{ width: "100%", position: "relative" }}>
          <img src="/assets/group.jpg" alt="HairClub" style={{ width: "100%", display: "block" }} />

          {/* Sub-images overlaid over the bottom of the group image */}
          <div style={{
            position: "absolute", bottom: 8, left: 0, right: 0,
            display: "flex", justifyContent: "center", gap: 8, padding: "0 16px", zIndex: "2",
          }}>
            <img src="/assets/wilnelia.png" alt="Wilnelia" style={{ width: "31%", borderRadius: 4, objectFit: "cover" }} />
            <img src="/assets/dan.png" alt="Dan" style={{ width: "31%", borderRadius: 4, objectFit: "cover" }} />
            <img src="/assets/cayle.png" alt="Cayle" style={{ width: "31%", borderRadius: 4, objectFit: "cover" }} />
          </div>

          {/* Gradient overlay to smoothly blend the image into the card background */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 40,
            background: "linear-gradient(to bottom, rgba(27,35,45,0) 0%, #1B232D 100%)",
            pointerEvents: "none"
          }} />
        </div>

        {/* Bottom Content Area */}
        <div style={{
          padding: "24px 24px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flex: 1,
          justifyContent: "flex-end"
        }}>
          <h1 style={{ fontFamily: '"Area Normal", sans-serif', fontSize: 32, fontWeight: 600, color: COLORS.white, margin: "0 0 12px", textAlign: "center", letterSpacing: "-0.5px" }}>
            Find Your Style
          </h1>
          <p style={{ fontSize: 15, color: "#cbd5e1", textAlign: "center", margin: "0 0 32px", lineHeight: 1.5, maxWidth: 260 }}>
            Upload a photo of your face<br />and discover your perfect look
          </p>

          <button onClick={goNext} style={{
            width: "100%", padding: "16px", borderRadius: 50, border: "none",
            background: "#F0F4F8", color: "#0077B6", fontSize: 16, fontWeight: 600,
            fontFamily: '"Area Normal", sans-serif', cursor: "pointer",
            transition: "all 0.2s",
          }}>
            Get Started
          </button>

          <p style={{ fontSize: 11, color: "#64748b", textAlign: "center", marginTop: 24, marginBottom: 0 }}>
            By continuing you agree to our Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );

  // ── SCREEN 2: UPLOAD ──
  const UploadScreen = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: COLORS.white }}>
      {/* Top Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "16px 24px" }}>
        <button onClick={goBack} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#1A1A1A", padding: 0, width: 24, display: "flex", alignItems: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          {Dots()}
        </div>
        <div style={{ width: 24 }} /> {/* Spacer */}
      </div>

      <div style={{ flex: 1, padding: "4px 16px 12px", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <h2 style={{ fontFamily: '"Area Normal", sans-serif', fontSize: 26, fontWeight: 700, color: "#1A1A1A", margin: "0 0 4px", textAlign: "center", letterSpacing: "-0.5px" }}>
          Upload Your Photo
        </h2>
        <p style={{ fontSize: 14, color: "#4B5563", textAlign: "center", margin: "0 0 12px", lineHeight: 1.4 }}>
          Take or upload a clear front-facing photo for<br />the best results
        </p>

        {/* Upload area */}
        <div onClick={() => fileInputRef.current?.click()} style={{
          border: `2px dashed #D1D5DB`, borderRadius: 24, flex: 1, minHeight: 0, padding: 8, overflow: "hidden",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          cursor: "pointer", background: "transparent",
          transition: "border-color 0.2s", marginBottom: 12,
        }}>
          <img src="/assets/camera-icon.png" alt="Camera" style={{ width: 38, marginBottom: 8, flexShrink: 0 }} />
          <p style={{ fontSize: 15, fontWeight: 500, color: "#1A1A1A", margin: 0, textAlign: "center", lineHeight: 1.3, flexShrink: 0 }}>
            Tap to upload or<br />take a photo
          </p>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" capture="user"
          style={{ display: "none" }} onChange={handleFile} />

        <button onClick={() => fileInputRef.current?.click()} style={{
          width: "100%", padding: "14px", borderRadius: 50, border: "none",
          background: "#0A3F68", color: COLORS.white, fontSize: 15, fontWeight: 500,
          fontFamily: '"Area Normal", sans-serif', cursor: "pointer", marginBottom: 8, flexShrink: 0
        }}>
          Take Photo
        </button>
        <button onClick={() => fileInputRef.current?.click()} style={{
          width: "100%", padding: "12px", borderRadius: 50, border: "none",
          background: "transparent", color: "#0A3F68", fontSize: 14, fontWeight: 500,
          fontFamily: '"Area Normal", sans-serif', cursor: "pointer", marginBottom: 12, flexShrink: 0
        }}>
          Choose from Library
        </button>

        {/* Tips & Example Row */}
        <div style={{ display: "flex", gap: 12, alignItems: "start", marginTop: "auto" }}>
          {/* Tips Box */}
          <div style={{
            flex: 1, padding: "14px 16px", background: "#F5F6F8",
            borderRadius: 12, display: "flex", flexDirection: "column",
            justifyContent: "center", textAlign: "left", minWidth: 0
          }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5 }}>
              <span style={{ color: "#0A3F68", display: "flex", alignItems: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6" /><path d="M10 22h4" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" /></svg>
              </span>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0, textAlign: "left", whiteSpace: "nowrap", letterSpacing: "-0.2px" }}>Tips for best results</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <p style={{ fontSize: 12, color: "#535862", margin: 0, textAlign: "left", whiteSpace: "nowrap", letterSpacing: "-0.2px" }}>• &nbsp;Neutral facial expression</p>
              <p style={{ fontSize: 12, color: "#535862", margin: 0, textAlign: "left", whiteSpace: "nowrap", letterSpacing: "-0.2px" }}>• &nbsp;Good lighting on your face</p>
              <p style={{ fontSize: 12, color: "#535862", margin: 0, textAlign: "left", whiteSpace: "nowrap", letterSpacing: "-0.2px" }}>• &nbsp;Look directly at the camera</p>
            </div>
          </div>

          {/* Example Photo */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 100, justifyContent: "flex-start", flexShrink: 0 }}>
            <img src="/assets/example.png" alt="Example" style={{ width: 100, height: 120, objectFit: "cover", borderRadius: 12, marginBottom: 10 }} />
            <span style={{ fontSize: 12, color: "#6B7280", textAlign: "center" }}>Example</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ── SCREEN 3: DRAW ──
  const DrawScreen = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: COLORS.white }}>
      <div style={{ display: "flex", alignItems: "center", padding: "16px 24px" }}>
        <button onClick={goBack} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#1A1A1A", padding: 0, width: 24, display: "flex", alignItems: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          {Dots()}
        </div>
        <div style={{ width: 24 }} /> {/* Spacer */}
      </div>

      <div style={{ flex: 1, padding: "8px 16px 16px", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <h2 style={{ fontFamily: '"Area Normal", sans-serif', fontSize: 28, fontWeight: 700, color: "#1A1A1A", margin: "0 0 8px", textAlign: "center", letterSpacing: "-0.5px", lineHeight: 1.2, flexShrink: 0 }}>
          Draw Over Your Hair<br />Area
        </h2>
        <p style={{ fontSize: 14, color: "#4B5563", textAlign: "center", margin: "0 0 16px", lineHeight: 1.4, flexShrink: 0 }}>
          Use your finger to draw over the areas where<br />you'd like to add hair
        </p>

        {/* Canvas Container */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 16, overflow: "hidden", marginBottom: 16,
          touchAction: "none", minHeight: 0
        }}>
          <canvas ref={canvasRef} style={{
            maxWidth: "100%", maxHeight: "100%", objectFit: "contain",
            touchAction: "none", cursor: "crosshair", borderRadius: 16
          }}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
          />
        </div>

        <button onClick={goNext} style={{
          width: "100%", padding: "16px", borderRadius: 50, border: "none",
          background: "#0A3F68", color: COLORS.white, fontSize: 16, fontWeight: 500,
          fontFamily: '"Area Normal", sans-serif', cursor: "pointer", flexShrink: 0
        }}>
          Generate Styles
        </button>
        <p style={{ fontSize: 11, color: "#6B7280", textAlign: "center", marginTop: 12, marginBottom: 0, flexShrink: 0 }}>
          AI will generate 4 unique looks based on your drawing
        </p>
      </div>
    </div>
  );

  // ── SCREEN 4: LEAD FORM ──
  const FormScreen = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: COLORS.white }}>
      <div style={{ display: "flex", alignItems: "center", padding: "16px 24px 8px" }}>
        <button onClick={goBack} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#1A1A1A", padding: 0, width: 24, display: "flex", alignItems: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          {Dots()}
        </div>
        <div style={{ width: 24 }} /> {/* Spacer */}
      </div>
      <div style={{ flex: 1, padding: "0 24px 24px", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 16px",
          background: "#EAF4F9", margin: "0 -24px 24px -24px",
        }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#0A84C4" }} />
          <span style={{ fontSize: 13, color: "#0A3F68", fontWeight: 600 }}>AI is generating your styles...</span>
        </div>

        <h2 style={{ fontFamily: '"Area Normal", sans-serif', fontSize: 28, fontWeight: 700, color: "#1A1A1A", margin: "0 0 8px", textAlign: "center", letterSpacing: "-0.5px" }}>
          Almost There!
        </h2>
        <p style={{ fontSize: 14, color: "#4B5563", textAlign: "center", margin: "0 0 24px", lineHeight: 1.4 }}>
          Enter your details to receive your<br />personalized style results and book a free<br />consultation
        </p>

        {[
          { key: "firstName", label: "First Name", type: "text" },
          { key: "lastName", label: "Last Name", type: "text" },
          { key: "email", label: "Email Address", type: "email" },
          { key: "phone", label: "Phone Number", type: "tel" },
        ].map(({ key, label, type }) => (
          <div key={key} style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 14, fontWeight: "normal", fontFamily: '"Area Normal", sans-serif', color: "#1A1A1A", display: "block", marginBottom: 8, textAlign: "left" }}>{label}</label>
            <input type={type} value={formData[key]}
              onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 8,
                border: `1px solid #D1D5DB`, fontSize: 15, background: "#FFFFFF",
                fontFamily: '"Area Normal", sans-serif', fontWeight: "normal", color: "#1A1A1A",
                outline: "none", boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = "#0A3F68"}
              onBlur={(e) => e.target.style.borderColor = "#D1D5DB"}
            />
          </div>
        ))}

        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#6B7280", marginBottom: 28, lineHeight: 1.4, cursor: "pointer", textAlign: "left" }}
          onClick={() => setFormData({ ...formData, agreed: !formData.agreed })}>
          <div style={{
            width: 16, height: 16, borderRadius: 4,
            border: formData.agreed ? "1px solid #0A3F68" : "1px solid #D1D5DB",
            background: formData.agreed ? "#0A3F68" : "#FFFFFF",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, marginTop: 2, transition: "all 0.2s"
          }}>
            {formData.agreed && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            )}
          </div>
          <span>I agree to receive personalized offers and<br />style tips from HairClub</span>
        </div>

        <button onClick={startGeneration} disabled={!formValid} style={{
          width: "100%", padding: "16px", borderRadius: 50, border: "none",
          background: formValid ? "#0A3F68" : "#E5E7EB",
          color: formValid ? COLORS.white : "#9CA3AF",
          fontSize: 16, fontWeight: 500, fontFamily: '"Area Normal", sans-serif',
          cursor: formValid ? "pointer" : "default", transition: "all 0.2s",
        }}>
          See My Styles
        </button>
        <p style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", marginTop: 12 }}>
          Your results are being generated and will be ready shortly
        </p>
      </div>
    </div>
  );

  // ── SCREEN 5: GENERATING ──
  const GeneratingScreen = () => {
    const radius = 54;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (progress / 100) * circ;
    const messages = [
      "Analyzing facial structure...",
      "Mapping hairline geometry...",
      "Synthesizing follicle patterns...",
      "Rendering photorealistic preview...",
    ];
    const msgIdx = Math.min(Math.floor(progress / 25), 3);

    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        height: "100%", background: COLORS.white, padding: 24,
      }}>
        {/* Progress ring */}
        <div style={{ position: "relative", width: 140, height: 140, marginBottom: 28 }}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={radius} fill="none" stroke={COLORS.gray100} strokeWidth="8" />
            <circle cx="70" cy="70" r={radius} fill="none" stroke={COLORS.blue} strokeWidth="8"
              strokeDasharray={circ} strokeDashoffset={offset}
              strokeLinecap="round" transform="rotate(-90 70 70)"
              style={{ transition: "stroke-dashoffset 0.3s ease" }}
            />
          </svg>
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            fontFamily: '"Area Normal", sans-serif', fontSize: 28, fontWeight: 700, color: COLORS.navy,
          }}>
            {progress}%
          </div>
        </div>

        <h2 style={{ fontFamily: '"Area Normal", sans-serif', fontSize: 22, fontWeight: 700, color: COLORS.navy, margin: "0 0 8px", textAlign: "center" }}>
          Creating Your Look
        </h2>
        <p style={{ fontSize: 13, color: COLORS.gray600, textAlign: "center", margin: 0, lineHeight: 1.5, maxWidth: 280 }}>
          {messages[msgIdx]}
        </p>
        <p style={{ fontSize: 11, color: COLORS.gray400, textAlign: "center", marginTop: 16 }}>
          This usually takes 30-60 seconds
        </p>
      </div>
    );
  };

  // ── SCREEN 6: RESULTS ──
  const ResultsScreen = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: COLORS.white }}>
      <div style={{ display: "flex", alignItems: "center", padding: "12px 16px" }}>
        <button onClick={() => goTo(0)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: COLORS.gray600, padding: 4 }}>←</button>
      </div>
      {Dots()}
      <div style={{ flex: 1, padding: "8px 24px 24px", display: "flex", flexDirection: "column" }}>
        <h2 style={{ fontFamily: '"Area Normal", sans-serif', fontSize: 28, fontWeight: 700, color: "#1A1A1A", margin: "0 0 8px", textAlign: "center", letterSpacing: "-0.5px", flexShrink: 0 }}>
          Your New Look
        </h2>
        <p style={{ fontSize: 14, color: "#6B7280", textAlign: "center", margin: "0 0 24px", flexShrink: 0 }}>
          Drag the slider to compare before & after
        </p>

        {/* Before/After Slider */}
        <div ref={sliderRef} style={{
          position: "relative", width: "100%", flex: 1, minHeight: 0, borderRadius: 12,
          overflow: "hidden", cursor: "ew-resize", touchAction: "none", marginBottom: 20,
          background: COLORS.gray100,
        }}
          onMouseDown={() => setIsDraggingSlider(true)}
          onTouchStart={() => setIsDraggingSlider(true)}
        >
          {/* Labels */}
          <div style={{
            position: "absolute", top: 16, left: 16, zIndex: 1,
            fontSize: 11, fontWeight: 700, color: COLORS.white, letterSpacing: 1,
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}>BEFORE</div>

          {/* Before image (full) */}
          {photoUrl && <img src={photoUrl} alt="before" style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            objectFit: "cover",
          }} />}

          {/* After image (clipped) */}
          <div style={{
            position: "absolute", top: 0, right: 0, width: `${100 - sliderPos}%`, height: "100%",
            overflow: "hidden", zIndex: 2,
          }}>
            <div style={{
              position: "absolute", top: 16, right: 16, zIndex: 3,
              fontSize: 11, fontWeight: 700, color: COLORS.white, letterSpacing: 1,
              textShadow: "0 1px 4px rgba(0,0,0,0.6)",
            }}>AFTER</div>
            {results?.afterUrl && <img src={results.afterUrl} alt="after" style={{
              position: "absolute", top: 0, right: 0, width: sliderRef.current ? sliderRef.current.offsetWidth : 340,
              height: "100%", objectFit: "cover",
            }} />}
            {/* HC watermark */}
            <div style={{
              position: "absolute", bottom: 12, right: 12, background: "rgba(27,40,56,0.7)",
              padding: "4px 8px", borderRadius: 4, zIndex: 3,
            }}>
              <span style={{ fontFamily: '"Area Normal", sans-serif', fontWeight: 800, fontSize: 10, color: COLORS.white, letterSpacing: 1 }}>HC</span>
            </div>
          </div>

          {/* Slider line + handle */}
          <div style={{
            position: "absolute", top: 0, bottom: 0, left: `${sliderPos}%`,
            width: 3, background: COLORS.white, zIndex: 4, transform: "translateX(-50%)",
            boxShadow: "0 0 8px rgba(0,0,0,0.3)",
          }}>
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              width: 44, height: 44, borderRadius: "50%", background: COLORS.white,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A3F68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14"></line>
                <line x1="4" y1="10" x2="4" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12" y2="3"></line>
                <line x1="20" y1="21" x2="20" y2="16"></line>
                <line x1="20" y1="12" x2="20" y2="3"></line>
                <line x1="1" y1="14" x2="7" y2="14"></line>
                <line x1="9" y1="8" x2="15" y2="8"></line>
                <line x1="17" y1="16" x2="23" y2="16"></line>
              </svg>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <button style={{
          width: "100%", padding: "16px", borderRadius: 50, border: "none",
          background: "#0A3F68", color: COLORS.white, fontSize: 16, fontWeight: 500,
          fontFamily: '"Area Normal", sans-serif', cursor: "pointer", marginBottom: 12, flexShrink: 0,
        }}>
          Book Consultation
        </button>
        <button style={{
          width: "100%", padding: "16px", borderRadius: 50, border: "none",
          background: "#F3F4F6", color: "#0077B6", fontSize: 16, fontWeight: 500,
          fontFamily: '"Area Normal", sans-serif', cursor: "pointer", marginBottom: 12, flexShrink: 0,
        }}>
          See Our Solutions
        </button>
        <button onClick={() => { setPhoto(null); setPhotoUrl(null); setResults(null); setProgress(0); goTo(1); }}
          style={{
            width: "100%", padding: "12px", borderRadius: 50, border: "none",
            background: "transparent", color: "#0077B6", fontSize: 15, fontWeight: 500,
            fontFamily: '"Area Normal", sans-serif', cursor: "pointer", flexShrink: 0,
          }}>
          Generate New
        </button>
      </div>
    </div>
  );

  const screens = [SplashScreen, UploadScreen, DrawScreen, FormScreen, GeneratingScreen, ResultsScreen];
  const CurrentScreen = screens[step];

  return (
    <div style={{
      width: "100%", maxWidth: 420, margin: "0 auto", height: "100dvh",
      fontFamily: '"Area Normal", sans-serif', WebkitFontSmoothing: "antialiased",
      display: "flex", flexDirection: "column", justifyContent: "center"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{
        width: "100%", height: "100%", maxHeight: 850,
        overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        background: COLORS.white, position: "relative",
      }}>
        {CurrentScreen()}
      </div>
    </div>
  );
}





