import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "../lib/authContext";
import Head from "next/head";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import {
	Upload,
	RotateCw,
	RotateCcw,
	Trash2,
	ChevronLeft,
	ChevronRight,
	Download,
	FileText,
	Image as ImageIcon,
	Maximize2,
	Sun,
	Contrast,
	Eye,
	EyeOff,
	ArrowUp,
	ArrowDown,
	Check,
	Camera,
	Crop,
	Wand2,
	ScanLine,
	FilePlus,
	GripVertical,
	ZoomIn,
	ZoomOut,
	RefreshCw,
	Sparkles,
	X,
	Type,
	PenLine,
	Hash,
} from "lucide-react";

// ─────────────────────────── HELPERS ───────────────────────────

function createImage(url) {
	return new Promise((resolve, reject) => {
		const img = new window.Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = url;
	});
}

// Simple auto‑detect: find a rectangular region – returns 4 corners
function autoDetectEdges(img) {
	const canvas = document.createElement("canvas");
	const w = img.naturalWidth || img.width;
	const h = img.naturalHeight || img.height;
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext("2d");
	ctx.drawImage(img, 0, 0, w, h);

	const imageData = ctx.getImageData(0, 0, w, h);
	const data = imageData.data;

	// Convert to grayscale and find edges using simple thresholding
	const gray = new Uint8Array(w * h);
	for (let i = 0; i < w * h; i++) {
		const r = data[i * 4];
		const g = data[i * 4 + 1];
		const b = data[i * 4 + 2];
		gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
	}

	// Simple edge detection: find bounding rect of darker content
	const threshold = 240;
	let minX = w, minY = h, maxX = 0, maxY = 0;
	let foundEdge = false;

	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			if (gray[y * w + x] < threshold) {
				if (x < minX) minX = x;
				if (y < minY) minY = y;
				if (x > maxX) maxX = x;
				if (y > maxY) maxY = y;
				foundEdge = true;
			}
		}
	}

	if (!foundEdge || (maxX - minX) < w * 0.1 || (maxY - minY) < h * 0.1) {
		// Default: 5% margin
		const m = 0.05;
		return [
			{ x: m * w, y: m * h },
			{ x: (1 - m) * w, y: m * h },
			{ x: (1 - m) * w, y: (1 - m) * h },
			{ x: m * w, y: (1 - m) * h },
		];
	}

	// Add a small margin
	const mx = (maxX - minX) * 0.01;
	const my = (maxY - minY) * 0.01;
	return [
		{ x: Math.max(0, minX - mx), y: Math.max(0, minY - my) },
		{ x: Math.min(w, maxX + mx), y: Math.max(0, minY - my) },
		{ x: Math.min(w, maxX + mx), y: Math.min(h, maxY + my) },
		{ x: Math.max(0, minX - mx), y: Math.min(h, maxY + my) },
	];
}

// Perspective correction using 2D canvas (simplified bi‑linear)
function perspectiveTransform(img, corners, outputW, outputH) {
	const canvas = document.createElement("canvas");
	canvas.width = outputW;
	canvas.height = outputH;
	const ctx = canvas.getContext("2d");

	// Source corners TL, TR, BR, BL
	const [tl, tr, br, bl] = corners;

	// Create temporary source canvas
	const srcCanvas = document.createElement("canvas");
	srcCanvas.width = img.naturalWidth || img.width;
	srcCanvas.height = img.naturalHeight || img.height;
	const srcCtx = srcCanvas.getContext("2d");
	srcCtx.drawImage(img, 0, 0);
	const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);

	const dstData = ctx.createImageData(outputW, outputH);

	for (let dy = 0; dy < outputH; dy++) {
		for (let dx = 0; dx < outputW; dx++) {
			const u = dx / outputW;
			const v = dy / outputH;

			// Bilinear interpolation in source
			const topX = tl.x + (tr.x - tl.x) * u;
			const topY = tl.y + (tr.y - tl.y) * u;
			const botX = bl.x + (br.x - bl.x) * u;
			const botY = bl.y + (br.y - bl.y) * u;

			const sx = topX + (botX - topX) * v;
			const sy = topY + (botY - topY) * v;

			const ix = Math.floor(sx);
			const iy = Math.floor(sy);

			if (ix >= 0 && ix < srcCanvas.width && iy >= 0 && iy < srcCanvas.height) {
				const si = (iy * srcCanvas.width + ix) * 4;
				const di = (dy * outputW + dx) * 4;
				dstData.data[di] = srcData.data[si];
				dstData.data[di + 1] = srcData.data[si + 1];
				dstData.data[di + 2] = srcData.data[si + 2];
				dstData.data[di + 3] = srcData.data[si + 3];
			}
		}
	}

	ctx.putImageData(dstData, 0, 0);
	return canvas;
}

// Apply enhancement filter to a canvas and return new canvas
function applyFilter(srcCanvas, filterName) {
	const w = srcCanvas.width;
	const h = srcCanvas.height;
	const canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext("2d");

	switch (filterName) {
		case "bw": {
			ctx.drawImage(srcCanvas, 0, 0);
			const imgData = ctx.getImageData(0, 0, w, h);
			const d = imgData.data;
			for (let i = 0; i < d.length; i += 4) {
				const avg = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
				const v = avg > 128 ? 255 : 0;
				d[i] = d[i + 1] = d[i + 2] = v;
			}
			ctx.putImageData(imgData, 0, 0);
			break;
		}
		case "grayscale": {
			ctx.drawImage(srcCanvas, 0, 0);
			const imgData = ctx.getImageData(0, 0, w, h);
			const d = imgData.data;
			for (let i = 0; i < d.length; i += 4) {
				const avg = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
				d[i] = d[i + 1] = d[i + 2] = avg;
			}
			ctx.putImageData(imgData, 0, 0);
			break;
		}
		case "enhanced": {
			// Increase contrast + saturation
			ctx.filter = "contrast(1.3) saturate(1.4) brightness(1.05)";
			ctx.drawImage(srcCanvas, 0, 0);
			ctx.filter = "none";
			break;
		}
		case "sharp": {
			// High contrast grayscale with sharpening effect
			ctx.filter = "contrast(1.8) brightness(1.1)";
			ctx.drawImage(srcCanvas, 0, 0);
			ctx.filter = "none";
			const imgData = ctx.getImageData(0, 0, w, h);
			const d = imgData.data;
			for (let i = 0; i < d.length; i += 4) {
				const avg = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
				const v = Math.min(255, Math.max(0, avg * 1.2 - 20));
				d[i] = d[i + 1] = d[i + 2] = v;
			}
			ctx.putImageData(imgData, 0, 0);
			break;
		}
		default: {
			// original
			ctx.drawImage(srcCanvas, 0, 0);
			break;
		}
	}
	return canvas;
}

function canvasToBlob(canvas, type = "image/jpeg", quality = 0.92) {
	return new Promise((resolve) => {
		canvas.toBlob((blob) => resolve(blob), type, quality);
	});
}

function canvasToDataURL(canvas, type = "image/jpeg", quality = 0.92) {
	return canvas.toDataURL(type, quality);
}

// Draw overlay options (custom text, watermark, signature, page number) onto a canvas
async function drawOverlaysOnCanvas(canvas, opts) {
	const {
		customText = "",
		customTextColor = "#000000",
		customTextPosition = "footer",
		watermarkEnabled = false,
		watermarkText = "",
		watermarkColor = "#000000",
		watermarkPosition: wmPos = "center",
		signatureDataUrl = null,
		signaturePosition: sigPos = "bottom-right",
		signatureMaxWidth = 120,
		signatureMaxHeight = 50,
		pageNumEnabled = false,
		pageNumFormat = "1 of N",
		pageNumPosition = "bottom-center",
		pageNumColor = "#000000",
		pageIndex = 0,
		totalPages = 1,
	} = opts || {};

	const out = document.createElement("canvas");
	out.width = canvas.width;
	out.height = canvas.height;
	const ctx = out.getContext("2d");
	ctx.drawImage(canvas, 0, 0);

	const w = out.width;
	const h = out.height;
	const pad = Math.max(12, Math.min(w, h) * 0.02);
	const fontSize = Math.max(10, Math.min(w, h) * 0.025);
	const fontSizeSmall = Math.max(9, fontSize * 0.85);

	const isCustomPos = (p) => p && typeof p === "object" && typeof p.xPercent === "number" && typeof p.yPercent === "number";

	// Custom text (header/footer/center or custom xPercent,yPercent)
	if (customText && customText.trim()) {
		ctx.save();
		ctx.font = `bold ${fontSize}px Arial`;
		ctx.fillStyle = customTextColor;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		let x = w / 2, y = h / 2;
		if (isCustomPos(customTextPosition)) {
			x = (customTextPosition.xPercent / 100) * w;
			y = (customTextPosition.yPercent / 100) * h;
		} else if (customTextPosition === "header") y = pad + fontSize / 2;
		else if (customTextPosition === "footer") y = h - pad - fontSize / 2;
		ctx.fillText(customText.trim(), x, y);
		ctx.restore();
	}

	// Watermark (diagonal, center or custom position)
	if (watermarkEnabled && watermarkText && watermarkText.trim()) {
		ctx.save();
		ctx.globalAlpha = 0.35;
		ctx.font = `bold ${Math.min(48, w * 0.08)}px Arial`;
		ctx.fillStyle = watermarkColor;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		const wx = isCustomPos(wmPos) ? (wmPos.xPercent / 100) * w : w / 2;
		const wy = isCustomPos(wmPos) ? (wmPos.yPercent / 100) * h : h / 2;
		ctx.translate(wx, wy);
		ctx.rotate(-Math.PI / 4);
		ctx.fillText(watermarkText.trim(), 0, 0);
		ctx.restore();
	}

	// Signature image (async load)
	if (signatureDataUrl) {
		await new Promise((resolve, reject) => {
			const img = new window.Image();
			img.crossOrigin = "anonymous";
			img.onload = () => {
				const scale = Math.min(signatureMaxWidth / img.width, signatureMaxHeight / img.height, 1);
				const sw = img.width * scale;
				const sh = img.height * scale;
				let sx, sy;
				if (isCustomPos(sigPos)) {
					sx = (sigPos.xPercent / 100) * w - sw / 2;
					sy = (sigPos.yPercent / 100) * h - sh / 2;
				} else {
					sy = h - sh - pad;
					if (sigPos === "bottom-right") sx = w - sw - pad;
					else if (sigPos === "bottom-center") sx = (w - sw) / 2;
					else sx = pad;
				}
				ctx.drawImage(img, sx, sy, sw, sh);
				resolve();
			};
			img.onerror = reject;
			img.src = signatureDataUrl;
		});
	}

	// Page number
	if (pageNumEnabled && totalPages >= 1) {
		const num = pageIndex + 1;
		let label = `${num}`;
		if (pageNumFormat === "1 of N") label = `${num} of ${totalPages}`;
		else if (pageNumFormat === "Page 1") label = `Page ${num}`;
		ctx.save();
		ctx.font = `${fontSizeSmall}px Arial`;
		ctx.fillStyle = pageNumColor;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		let y = h - pad - fontSizeSmall / 2;
		let x = w / 2;
		if (pageNumPosition === "bottom-left") x = pad + 20;
		else if (pageNumPosition === "bottom-right") x = w - pad - 20;
		ctx.fillText(label, x, y);
		ctx.restore();
	}

	return out;
}

// ─────────────────────────── STEP INDICATOR ───────────────────────────

const STEPS = [
	{ id: 0, label: "Upload", icon: Upload, desc: "Add document photos" },
	{ id: 1, label: "Crop", icon: Crop, desc: "Adjust document edges" },
	{ id: 2, label: "Enhance", icon: Wand2, desc: "Apply scan filters" },
	{ id: 3, label: "Export", icon: Download, desc: "Save your scanned files" },
];

function StepIndicator({ currentStep, onStepClick, maxReachedStep }) {
	return (
		<div className="flex items-center justify-center gap-0 mb-8">
			{STEPS.map((step, i) => {
				const Icon = step.icon;
				const isActive = currentStep === step.id;
				const isCompleted = step.id < currentStep;
				const isClickable = step.id <= maxReachedStep;
				return (
					<div key={step.id} className="flex items-center">
						<button
							onClick={() => isClickable && onStepClick(step.id)}
							disabled={!isClickable}
							className={cn(
								"flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-300 min-w-[80px]",
								isActive && "bg-primary/10 scale-105",
								isCompleted && "opacity-80",
								isClickable
									? "cursor-pointer hover:bg-primary/5"
									: "cursor-not-allowed opacity-40"
							)}
						>
							<div
								className={cn(
									"w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
									isActive
										? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30"
										: isCompleted
											? "bg-primary/20 text-primary border-primary/40"
											: "bg-muted text-muted-foreground border-border"
								)}
							>
								{isCompleted ? (
									<Check className="w-4 h-4" />
								) : (
									<Icon className="w-4 h-4" />
								)}
							</div>
							<span
								className={cn(
									"text-xs font-medium transition-colors",
									isActive
										? "text-primary"
										: isCompleted
											? "text-primary/70"
											: "text-muted-foreground"
								)}
							>
								{step.label}
							</span>
						</button>
						{i < STEPS.length - 1 && (
							<div
								className={cn(
									"w-8 h-0.5 transition-colors duration-300 hidden sm:block",
									i < currentStep ? "bg-primary/40" : "bg-border"
								)}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}

// ─────────────────────────── CORNER OVERLAY (CamScanner-style) ───────────────────────────

// Calculate actual image render rect inside an object-contain container
function getImageRenderRect(containerEl, naturalW, naturalH) {
	if (!containerEl) return null;
	const rect = containerEl.getBoundingClientRect();
	const containerW = rect.width;
	const containerH = rect.height;
	const imgRatio = naturalW / naturalH;
	const containerRatio = containerW / containerH;

	let renderW, renderH, offsetX, offsetY;
	if (imgRatio > containerRatio) {
		renderW = containerW;
		renderH = containerW / imgRatio;
		offsetX = 0;
		offsetY = (containerH - renderH) / 2;
	} else {
		renderH = containerH;
		renderW = containerH * imgRatio;
		offsetX = (containerW - renderW) / 2;
		offsetY = 0;
	}
	return { renderW, renderH, offsetX, offsetY, containerW, containerH };
}

function CornerOverlay({ corners, setCorners, containerRef, imgDims, imgSrc }) {
	const [dragging, setDragging] = useState(null);
	const [dragScreenPos, setDragScreenPos] = useState(null);
	const magnifierCanvasRef = useRef(null);
	const magnifierImgRef = useRef(null);

	// Load image for magnifier
	useEffect(() => {
		if (!imgSrc) return;
		const img = new window.Image();
		img.crossOrigin = "anonymous";
		img.src = imgSrc;
		img.onload = () => { magnifierImgRef.current = img; };
	}, [imgSrc]);

	const getRenderRect = useCallback(() => {
		if (!containerRef.current || !imgDims) return null;
		return getImageRenderRect(containerRef.current, imgDims.naturalW, imgDims.naturalH);
	}, [containerRef, imgDims]);

	// Convert screen coords → image coords (accounting for object-contain offset)
	const screenToImage = useCallback(
		(e) => {
			const rr = getRenderRect();
			if (!rr || !imgDims) return null;
			const containerRect = containerRef.current.getBoundingClientRect();
			const clientX = e.touches ? e.touches[0].clientX : e.clientX;
			const clientY = e.touches ? e.touches[0].clientY : e.clientY;
			// Position relative to actual image render area
			const relX = clientX - containerRect.left - rr.offsetX;
			const relY = clientY - containerRect.top - rr.offsetY;
			const x = (relX / rr.renderW) * imgDims.naturalW;
			const y = (relY / rr.renderH) * imgDims.naturalH;
			return {
				x: Math.max(0, Math.min(imgDims.naturalW, x)),
				y: Math.max(0, Math.min(imgDims.naturalH, y)),
			};
		},
		[containerRef, imgDims, getRenderRect]
	);

	// Convert image coords → CSS percent within container
	const imageToCSS = useCallback(
		(c) => {
			const rr = getRenderRect();
			if (!rr || !imgDims) return { left: "0%", top: "0%" };
			const px = rr.offsetX + (c.x / imgDims.naturalW) * rr.renderW;
			const py = rr.offsetY + (c.y / imgDims.naturalH) * rr.renderH;
			return {
				left: `${(px / rr.containerW) * 100}%`,
				top: `${(py / rr.containerH) * 100}%`,
			};
		},
		[imgDims, getRenderRect]
	);

	// Convert image coords → SVG viewport coords (0-1000 range)
	const imageToSVG = useCallback(
		(c) => {
			const rr = getRenderRect();
			if (!rr || !imgDims) return { x: 0, y: 0 };
			const px = rr.offsetX + (c.x / imgDims.naturalW) * rr.renderW;
			const py = rr.offsetY + (c.y / imgDims.naturalH) * rr.renderH;
			return {
				x: (px / rr.containerW) * 1000,
				y: (py / rr.containerH) * 1000,
			};
		},
		[imgDims, getRenderRect]
	);

	// Draw magnifier
	const drawMagnifier = useCallback((imgCoords, screenX, screenY) => {
		const canvas = magnifierCanvasRef.current;
		const sourceImg = magnifierImgRef.current;
		if (!canvas || !sourceImg || !imgDims) return;
		const ctx = canvas.getContext("2d");
		const size = 120;
		const zoom = 3;
		canvas.width = size;
		canvas.height = size;

		// Source region
		const srcW = (imgDims.naturalW / zoom) * 0.15;
		const srcH = (imgDims.naturalH / zoom) * 0.15;
		const sx = imgCoords.x - srcW / 2;
		const sy = imgCoords.y - srcH / 2;

		// Clear and draw zoomed region
		ctx.clearRect(0, 0, size, size);
		ctx.save();
		ctx.beginPath();
		ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
		ctx.clip();
		ctx.drawImage(sourceImg, sx, sy, srcW, srcH, 0, 0, size, size);
		// Crosshair
		ctx.strokeStyle = "rgba(34, 197, 94, 0.9)";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(size / 2 - 12, size / 2);
		ctx.lineTo(size / 2 + 12, size / 2);
		ctx.moveTo(size / 2, size / 2 - 12);
		ctx.lineTo(size / 2, size / 2 + 12);
		ctx.stroke();
		// Border
		ctx.strokeStyle = "rgba(34, 197, 94, 0.8)";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
		ctx.stroke();
		ctx.restore();
	}, [imgDims]);

	const handlePointerDown = useCallback((idx, e) => {
		e.preventDefault();
		e.stopPropagation();
		setDragging(idx);
		const clientX = e.touches ? e.touches[0].clientX : e.clientX;
		const clientY = e.touches ? e.touches[0].clientY : e.clientY;
		setDragScreenPos({ x: clientX, y: clientY });
	}, []);

	useEffect(() => {
		if (dragging === null) return;

		const handleMove = (e) => {
			e.preventDefault();
			const coords = screenToImage(e);
			if (!coords) return;
			const clientX = e.touches ? e.touches[0].clientX : e.clientX;
			const clientY = e.touches ? e.touches[0].clientY : e.clientY;
			setDragScreenPos({ x: clientX, y: clientY });
			drawMagnifier(coords, clientX, clientY);
			setCorners((prev) => {
				const next = [...prev];
				next[dragging] = coords;
				return next;
			});
		};

		const handleUp = () => {
			setDragging(null);
			setDragScreenPos(null);
		};

		window.addEventListener("mousemove", handleMove);
		window.addEventListener("mouseup", handleUp);
		window.addEventListener("touchmove", handleMove, { passive: false });
		window.addEventListener("touchend", handleUp);
		return () => {
			window.removeEventListener("mousemove", handleMove);
			window.removeEventListener("mouseup", handleUp);
			window.removeEventListener("touchmove", handleMove);
			window.removeEventListener("touchend", handleUp);
		};
	}, [dragging, screenToImage, setCorners, drawMagnifier]);

	// Edge midpoint drag
	const handleEdgeDrag = useCallback((edgeIdx, e) => {
		e.preventDefault();
		e.stopPropagation();
		// edgeIdx: 0=top(0-1), 1=right(1-2), 2=bottom(2-3), 3=left(3-0)
		const edgePairs = [[0, 1], [1, 2], [2, 3], [3, 0]];
		const [a, b] = edgePairs[edgeIdx];

		const startCoords = screenToImage(e);
		if (!startCoords) return;
		const startA = { ...corners[a] };
		const startB = { ...corners[b] };

		const onMove = (ev) => {
			ev.preventDefault();
			const cur = screenToImage(ev);
			if (!cur) return;
			const dx = cur.x - startCoords.x;
			const dy = cur.y - startCoords.y;
			setCorners((prev) => {
				const next = [...prev];
				next[a] = {
					x: Math.max(0, Math.min(imgDims.naturalW, startA.x + dx)),
					y: Math.max(0, Math.min(imgDims.naturalH, startA.y + dy)),
				};
				next[b] = {
					x: Math.max(0, Math.min(imgDims.naturalW, startB.x + dx)),
					y: Math.max(0, Math.min(imgDims.naturalH, startB.y + dy)),
				};
				return next;
			});
		};
		const onUp = () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
			window.removeEventListener("touchmove", onMove);
			window.removeEventListener("touchend", onUp);
		};
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
		window.addEventListener("touchmove", onMove, { passive: false });
		window.addEventListener("touchend", onUp);
	}, [corners, screenToImage, setCorners, imgDims]);

	if (!imgDims) return null;

	// SVG points
	const svgCorners = corners.map(imageToSVG);
	const svgPath = `M ${svgCorners.map(c => `${c.x} ${c.y}`).join(" L ")} Z`;

	// Edge midpoints for dragging
	const edgeMids = [
		{ x: (corners[0].x + corners[1].x) / 2, y: (corners[0].y + corners[1].y) / 2 },
		{ x: (corners[1].x + corners[2].x) / 2, y: (corners[1].y + corners[2].y) / 2 },
		{ x: (corners[2].x + corners[3].x) / 2, y: (corners[2].y + corners[3].y) / 2 },
		{ x: (corners[3].x + corners[0].x) / 2, y: (corners[3].y + corners[0].y) / 2 },
	];

	// Corner bracket size (in SVG units)
	const bracketLen = 30;

	// Magnifier position
	const magnifierStyle = dragScreenPos && containerRef.current ? (() => {
		const cr = containerRef.current.getBoundingClientRect();
		const mx = dragScreenPos.x - cr.left;
		const my = dragScreenPos.y - cr.top;
		// Position magnifier above the finger/cursor
		return {
			position: "absolute",
			left: mx - 60,
			top: my - 150,
			width: 120,
			height: 120,
			borderRadius: "50%",
			pointerEvents: "none",
			zIndex: 50,
			boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
		};
	})() : null;

	return (
		<div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
			{/* Dark overlay outside the selection quad */}
			<svg
				className="absolute inset-0 w-full h-full"
				viewBox="0 0 1000 1000"
				preserveAspectRatio="none"
			>
				<defs>
					<mask id="cropMask">
						<rect width="1000" height="1000" fill="white" />
						<path d={svgPath} fill="black" />
					</mask>
				</defs>
				{/* Dark overlay */}
				<rect
					width="1000"
					height="1000"
					fill="rgba(0,0,0,0.5)"
					mask="url(#cropMask)"
				/>
				{/* Selection border - solid bright line */}
				<path
					d={svgPath}
					fill="none"
					stroke="#22c55e"
					strokeWidth="2.5"
					strokeLinejoin="round"
				/>
				{/* Corner brackets */}
				{svgCorners.map((sc, i) => {
					const prev = svgCorners[(i + 3) % 4];
					const next = svgCorners[(i + 1) % 4];
					// Direction vectors toward adjacent corners
					const toPrevX = prev.x - sc.x;
					const toPrevY = prev.y - sc.y;
					const toPrevLen = Math.sqrt(toPrevX * toPrevX + toPrevY * toPrevY) || 1;
					const toNextX = next.x - sc.x;
					const toNextY = next.y - sc.y;
					const toNextLen = Math.sqrt(toNextX * toNextX + toNextY * toNextY) || 1;
					// Bracket endpoints
					const bpx = sc.x + (toPrevX / toPrevLen) * bracketLen;
					const bpy = sc.y + (toPrevY / toPrevLen) * bracketLen;
					const bnx = sc.x + (toNextX / toNextLen) * bracketLen;
					const bny = sc.y + (toNextY / toNextLen) * bracketLen;
					return (
						<g key={`bracket-${i}`}>
							<polyline
								points={`${bpx},${bpy} ${sc.x},${sc.y} ${bnx},${bny}`}
								fill="none"
								stroke="white"
								strokeWidth="4"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
							<polyline
								points={`${bpx},${bpy} ${sc.x},${sc.y} ${bnx},${bny}`}
								fill="none"
								stroke="#22c55e"
								strokeWidth="2.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</g>
					);
				})}
				{/* Edge midpoint indicators */}
				{edgeMids.map((mid, i) => {
					const sm = imageToSVG(mid);
					return (
						<circle
							key={`mid-${i}`}
							cx={sm.x}
							cy={sm.y}
							r="5"
							fill="white"
							stroke="#22c55e"
							strokeWidth="2"
							opacity="0.8"
						/>
					);
				})}
			</svg>

			{/* Corner drag handles (large invisible hit areas + visible dots) */}
			{corners.map((c, i) => {
				const pos = imageToCSS(c);
				const isActive = dragging === i;
				return (
					<div
						key={`handle-${i}`}
						className="absolute pointer-events-auto"
						onMouseDown={(e) => handlePointerDown(i, e)}
						onTouchStart={(e) => handlePointerDown(i, e)}
						style={{
							left: pos.left,
							top: pos.top,
							transform: "translate(-50%, -50%)",
							width: 44,
							height: 44,
							zIndex: 20,
							cursor: "grab",
							touchAction: "none",
						}}
					>
						{/* Visible circle */}
						<div
							className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-150"
							style={{
								width: isActive ? 22 : 16,
								height: isActive ? 22 : 16,
								background: isActive ? "#16a34a" : "#22c55e",
								border: "3px solid white",
								boxShadow: isActive
									? "0 0 16px rgba(34,197,94,0.7), 0 0 0 4px rgba(34,197,94,0.2)"
									: "0 2px 8px rgba(0,0,0,0.4)",
							}}
						/>
					</div>
				);
			})}

			{/* Edge midpoint drag handles */}
			{edgeMids.map((mid, i) => {
				const pos = imageToCSS(mid);
				return (
					<div
						key={`edge-${i}`}
						className="absolute pointer-events-auto"
						onMouseDown={(e) => handleEdgeDrag(i, e)}
						onTouchStart={(e) => handleEdgeDrag(i, e)}
						style={{
							left: pos.left,
							top: pos.top,
							transform: "translate(-50%, -50%)",
							width: 30,
							height: 30,
							zIndex: 15,
							cursor: i % 2 === 0 ? "ns-resize" : "ew-resize",
							touchAction: "none",
						}}
					/>
				);
			})}

			{/* Magnifier loupe */}
			{dragging !== null && magnifierStyle && (
				<canvas
					ref={magnifierCanvasRef}
					style={magnifierStyle}
				/>
			)}
		</div>
	);
}

// ─────────────────────────── FILTER PRESETS ───────────────────────────

const FILTERS = [
	{ id: "original", label: "Original", icon: "📷" },
	{ id: "bw", label: "B&W", icon: "⬛" },
	{ id: "grayscale", label: "Grayscale", icon: "🌫️" },
	{ id: "enhanced", label: "Enhanced", icon: "🎨" },
	{ id: "sharp", label: "Sharp Text", icon: "✏️" },
];

// ─────────────────────────── MAIN COMPONENT ───────────────────────────

export default function Scanner() {
	const { user, trackUsage } = useAuth();
	// ── Global State ──
	const [step, setStep] = useState(0);
	const [maxReached, setMaxReached] = useState(0);
	const [pages, setPages] = useState([]); // { id, file, url, img, corners, croppedCanvas, filter, filteredCanvas, rotation }
	const [activePageIdx, setActivePageIdx] = useState(0);
	const [processing, setProcessing] = useState(false);
	const [showBefore, setShowBefore] = useState(false);

	// Export settings
	const [exportFormat, setExportFormat] = useState("pdf"); // pdf, jpg, png
	const [exportQuality, setExportQuality] = useState("high"); // high, medium, low
	const [watermarkText, setWatermarkText] = useState("");
	const [watermarkEnabled, setWatermarkEnabled] = useState(false);
	const [watermarkColor, setWatermarkColor] = useState("#000000");
	// Custom text (header/footer/center or custom { xPercent, yPercent })
	const [customText, setCustomText] = useState("");
	const [customTextColor, setCustomTextColor] = useState("#000000");
	const [customTextPosition, setCustomTextPosition] = useState("footer"); // "header"|"footer"|"center"|{ xPercent, yPercent }
	// Watermark position: "center"|{ xPercent, yPercent }
	const [watermarkPosition, setWatermarkPosition] = useState("center");
	// Signature: "bottom-left"|"bottom-center"|"bottom-right"|{ xPercent, yPercent }
	const [signatureEnabled, setSignatureEnabled] = useState(false);
	const [signatureDataUrl, setSignatureDataUrl] = useState(null);
	const [signaturePosition, setSignaturePosition] = useState("bottom-right");
	// Preview image rect (for overlay positioning on Enhance step)
	const [previewImageRect, setPreviewImageRect] = useState(null);
	const [draggingOverlay, setDraggingOverlay] = useState(null); // "text"|"watermark"|"signature"|null
	const enhancePreviewRef = useRef(null);
	const enhanceImageRef = useRef(null);
	// Pagination / page numbers
	const [pageNumbersEnabled, setPageNumbersEnabled] = useState(false);
	const [pageNumberFormat, setPageNumberFormat] = useState("1 of N"); // "1", "1 of N", "Page 1"
	const [pageNumberPosition, setPageNumberPosition] = useState("bottom-center");
	const [pageNumberColor, setPageNumberColor] = useState("#000000");
	// Apply overlays to: "all" | "current" (this page only)
	const [overlayApplyTo, setOverlayApplyTo] = useState("all");

	const cropContainerRef = useRef(null);
	const fileInputRef = useRef(null);
	const signatureInputRef = useRef(null);

	// Measure preview image rect on Enhance step for overlay positioning
	useEffect(() => {
		if (step !== 2 || !enhancePreviewRef.current || !enhanceImageRef.current) {
			if (step !== 2) setPreviewImageRect(null);
			return;
		}
		const updateRect = () => {
			const container = enhancePreviewRef.current;
			const img = enhanceImageRef.current;
			if (!container || !img) return;
			const cr = container.getBoundingClientRect();
			const ir = img.getBoundingClientRect();
			setPreviewImageRect({
				left: ir.left - cr.left,
				top: ir.top - cr.top,
				width: ir.width,
				height: ir.height,
				containerWidth: cr.width,
				containerHeight: cr.height,
			});
		};
		const img = enhanceImageRef.current;
		const runAfterLayout = () => requestAnimationFrame(updateRect);
		runAfterLayout();
		if (img && img.complete) runAfterLayout();
		else if (img) img.addEventListener("load", runAfterLayout);
		const ro = new ResizeObserver(runAfterLayout);
		ro.observe(enhancePreviewRef.current);
		return () => {
			if (img) img.removeEventListener("load", runAfterLayout);
			ro.disconnect();
		};
	}, [step, activePageIdx, pages]);

	// Drag overlay on Enhance preview: update position from mouse (image-relative %)
	const getImagePercentFromEvent = useCallback((e) => {
		const rect = previewImageRect;
		const container = enhancePreviewRef.current;
		if (!rect || !container) return null;
		const cr = container.getBoundingClientRect();
		const clientX = e.touches ? e.touches[0].clientX : e.clientX;
		const clientY = e.touches ? e.touches[0].clientY : e.clientY;
		const mx = clientX - cr.left;
		const my = clientY - cr.top;
		const ix = mx - rect.left;
		const iy = my - rect.top;
		if (ix < 0 || ix > rect.width || iy < 0 || iy > rect.height) return null;
		const xPercent = Math.max(0, Math.min(100, (ix / rect.width) * 100));
		const yPercent = Math.max(0, Math.min(100, (iy / rect.height) * 100));
		return { xPercent, yPercent };
	}, [previewImageRect]);

	const handleOverlayDragMove = useCallback((e) => {
		if (!draggingOverlay) return;
		e.preventDefault();
		const pos = getImagePercentFromEvent(e);
		if (!pos) return;
		if (draggingOverlay === "text") setCustomTextPosition(pos);
		else if (draggingOverlay === "watermark") setWatermarkPosition(pos);
		else if (draggingOverlay === "signature") setSignaturePosition(pos);
	}, [draggingOverlay, getImagePercentFromEvent]);

	const handleOverlayDragEnd = useCallback(() => setDraggingOverlay(null), []);

	useEffect(() => {
		if (!draggingOverlay) return;
		window.addEventListener("mousemove", handleOverlayDragMove);
		window.addEventListener("mouseup", handleOverlayDragEnd);
		window.addEventListener("touchmove", handleOverlayDragMove, { passive: false });
		window.addEventListener("touchend", handleOverlayDragEnd);
		return () => {
			window.removeEventListener("mousemove", handleOverlayDragMove);
			window.removeEventListener("mouseup", handleOverlayDragEnd);
			window.removeEventListener("touchmove", handleOverlayDragMove);
			window.removeEventListener("touchend", handleOverlayDragEnd);
		};
	}, [draggingOverlay, handleOverlayDragMove, handleOverlayDragEnd]);

	// ── Navigation ──
	const goToStep = (s) => {
		setStep(s);
		if (s > maxReached) setMaxReached(s);
	};

	// ── Upload ──
	const handleFiles = useCallback(async (fileList) => {
		setProcessing(true);
		const newPages = [];
		for (const file of fileList) {
			const url = URL.createObjectURL(file);
			const img = await createImage(url);
			const corners = autoDetectEdges(img);
			newPages.push({
				id: Date.now() + Math.random(),
				file,
				url,
				img,
				corners,
				croppedCanvas: null,
				filter: "original",
				filteredCanvas: null,
				rotation: 0,
			});
		}
		setPages((prev) => [...prev, ...newPages]);
		setActivePageIdx((prev) => (prev === 0 && newPages.length > 0 ? 0 : prev));
		setProcessing(false);
	}, []);

	const handleDrop = useCallback(
		(e) => {
			e.preventDefault();
			e.stopPropagation();
			const files = Array.from(e.dataTransfer.files).filter((f) =>
				f.type.match(/image\/(jpeg|png|heic)|\.heic/i) || f.name.match(/\.(jpg|jpeg|png|heic)$/i)
			);
			if (files.length) handleFiles(files);
		},
		[handleFiles]
	);

	const handleFileInput = useCallback(
		(e) => {
			const files = Array.from(e.target.files);
			if (files.length) handleFiles(files);
			e.target.value = "";
		},
		[handleFiles]
	);

	const removePage = (idx) => {
		setPages((prev) => prev.filter((_, i) => i !== idx));
		if (activePageIdx >= pages.length - 1) setActivePageIdx(Math.max(0, pages.length - 2));
	};

	const movePage = (idx, dir) => {
		setPages((prev) => {
			const next = [...prev];
			const newIdx = idx + dir;
			if (newIdx < 0 || newIdx >= next.length) return prev;
			[next[idx], next[newIdx]] = [next[newIdx], next[idx]];
			return next;
		});
		setActivePageIdx(idx + dir);
	};

	const rotatePage = (idx) => {
		setPages((prev) => {
			const next = [...prev];
			next[idx] = { ...next[idx], rotation: (next[idx].rotation + 90) % 360 };
			return next;
		});
	};

	// ── Crop / Perspective ──
	const updateCorners = useCallback(
		(newCornersOrFn) => {
			setPages((prev) => {
				const next = [...prev];
				const currentCorners = next[activePageIdx].corners;
				const newCorners =
					typeof newCornersOrFn === "function"
						? newCornersOrFn(currentCorners)
						: newCornersOrFn;
				next[activePageIdx] = { ...next[activePageIdx], corners: newCorners };
				return next;
			});
		},
		[activePageIdx]
	);

	const applyCrop = useCallback(async () => {
		setProcessing(true);
		const updatedPages = [];
		for (const page of pages) {
			const { img, corners, rotation } = page;
			const w = img.naturalWidth || img.width;
			const h = img.naturalHeight || img.height;

			// Calculate output dimensions based on corners
			const topW = Math.sqrt(
				Math.pow(corners[1].x - corners[0].x, 2) +
				Math.pow(corners[1].y - corners[0].y, 2)
			);
			const botW = Math.sqrt(
				Math.pow(corners[2].x - corners[3].x, 2) +
				Math.pow(corners[2].y - corners[3].y, 2)
			);
			const leftH = Math.sqrt(
				Math.pow(corners[3].x - corners[0].x, 2) +
				Math.pow(corners[3].y - corners[0].y, 2)
			);
			const rightH = Math.sqrt(
				Math.pow(corners[2].x - corners[1].x, 2) +
				Math.pow(corners[2].y - corners[1].y, 2)
			);

			const outW = Math.round(Math.max(topW, botW));
			const outH = Math.round(Math.max(leftH, rightH));

			let croppedCanvas = perspectiveTransform(img, corners, outW, outH);

			// Apply rotation if any
			if (rotation > 0) {
				const rotCanvas = document.createElement("canvas");
				const rotCtx = rotCanvas.getContext("2d");
				if (rotation === 90 || rotation === 270) {
					rotCanvas.width = outH;
					rotCanvas.height = outW;
				} else {
					rotCanvas.width = outW;
					rotCanvas.height = outH;
				}
				rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
				rotCtx.rotate((rotation * Math.PI) / 180);
				rotCtx.drawImage(croppedCanvas, -outW / 2, -outH / 2);
				croppedCanvas = rotCanvas;
			}

			updatedPages.push({
				...page,
				croppedCanvas,
				filteredCanvas: applyFilter(croppedCanvas, page.filter),
			});
		}
		setPages(updatedPages);
		setProcessing(false);
	}, [pages]);

	// ── Filter ──
	const setPageFilter = useCallback(
		(filterId) => {
			setPages((prev) => {
				const next = [...prev];
				const page = next[activePageIdx];
				const src = page.croppedCanvas || (() => {
					const c = document.createElement("canvas");
					c.width = page.img.naturalWidth || page.img.width;
					c.height = page.img.naturalHeight || page.img.height;
					c.getContext("2d").drawImage(page.img, 0, 0);
					return c;
				})();
				next[activePageIdx] = {
					...page,
					filter: filterId,
					filteredCanvas: applyFilter(src, filterId),
				};
				return next;
			});
		},
		[activePageIdx]
	);

	// ── Export ──
	const qualityMap = { high: 0.95, medium: 0.75, low: 0.5 };

	const handleExport = useCallback(async () => {
		if (pages.length === 0) return;
		setProcessing(true);

		const quality = qualityMap[exportQuality];
		const applyOverlaysToThisPage = (i) =>
			overlayApplyTo === "all" || (overlayApplyTo === "current" && i === activePageIdx);
		const overlayOptsBase = {
			customText: customText.trim() || "",
			customTextColor,
			customTextPosition,
			watermarkEnabled,
			watermarkText: watermarkText.trim() || "",
			watermarkColor,
			watermarkPosition,
			signatureDataUrl: signatureEnabled && signatureDataUrl ? signatureDataUrl : null,
			signaturePosition,
			signatureMaxWidth: 140,
			signatureMaxHeight: 56,
			pageNumEnabled: pageNumbersEnabled,
			pageNumFormat: pageNumberFormat,
			pageNumPosition: pageNumberPosition,
			pageNumColor: pageNumberColor,
		};

		if (exportFormat === "pdf") {
			const { PDFDocument } = await import('pdf-lib');
			const pdfDoc = await PDFDocument.create();

			for (let i = 0; i < pages.length; i++) {
				let canvas = pages[i].filteredCanvas || pages[i].croppedCanvas;
				if (!canvas) continue;

				const totalPagesForOverlay = overlayApplyTo === "current" && applyOverlaysToThisPage(i) ? 1 : pages.length;
				if (applyOverlaysToThisPage(i)) {
					canvas = await drawOverlaysOnCanvas(canvas, { ...overlayOptsBase, pageIndex: overlayApplyTo === "current" ? 0 : i, totalPages: totalPagesForOverlay });
				}

				const blob = await canvasToBlob(canvas, "image/jpeg", quality);
				const imageBytes = await blob.arrayBuffer();
				const image = await pdfDoc.embedJpg(imageBytes);

				// Get page dimensions (A4 size in points)
				const pageWidth = 595.28;
				const pageHeight = 841.89;
				const imgRatio = image.width / image.height;
				const pageRatio = pageWidth / pageHeight;

				// Calculate dimensions to fit image on page
				let drawWidth, drawHeight, drawX, drawY;
				if (imgRatio > pageRatio) {
					drawWidth = pageWidth;
					drawHeight = pageWidth / imgRatio;
					drawX = 0;
					drawY = (pageHeight - drawHeight) / 2;
				} else {
					drawHeight = pageHeight;
					drawWidth = pageHeight * imgRatio;
					drawX = (pageWidth - drawWidth) / 2;
					drawY = 0;
				}

				// Add page and draw image
				const page = pdfDoc.addPage([pageWidth, pageHeight]);
				page.drawImage(image, {
					x: drawX,
					y: drawY,
					width: drawWidth,
					height: drawHeight,
				});
			}

			// Save PDF
			const pdfBytes = await pdfDoc.save();
			const blob = new Blob([pdfBytes], { type: 'application/pdf' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "scanned-document.pdf";
			a.click();
			URL.revokeObjectURL(url);
		} else {
			const mimeType = exportFormat === "png" ? "image/png" : "image/jpeg";
			const ext = exportFormat === "png" ? "png" : "jpg";
			for (let i = 0; i < pages.length; i++) {
				let canvas = pages[i].filteredCanvas || pages[i].croppedCanvas;
				if (!canvas) continue;
				const totalPagesForOverlay = overlayApplyTo === "current" && applyOverlaysToThisPage(i) ? 1 : pages.length;
				if (applyOverlaysToThisPage(i)) {
					canvas = await drawOverlaysOnCanvas(canvas, { ...overlayOptsBase, pageIndex: overlayApplyTo === "current" ? 0 : i, totalPages: totalPagesForOverlay });
				}
				const blob = await canvasToBlob(canvas, mimeType, quality);
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `scan-page-${i + 1}.${ext}`;
				a.click();
				URL.revokeObjectURL(url);
			}
		}

		// Track usage after successful export
		if (pages.length > 0 && user && trackUsage) {
			trackUsage("/scanner", 1, pages.length, {
				tool: "Document Scanner",
				filesProcessed: pages.length,
			});
		}

		setProcessing(false);
	}, [
		pages,
		exportFormat,
		exportQuality,
		watermarkEnabled,
		watermarkText,
		watermarkColor,
		customText,
		customTextColor,
		customTextPosition,
		signatureEnabled,
		signatureDataUrl,
		signaturePosition,
		pageNumbersEnabled,
		pageNumberFormat,
		pageNumberPosition,
		pageNumberColor,
		watermarkPosition,
		overlayApplyTo,
		activePageIdx,
		user,
		trackUsage,
	]);

	// ── Active Page ──
	const activePage = pages[activePageIdx] || null;

	const imgDims = activePage
		? {
			naturalW: activePage.img.naturalWidth || activePage.img.width,
			naturalH: activePage.img.naturalHeight || activePage.img.height,
		}
		: null;

	// ── Render Helpers ──

	const renderUploadStep = () => (
		<div className="space-y-6 animate-in fade-in duration-500">
			{/* Upload Area */}
			<div
				onDrop={handleDrop}
				onDragOver={(e) => e.preventDefault()}
				onClick={() => fileInputRef.current?.click()}
				className={cn(
					"w-full border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer",
					"flex flex-col items-center justify-center py-16 px-8",
					"bg-gradient-to-br from-background to-muted/20",
					"hover:border-primary/50 hover:bg-gradient-to-br hover:from-primary/5 hover:to-primary/10",
					"hover:shadow-xl hover:shadow-primary/10 hover:scale-[1.01]",
					"group"
				)}
			>
				<input
					ref={fileInputRef}
					type="file"
					accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic"
					multiple
					onChange={handleFileInput}
					className="hidden"
				/>
				<div className="mb-5 p-5 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 group-hover:from-primary/20 group-hover:to-primary/30 transition-all duration-300 group-hover:scale-110">
					<Camera className="h-10 w-10 text-primary" />
				</div>
				<p className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">
					Drop document photos here
				</p>
				<p className="text-sm text-muted-foreground mb-4">
					or click to browse • JPG, PNG, HEIC
				</p>
				<div className="flex gap-3">
					<span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground font-medium">
						Single
					</span>
					<span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground font-medium">
						Multiple
					</span>
					<span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground font-medium">
						Batch
					</span>
				</div>
			</div>

			{/* Uploaded Pages Grid */}
			{pages.length > 0 && (
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
							{pages.length} {pages.length === 1 ? "Page" : "Pages"} Added
						</h3>
						<Button
							variant="outline"
							size="sm"
							onClick={() => fileInputRef.current?.click()}
							className="gap-1.5"
						>
							<FilePlus className="w-3.5 h-3.5" />
							Add More
						</Button>
					</div>
					<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
						{pages.map((page, idx) => (
							<div
								key={page.id}
								className={cn(
									"relative group rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer aspect-[3/4]",
									activePageIdx === idx
										? "border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/20"
										: "border-border hover:border-primary/30 hover:shadow-md"
								)}
								onClick={() => setActivePageIdx(idx)}
							>
								<img
									src={page.url}
									alt={`Page ${idx + 1}`}
									className="w-full h-full object-cover"
									style={{ transform: `rotate(${page.rotation}deg)` }}
								/>
								{/* Page number badge */}
								<div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
									<span className="text-[10px] font-bold text-white">
										{idx + 1}
									</span>
								</div>
								{/* Action buttons on hover */}
								<div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
									<button
										onClick={(e) => {
											e.stopPropagation();
											rotatePage(idx);
										}}
										className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
										title="Rotate"
									>
										<RotateCw className="w-3.5 h-3.5 text-gray-700" />
									</button>
									<button
										onClick={(e) => {
											e.stopPropagation();
											removePage(idx);
										}}
										className="w-7 h-7 rounded-full bg-red-500/90 flex items-center justify-center hover:bg-red-500 transition-colors"
										title="Remove"
									>
										<Trash2 className="w-3.5 h-3.5 text-white" />
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Continue */}
			{pages.length > 0 && (
				<div className="flex justify-end">
					<Button
						size="lg"
						onClick={() => goToStep(1)}
						className="gap-2 px-8 shadow-lg shadow-primary/20"
					>
						Continue to Crop
						<ChevronRight className="w-4 h-4" />
					</Button>
				</div>
			)}
		</div>
	);

	const renderCropStep = () => {
		if (!activePage) return null;
		return (
			<div className="space-y-6 animate-in fade-in duration-500">
				{/* Page selector pills */}
				{pages.length > 1 && (
					<div className="flex items-center gap-2 flex-wrap">
						<span className="text-sm font-medium text-muted-foreground mr-1">
							Page:
						</span>
						{pages.map((p, idx) => (
							<button
								key={p.id}
								onClick={() => setActivePageIdx(idx)}
								className={cn(
									"w-8 h-8 rounded-lg text-xs font-bold transition-all duration-200 border",
									activePageIdx === idx
										? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30"
										: "bg-muted text-muted-foreground border-border hover:border-primary/30"
								)}
							>
								{idx + 1}
							</button>
						))}
					</div>
				)}

				{/* Crop Area */}
				<div className="bg-muted/30 rounded-2xl p-4 border">
					<div
						ref={cropContainerRef}
						className="relative mx-auto overflow-hidden rounded-xl bg-black"
						style={{ maxHeight: "60vh" }}
					>
						<img
							src={activePage.url}
							alt="Document"
							className="w-full h-auto max-h-[60vh] object-contain select-none"
							draggable={false}
							style={{ transform: `rotate(${activePage.rotation}deg)` }}
						/>
						<CornerOverlay
							corners={activePage.corners}
							setCorners={updateCorners}
							containerRef={cropContainerRef}
							imgDims={imgDims}
							imgSrc={activePage.url}
						/>
					</div>

					{/* Crop actions */}
					<div className="flex flex-wrap items-center justify-center gap-3 mt-4">
						<Button
							variant="outline"
							size="sm"
							onClick={() => rotatePage(activePageIdx)}
							className="gap-1.5"
						>
							<RotateCw className="w-3.5 h-3.5" />
							Rotate
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								const img = activePage.img;
								const corners = autoDetectEdges(img);
								updateCorners(corners);
							}}
							className="gap-1.5"
						>
							<RefreshCw className="w-3.5 h-3.5" />
							Auto Detect
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								const w = activePage.img.naturalWidth || activePage.img.width;
								const h = activePage.img.naturalHeight || activePage.img.height;
								updateCorners([
									{ x: 0, y: 0 },
									{ x: w, y: 0 },
									{ x: w, y: h },
									{ x: 0, y: h },
								]);
							}}
							className="gap-1.5"
						>
							<Maximize2 className="w-3.5 h-3.5" />
							Full Page
						</Button>
					</div>
					<p className="text-center text-xs text-muted-foreground mt-3">
						Drag the green corner handles to adjust document edges
					</p>
				</div>

				{/* Page management */}
				{pages.length > 1 && (
					<div className="flex items-center justify-center gap-3">
						<Button
							variant="outline"
							size="sm"
							disabled={activePageIdx === 0}
							onClick={() => movePage(activePageIdx, -1)}
							className="gap-1"
						>
							<ArrowUp className="w-3.5 h-3.5" />
							Move Up
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={activePageIdx === pages.length - 1}
							onClick={() => movePage(activePageIdx, 1)}
							className="gap-1"
						>
							<ArrowDown className="w-3.5 h-3.5" />
							Move Down
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => removePage(activePageIdx)}
							className="gap-1 text-destructive hover:text-destructive"
						>
							<Trash2 className="w-3.5 h-3.5" />
							Remove
						</Button>
					</div>
				)}

				{/* Navigation */}
				<div className="flex justify-between">
					<Button variant="outline" size="lg" onClick={() => goToStep(0)} className="gap-2">
						<ChevronLeft className="w-4 h-4" />
						Back
					</Button>
					<Button
						size="lg"
						onClick={async () => {
							await applyCrop();
							goToStep(2);
						}}
						disabled={processing}
						className="gap-2 px-8 shadow-lg shadow-primary/20"
					>
						{processing ? (
							<>
								<span className="animate-spin">
									<RefreshCw className="w-4 h-4" />
								</span>
								Processing...
							</>
						) : (
							<>
								Apply & Enhance
								<ChevronRight className="w-4 h-4" />
							</>
						)}
					</Button>
				</div>
			</div>
		);
	};

	const renderEnhanceStep = () => {
		if (!activePage) return null;
		const displayCanvas = activePage.filteredCanvas || activePage.croppedCanvas;
		const previewUrl = displayCanvas ? canvasToDataURL(displayCanvas) : activePage.url;
		const originalUrl = activePage.croppedCanvas
			? canvasToDataURL(activePage.croppedCanvas)
			: activePage.url;

		return (
			<div className="space-y-6 animate-in fade-in duration-500">
				{/* Page selector */}
				{pages.length > 1 && (
					<div className="flex items-center gap-2 flex-wrap">
						<span className="text-sm font-medium text-muted-foreground mr-1">
							Page:
						</span>
						{pages.map((p, idx) => (
							<button
								key={p.id}
								onClick={() => setActivePageIdx(idx)}
								className={cn(
									"w-8 h-8 rounded-lg text-xs font-bold transition-all duration-200 border",
									activePageIdx === idx
										? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30"
										: "bg-muted text-muted-foreground border-border hover:border-primary/30"
								)}
							>
								{idx + 1}
							</button>
						))}
					</div>
				)}

				{/* Preview with Before/After and draggable overlays */}
				<div className="bg-muted/30 rounded-2xl p-4 border">
					<div
						ref={enhancePreviewRef}
						className="relative mx-auto overflow-hidden rounded-xl bg-white"
						style={{ maxHeight: "55vh" }}
					>
						<img
							ref={enhanceImageRef}
							src={showBefore ? originalUrl : previewUrl}
							alt="Preview"
							className="w-full h-auto max-h-[55vh] object-contain transition-opacity duration-300"
						/>
						{/* Draggable overlays on preview (only when not showBefore and we have rect) */}
						{!showBefore && previewImageRect && (
							<div className="absolute inset-0 pointer-events-none">
								<div className="absolute pointer-events-auto" style={{
									left: previewImageRect.left,
									top: previewImageRect.top,
									width: previewImageRect.width,
									height: previewImageRect.height,
								}}>
									{customText.trim() && (
										<div
											className={cn(
												"absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move select-none whitespace-nowrap font-bold text-shadow-md",
												draggingOverlay === "text" && "ring-2 ring-primary ring-offset-1 rounded"
											)}
											style={{
												left: typeof customTextPosition === "object" && customTextPosition
													? `${customTextPosition.xPercent}%` : "50%",
												top: typeof customTextPosition === "object" && customTextPosition
													? `${customTextPosition.yPercent}%` : (customTextPosition === "header" ? "5%" : customTextPosition === "footer" ? "95%" : "50%"),
												color: customTextColor,
												fontSize: "clamp(12px, 2.5vw, 18px)",
											}}
											onMouseDown={(e) => {
												e.preventDefault();
												if (typeof customTextPosition !== "object") {
													const preset = customTextPosition === "header" ? { xPercent: 50, yPercent: 8 } : customTextPosition === "footer" ? { xPercent: 50, yPercent: 92 } : { xPercent: 50, yPercent: 50 };
													setCustomTextPosition(preset);
												}
												setDraggingOverlay("text");
											}}
											onTouchStart={(e) => {
												e.preventDefault();
												if (typeof customTextPosition !== "object") {
													const preset = customTextPosition === "header" ? { xPercent: 50, yPercent: 8 } : customTextPosition === "footer" ? { xPercent: 50, yPercent: 92 } : { xPercent: 50, yPercent: 50 };
													setCustomTextPosition(preset);
												}
												setDraggingOverlay("text");
											}}
										>
											{customText.trim()}
										</div>
									)}
									{watermarkEnabled && watermarkText.trim() && (
										<div
											className={cn(
												"absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move select-none whitespace-nowrap font-bold opacity-60 -rotate-45",
												draggingOverlay === "watermark" && "ring-2 ring-primary ring-offset-1 rounded"
											)}
											style={{
												left: typeof watermarkPosition === "object" && watermarkPosition
													? `${watermarkPosition.xPercent}%` : "50%",
												top: typeof watermarkPosition === "object" && watermarkPosition
													? `${watermarkPosition.yPercent}%` : "50%",
												color: watermarkColor,
												fontSize: "clamp(14px, 3vw, 24px)",
											}}
											onMouseDown={(e) => {
												e.preventDefault();
												if (typeof watermarkPosition !== "object") setWatermarkPosition({ xPercent: 50, yPercent: 50 });
												setDraggingOverlay("watermark");
											}}
											onTouchStart={(e) => {
												e.preventDefault();
												if (typeof watermarkPosition !== "object") setWatermarkPosition({ xPercent: 50, yPercent: 50 });
												setDraggingOverlay("watermark");
											}}
										>
											{watermarkText.trim()}
										</div>
									)}
									{signatureEnabled && signatureDataUrl && (
										<div
											className={cn(
												"absolute w-24 h-10 transform -translate-x-1/2 -translate-y-1/2 cursor-move select-none",
												draggingOverlay === "signature" && "ring-2 ring-primary ring-offset-1 rounded"
											)}
											style={{
												left: typeof signaturePosition === "object" && signaturePosition
													? `${signaturePosition.xPercent}%` : (signaturePosition === "bottom-right" ? "85%" : signaturePosition === "bottom-center" ? "50%" : "15%"),
												top: typeof signaturePosition === "object" && signaturePosition
													? `${signaturePosition.yPercent}%` : "92%",
											}}
											onMouseDown={(e) => {
												e.preventDefault();
												if (typeof signaturePosition !== "object") setSignaturePosition({ xPercent: signaturePosition === "bottom-right" ? 85 : signaturePosition === "bottom-center" ? 50 : 15, yPercent: 92 });
												setDraggingOverlay("signature");
											}}
											onTouchStart={(e) => {
												e.preventDefault();
												if (typeof signaturePosition !== "object") setSignaturePosition({ xPercent: signaturePosition === "bottom-right" ? 85 : signaturePosition === "bottom-center" ? 50 : 15, yPercent: 92 });
												setDraggingOverlay("signature");
											}}
										>
											<img src={signatureDataUrl} alt="Signature" className="w-full h-full object-contain pointer-events-none" />
										</div>
									)}
								</div>
							</div>
						)}
						{/* Before/After toggle */}
						<button
							onMouseDown={() => setShowBefore(true)}
							onMouseUp={() => setShowBefore(false)}
							onMouseLeave={() => setShowBefore(false)}
							onTouchStart={() => setShowBefore(true)}
							onTouchEnd={() => setShowBefore(false)}
							className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-1.5 hover:bg-black/80 transition-colors z-10"
						>
							{showBefore ? (
								<EyeOff className="w-3.5 h-3.5" />
							) : (
								<Eye className="w-3.5 h-3.5" />
							)}
							{showBefore ? "Original" : "Hold to compare"}
						</button>
					</div>
					{!showBefore && (customText.trim() || (watermarkEnabled && watermarkText.trim()) || (signatureEnabled && signatureDataUrl)) && (
						<p className="text-xs text-muted-foreground mt-2 text-center">Drag text, watermark, or signature on the preview to move them.</p>
					)}
				</div>

				{/* Filter selector */}
				<div className="space-y-3">
					<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
						Enhancement Filters
					</h3>
					<div className="grid grid-cols-5 gap-2">
						{FILTERS.map((f) => (
							<button
								key={f.id}
								onClick={() => setPageFilter(f.id)}
								className={cn(
									"flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200",
									activePage.filter === f.id
										? "border-primary bg-primary/5 shadow-md shadow-primary/20"
										: "border-border hover:border-primary/30 hover:bg-muted/50"
								)}
							>
								<span className="text-2xl">{f.icon}</span>
								<span
									className={cn(
										"text-xs font-medium",
										activePage.filter === f.id
											? "text-primary"
											: "text-muted-foreground"
									)}
								>
									{f.label}
								</span>
								{activePage.filter === f.id && (
									<div className="w-1.5 h-1.5 rounded-full bg-primary" />
								)}
							</button>
						))}
					</div>
				</div>

				{/* Add text, watermark, signature, page numbers – same options as Export */}
				<div className="space-y-4">
					<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
						Add text, watermark, signature & page numbers
					</h3>
					<p className="text-xs text-muted-foreground">
						Configure below. Choose whether to apply to this page only or all pages. These settings are used when you export.
					</p>
					{/* Apply to */}
					<div className="flex flex-wrap items-center gap-3">
						<span className="text-sm font-medium text-foreground">Apply to:</span>
						<button
							type="button"
							onClick={() => setOverlayApplyTo("current")}
							className={cn(
								"px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all",
								overlayApplyTo === "current"
									? "bg-primary text-primary-foreground border-primary"
									: "border-border hover:bg-muted/50"
							)}
						>
							This page only
						</button>
						<button
							type="button"
							onClick={() => setOverlayApplyTo("all")}
							className={cn(
								"px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all",
								overlayApplyTo === "all"
									? "bg-primary text-primary-foreground border-primary"
									: "border-border hover:bg-muted/50"
							)}
						>
							All pages
						</button>
					</div>
					{/* Add Text */}
					<div className="bg-muted/30 rounded-xl p-4 border space-y-2">
						<h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
							<Type className="w-3.5 h-3.5" /> Add text
						</h4>
						<input
							type="text"
							placeholder="Text on every page (e.g. title, footer)"
							value={customText}
							onChange={(e) => setCustomText(e.target.value)}
							className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
						/>
						{customText.trim() && (
							<div className="flex flex-wrap items-center gap-2">
								{["#000000", "#666666", "#dc2626", "#2563eb"].map((c) => (
									<button key={c} type="button" onClick={() => setCustomTextColor(c)} className={cn("w-6 h-6 rounded border-2", customTextColor === c && "ring-2 ring-primary")} style={{ backgroundColor: c }} />
								))}
								<label className="flex items-center gap-1 text-xs"><input type="color" value={customTextColor} onChange={(e) => setCustomTextColor(e.target.value)} className="w-6 h-6 rounded border cursor-pointer" /> Color</label>
								<span className="text-xs text-muted-foreground">Position:</span>
								{["header", "footer", "center"].map((pos) => (
									<button key={pos} type="button" onClick={() => setCustomTextPosition(pos)} className={cn("px-2 py-0.5 rounded text-xs capitalize border", customTextPosition === pos ? "bg-primary text-primary-foreground border-primary" : "border-border")}>{pos}</button>
								))}
								<button type="button" onClick={() => setCustomTextPosition({ xPercent: 50, yPercent: 50 })} className={cn("px-2 py-0.5 rounded text-xs border", typeof customTextPosition === "object" ? "bg-primary text-primary-foreground border-primary" : "border-border")}>Custom (drag on preview)</button>
							</div>
						)}
					</div>
					{/* Watermark */}
					<div className="bg-muted/30 rounded-xl p-4 border space-y-2">
						<h4 className="text-xs font-semibold text-muted-foreground uppercase">Watermark</h4>
						<label className="flex items-center gap-2 cursor-pointer">
							<input type="checkbox" checked={watermarkEnabled} onChange={(e) => setWatermarkEnabled(e.target.checked)} className="w-4 h-4 accent-primary" />
							<span className="text-sm">Add watermark</span>
						</label>
						{watermarkEnabled && (
							<>
								<input type="text" placeholder="Watermark text" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg" />
								<div className="flex flex-wrap gap-2">
									{["#000000", "#666666", "#dc2626"].map((c) => (
										<button key={c} type="button" onClick={() => setWatermarkColor(c)} className={cn("w-5 h-5 rounded border", watermarkColor === c && "ring-2 ring-primary")} style={{ backgroundColor: c }} />
									))}
									<label className="text-xs flex items-center gap-1"><input type="color" value={watermarkColor} onChange={(e) => setWatermarkColor(e.target.value)} className="w-5 h-5 rounded border cursor-pointer" /> Color</label>
								</div>
								<div className="flex flex-wrap gap-2 mt-1">
									<button type="button" onClick={() => setWatermarkPosition("center")} className={cn("px-2 py-0.5 rounded text-xs border", watermarkPosition === "center" ? "bg-primary text-primary-foreground border-primary" : "border-border")}>Center</button>
									<button type="button" onClick={() => setWatermarkPosition({ xPercent: 50, yPercent: 50 })} className={cn("px-2 py-0.5 rounded text-xs border", typeof watermarkPosition === "object" ? "bg-primary text-primary-foreground border-primary" : "border-border")}>Custom (drag on preview)</button>
								</div>
							</>
						)}
					</div>
					{/* Signature */}
					<div className="bg-muted/30 rounded-xl p-4 border space-y-2">
						<h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2"><PenLine className="w-3.5 h-3.5" /> Signature</h4>
						<label className="flex items-center gap-2 cursor-pointer">
							<input type="checkbox" checked={signatureEnabled} onChange={(e) => setSignatureEnabled(e.target.checked)} className="w-4 h-4 accent-primary" />
							<span className="text-sm">Add signature image</span>
						</label>
						{signatureEnabled && (
							<div className="flex flex-wrap items-center gap-2">
								<Button type="button" variant="outline" size="sm" onClick={() => signatureInputRef.current?.click()}>{signatureDataUrl ? "Change image" : "Upload PNG/JPG"}</Button>
								{signatureDataUrl && <img src={signatureDataUrl} alt="Signature" className="h-8 object-contain border rounded bg-white" />}
								<span className="text-xs text-muted-foreground">Position:</span>
								{["bottom-left", "bottom-center", "bottom-right"].map((pos) => (
									<button key={pos} type="button" onClick={() => setSignaturePosition(pos)} className={cn("px-2 py-0.5 rounded text-xs border capitalize", signaturePosition === pos ? "bg-primary text-primary-foreground border-primary" : "border-border")}>{pos.replace("-", " ")}</button>
								))}
								<button type="button" onClick={() => setSignaturePosition({ xPercent: 50, yPercent: 85 })} className={cn("px-2 py-0.5 rounded text-xs border", typeof signaturePosition === "object" ? "bg-primary text-primary-foreground border-primary" : "border-border")}>Custom (drag on preview)</button>
							</div>
						)}
					</div>
					{/* Page numbers */}
					<div className="bg-muted/30 rounded-xl p-4 border space-y-2">
						<h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2"><Hash className="w-3.5 h-3.5" /> Page numbers</h4>
						<label className="flex items-center gap-2 cursor-pointer">
							<input type="checkbox" checked={pageNumbersEnabled} onChange={(e) => setPageNumbersEnabled(e.target.checked)} className="w-4 h-4 accent-primary" />
							<span className="text-sm">Add page numbers</span>
						</label>
						{pageNumbersEnabled && (
							<div className="flex flex-wrap items-center gap-2">
								{["1", "1 of N", "Page 1"].map((f) => (
									<button key={f} type="button" onClick={() => setPageNumberFormat(f)} className={cn("px-2 py-0.5 rounded text-xs border", pageNumberFormat === f ? "bg-primary text-primary-foreground border-primary" : "border-border")}>{f}</button>
								))}
								{["bottom-left", "bottom-center", "bottom-right"].map((pos) => (
									<button key={pos} type="button" onClick={() => setPageNumberPosition(pos)} className={cn("px-2 py-0.5 rounded text-xs border capitalize", pageNumberPosition === pos ? "bg-primary text-primary-foreground border-primary" : "border-border")}>{pos.replace("-", " ")}</button>
								))}
								{["#000000", "#666666", "#dc2626"].map((c) => (
									<button key={c} type="button" onClick={() => setPageNumberColor(c)} className={cn("w-5 h-5 rounded border", pageNumberColor === c && "ring-2 ring-primary")} style={{ backgroundColor: c }} />
								))}
								<label className="text-xs flex items-center gap-1"><input type="color" value={pageNumberColor} onChange={(e) => setPageNumberColor(e.target.value)} className="w-5 h-5 rounded border cursor-pointer" /> Color</label>
							</div>
						)}
					</div>
				</div>

				{/* Navigation */}
				<div className="flex justify-between">
					<Button variant="outline" size="lg" onClick={() => goToStep(1)} className="gap-2">
						<ChevronLeft className="w-4 h-4" />
						Back
					</Button>
					<Button
						size="lg"
						onClick={() => goToStep(3)}
						className="gap-2 px-8 shadow-lg shadow-primary/20"
					>
						Export
						<ChevronRight className="w-4 h-4" />
					</Button>
				</div>
			</div>
		);
	};

	const renderExportStep = () => (
		<div className="space-y-6 animate-in fade-in duration-500">
			{/* Preview grid */}
			<div className="bg-muted/30 rounded-2xl p-5 border">
				<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
					Document Preview ({pages.length} {pages.length === 1 ? "page" : "pages"})
				</h3>
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
					{pages.map((p, idx) => {
						const canvas = p.filteredCanvas || p.croppedCanvas;
						const src = canvas ? canvasToDataURL(canvas, "image/jpeg", 0.5) : p.url;
						return (
							<div
								key={p.id}
								className="relative rounded-xl overflow-hidden border bg-white aspect-[3/4] shadow-sm"
							>
								<img
									src={src}
									alt={`Page ${idx + 1}`}
									className="w-full h-full object-contain"
								/>
								<div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
									<span className="text-[10px] font-bold text-primary-foreground">
										{idx + 1}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Export Options: Format & Quality only (text, watermark, signature, page numbers are set on Enhance step) */}
			<div className="space-y-5">
				<div className="grid md:grid-cols-2 gap-5">
					{/* Format */}
					<div className="bg-muted/30 rounded-2xl p-5 border space-y-3">
					<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
						Format
					</h3>
					<div className="space-y-2">
						{[
							{ id: "pdf", label: "PDF Document", desc: "All pages in one file", icon: FileText },
							{ id: "jpg", label: "JPG Images", desc: "One file per page", icon: ImageIcon },
							{ id: "png", label: "PNG Images", desc: "Lossless, one per page", icon: ImageIcon },
						].map((fmt) => {
							const Icon = fmt.icon;
							return (
								<button
									key={fmt.id}
									onClick={() => setExportFormat(fmt.id)}
									className={cn(
										"w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-left",
										exportFormat === fmt.id
											? "border-primary bg-primary/5"
											: "border-border hover:border-primary/30"
									)}
								>
									<div
										className={cn(
											"w-9 h-9 rounded-lg flex items-center justify-center",
											exportFormat === fmt.id
												? "bg-primary text-primary-foreground"
												: "bg-muted text-muted-foreground"
										)}
									>
										<Icon className="w-4 h-4" />
									</div>
									<div>
										<p
											className={cn(
												"text-sm font-medium",
												exportFormat === fmt.id && "text-primary"
											)}
										>
											{fmt.label}
										</p>
										<p className="text-xs text-muted-foreground">{fmt.desc}</p>
									</div>
									{exportFormat === fmt.id && (
										<Check className="w-4 h-4 text-primary ml-auto" />
									)}
								</button>
							);
						})}
					</div>
				</div>

					{/* Quality */}
					<div className="bg-muted/30 rounded-2xl p-5 border space-y-3">
						<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
							Quality
						</h3>
						<div className="space-y-2">
							{[
								{ id: "high", label: "High Quality", desc: "Best for printing", size: "Larger file" },
								{ id: "medium", label: "Medium", desc: "Good balance", size: "Medium file" },
								{ id: "low", label: "Low", desc: "Quick sharing", size: "Smaller file" },
							].map((q) => (
								<button
									key={q.id}
									onClick={() => setExportQuality(q.id)}
									className={cn(
										"w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-left",
										exportQuality === q.id
											? "border-primary bg-primary/5"
											: "border-border hover:border-primary/30"
									)}
								>
									<div
										className={cn(
											"w-9 h-9 rounded-lg flex items-center justify-center",
											exportQuality === q.id
												? "bg-primary text-primary-foreground"
												: "bg-muted text-muted-foreground"
										)}
									>
										<Sparkles className="w-4 h-4" />
									</div>
									<div>
										<p
											className={cn(
												"text-sm font-medium",
												exportQuality === q.id && "text-primary"
											)}
										>
											{q.label}
										</p>
										<p className="text-xs text-muted-foreground">
											{q.desc} • {q.size}
										</p>
									</div>
									{exportQuality === q.id && (
										<Check className="w-4 h-4 text-primary ml-auto" />
									)}
								</button>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* Navigation */}
			<div className="flex justify-between">
				<Button variant="outline" size="lg" onClick={() => goToStep(2)} className="gap-2">
					<ChevronLeft className="w-4 h-4" />
					Back
				</Button>
				<Button
					size="lg"
					onClick={handleExport}
					disabled={processing || pages.length === 0}
					className="gap-2 px-8 shadow-lg shadow-primary/20"
				>
					{processing ? (
						<>
							<span className="animate-spin">
								<RefreshCw className="w-4 h-4" />
							</span>
							Exporting...
						</>
					) : (
						<>
							<Download className="w-4 h-4" />
							Download {exportFormat.toUpperCase()}
						</>
					)}
				</Button>
			</div>
		</div>
	);

	return (
		<>
			<Head>
				<title>Document Scanner - ConvertMastery</title>
				<meta
					name="description"
					content="Scan documents from photos. Auto-detect edges, crop, enhance, and export as PDF or images. Free, fast, privacy-first document scanner."
				/>
			</Head>

			<div className="min-h-screen bg-background flex flex-col">
				<Navbar />

				<main className="flex-1">
					<div className="container mx-auto px-4 py-8 max-w-4xl">
						{/* Header */}
						<div className="text-center mb-8">
							<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
								<ScanLine className="w-3.5 h-3.5" />
								Client-side processing • 100% Private
							</div>
							<h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
								Document Scanner
							</h1>
							<p className="text-muted-foreground max-w-lg mx-auto">
								Turn photos of documents into clean, professional scanned files.
								Auto-detect edges, apply scan filters, and export as PDF.
							</p>
						</div>

						{/* Steps */}
						<StepIndicator
							currentStep={step}
							onStepClick={goToStep}
							maxReachedStep={maxReached}
						/>

						{/* Step Content */}
						{step === 0 && renderUploadStep()}
						{step === 1 && renderCropStep()}
						{step === 2 && renderEnhanceStep()}
						{step === 3 && renderExportStep()}

						{/* Features Section (shown on upload step when empty) */}
						{step === 0 && pages.length === 0 && (
							<div className="mt-16 grid md:grid-cols-3 gap-6">
								{[
									{
										icon: Crop,
										title: "Smart Edge Detection",
										desc: "Automatically detects document boundaries with manual corner adjustment",
									},
									{
										icon: Wand2,
										title: "5 Scan Filters",
										desc: "Original, B&W, Grayscale, Color Enhanced, and Sharp Text modes",
									},
									{
										icon: FileText,
										title: "Multi-Page PDF",
										desc: "Combine multiple pages into a single PDF document with quality options",
									},
								].map((f, i) => {
									const Icon = f.icon;
									return (
										<div
											key={i}
											className="text-center p-6 rounded-2xl border bg-card hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1"
										>
											<div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
												<Icon className="w-5 h-5 text-primary" />
											</div>
											<h3 className="font-bold mb-1">{f.title}</h3>
											<p className="text-sm text-muted-foreground">{f.desc}</p>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</main>

				<Footer />
			</div>
		</>
	);
}
