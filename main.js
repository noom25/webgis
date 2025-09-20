/* ====================== CONFIG ====================== */
const DATA_PARCEL   = "data/parcel.geojson";
const DATA_BLOCK    = "data/block.geojson";
const DATA_ZONE     = "data/zone.geojson";
const DATA_BOUNDARY = "data/boundary.geojson";
const DATA_BUILDING = "data/building.geojson";
const DATA_SPK      = "data/spk.geojson";
const DATA_BPOINT   = "data/boundarypoint.geojson"; // จุดแนวเขต

// เริ่มที่ตำบลปรือใหญ่
const START_CENTER = [14.6005, 104.2500];
const START_ZOOM   = 15;

/* ====================== MAP ====================== */
const map = L.map("map", { zoomControl: true }).setView(START_CENTER, START_ZOOM);

// Base maps
const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 22, attribution: "© OpenStreetMap contributors"
}).addTo(map);

const gHybrid = L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
  maxZoom: 22, attribution: "© Google"
});
const gStreet = L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
  maxZoom: 22, attribution: "© Google"
});

let parcelLayer, blockLayer, zoneLayer, boundaryLayer, buildingLayer, spkLayer, boundaryPointLayer;
let parcelGeoJSON;
const editableGroup = L.featureGroup().addTo(map);

const baseMaps   = { "OpenStreetMap": osm, "Google Hybrid": gHybrid, "Google Street": gStreet };
const overlayMaps= {};
const layersCtl  = L.control.layers(baseMaps, overlayMaps, { collapsed:false }).addTo(map);

/* ====================== HELPERS ====================== */
function buildPropsTable(props = {}) {
  const rows = Object.keys(props).map(k =>
    `<tr><td><b>${k}</b></td><td>${props[k] ?? "-"}</td></tr>`).join("");
  return `<div class="popup-content"><table>${rows || "<tr><td>ไม่มีข้อมูล</td></tr>"}</table></div>`;
}

async function loadVector(url, style, popupBuilder) {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  return L.geoJSON(data, {
    style,
    onEachFeature: (feat, layer) => {
      const html = popupBuilder ? popupBuilder(feat) : buildPropsTable(feat.properties);
      layer.bindPopup(html, { className: "popup-content" });
    }
  }).addTo(map);
}

async function loadPoints(url, circleStyle, popupBuilder) {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  return L.geoJSON(data, {
    pointToLayer: (feat, latlng) => L.circleMarker(latlng, circleStyle),
    onEachFeature: (feat, layer) => {
      const html = popupBuilder ? popupBuilder(feat) : buildPropsTable(feat.properties);
      layer.bindPopup(html, { className: "popup-content" });
    }
  }).addTo(map);
}

/* ====================== PARCEL (Editable) ====================== */
function onEachParcel(feature, layer) {
  layer.bindPopup(buildPropsTable(feature.properties), { className: "popup-content" });
  // ให้แก้ไขได้: ใส่ลง editableGroup
  editableGroup.addLayer(layer);
}

async function loadParcels() {
  const res = await fetch(DATA_PARCEL, { cache: "no-store" });
  parcelGeoJSON = await res.json();

  parcelLayer = L.geoJSON(parcelGeoJSON, {
    style: { color:"#17ff3e", weight:1.4, fillOpacity:0 },
    onEachFeature: onEachParcel
  }).addTo(map);

  overlayMaps["Parcel"] = parcelLayer;
  layersCtl.addOverlay(parcelLayer, "Parcel");

  try { map.fitBounds(parcelLayer.getBounds(), { maxZoom: 18 }); } catch(e) {}
}

/* ====================== LOAD ALL LAYERS ====================== */
(async function init() {
  await loadParcels();

  blockLayer = await loadVector(
    DATA_BLOCK,
    { color:"#2b6cb0", weight:2, fillOpacity:0 },
    f => `<b>Block</b>${buildPropsTable(f.properties)}`
  );
  overlayMaps["Block"] = blockLayer; layersCtl.addOverlay(blockLayer, "Block");

  zoneLayer = await loadVector(
    DATA_ZONE,
    { color:"#2a08ebff", weight:2.2, fillOpacity:0 },
    f => `<b>Zone</b>${buildPropsTable(f.properties)}`
  );
  overlayMaps["Zone"] = zoneLayer; layersCtl.addOverlay(zoneLayer, "Zone");

  boundaryLayer = await loadVector(
    DATA_BOUNDARY,
    { color:"#f70808ff", weight:2.5, fillOpacity:0 },
    f => `<b>Boundary</b>${buildPropsTable(f.properties)}`
  );
  overlayMaps["Boundary"] = boundaryLayer; layersCtl.addOverlay(boundaryLayer, "Boundary");

  buildingLayer = await loadVector(
    DATA_BUILDING,
    { color:"#8b5e3c", weight:1, fillOpacity:0.25 },
    f => `<b>Building</b>${buildPropsTable(f.properties)}`
  );
  overlayMaps["Building"] = buildingLayer; layersCtl.addOverlay(buildingLayer, "Building");

  spkLayer = await loadVector(
    DATA_SPK,
    { color:"#ea580c", weight:1, dashArray:"4,3", fillOpacity:0 },
    f => `<b>SPK</b>${buildPropsTable(f.properties)}`
  );
  overlayMaps["SPK"] = spkLayer; layersCtl.addOverlay(spkLayer, "SPK");

  boundaryPointLayer = await loadPoints(
    DATA_BPOINT,
    { radius: 5, color: "#ec0b0bff", weight: 2.5, fillColor:"#ee0909ff", fillOpacity: 0.9 },
    f => `<b>Boundary Point</b>${buildPropsTable(f.properties)}`
  );
  overlayMaps["Boundary Point"] = boundaryPointLayer; layersCtl.addOverlay(boundaryPointLayer, "Boundary Point");
})();

// ปุ่ม Toggle แสดง/ซ่อนกล่อง Layer Control
const toggleBtn = L.DomUtil.create("div", "", document.body);
toggleBtn.id = "layerToggleBtn";
toggleBtn.innerText = "ย่อเมนูเลเยอร์";
let isLayerVisible = true;

toggleBtn.onclick = () => {
  const mapContainer = document.getElementById("map");
  isLayerVisible = !isLayerVisible;
  if (isLayerVisible) {
    mapContainer.classList.remove("layer-hidden");
    toggleBtn.innerText = "ย่อเมนูเลเยอร์";
  } else {
    mapContainer.classList.add("layer-hidden");
    toggleBtn.innerText = "แสดงเมนูเลเยอร์";
  }
};

/* ====================== DRAW / EDIT (Parcel only) ====================== */
const drawControl = new L.Control.Draw({
  edit: { featureGroup: editableGroup },
  draw: {
    polygon: { allowIntersection:false, showArea:true },
    polyline:false, rectangle:false, circle:false, marker:false, circlemarker:false
  }
});
map.addControl(drawControl);

// วาดแปลงใหม่ -> เปิดฟอร์มแก้อัตโนมัติผ่าน popup ตาราง (แก้ค่าจาก popup ไม่ได้ ก็แก้หลังบันทึกได้)
map.on(L.Draw.Event.CREATED, (e) => {
  const layer = e.layer;
  // ใส่ properties เริ่มต้น
  layer.feature = layer.feature || { type:"Feature", properties:{ parcel_cod:"", zone:"", block:"", lot:"" } };
  editableGroup.addLayer(layer);
  parcelLayer.addLayer(layer);
  layer.bindPopup(buildPropsTable(layer.feature.properties)).openPopup();
});

/* ปุ่มควบคุมโหมด */
let activeEdit = null; // L.EditToolbar.Edit instance

document.getElementById("btnDraw").onclick = () => {
  // เรียกเครื่องมือวาด polygon
  new L.Draw.Polygon(map, drawControl.options.draw.polygon).enable();
};
document.getElementById("btnEdit").onclick = () => {
  if (activeEdit) activeEdit.disable();
  activeEdit = new L.EditToolbar.Edit(map, { featureGroup: editableGroup });
  activeEdit.enable();
  alert("โหมดแก้ไขเปิดแล้ว: คลิกที่ vertices แล้วลากเพื่อปรับรูปแปลง");
};
document.getElementById("btnStop").onclick = () => {
  if (activeEdit) activeEdit.disable();
  activeEdit = null;
  alert("ออกจากโหมดแก้ไข/วาดแล้ว");
};

/* ====================== SEARCH + HIGHLIGHT ====================== */
const $ = (id)=>document.getElementById(id);
const infoBox = $("searchInfo");
let lastHighlighted = [];

function clearHighlight() {
  lastHighlighted.forEach(l => { try { l.setStyle({ color:"#17ff3e", weight:1.4, fillOpacity:0.15 }); } catch(e){} });
  lastHighlighted = [];
}

function searchParcel() {
  const kwRaw = ($("parcelInput").value || "").trim();
  const kw = kwRaw.toLowerCase();
  if (!kw) return;

  const matches = [];
  parcelLayer.eachLayer(l => {
    const p = l.feature?.properties || {};
    const hit =
      (p.parcel_cod && p.parcel_cod.toLowerCase() === kw) ||
      (p.zone && p.zone.toLowerCase() === kw) ||
      (p.block && p.block.toLowerCase() === kw);
    if (hit) matches.push(l);
  });

  clearHighlight();

  if (matches.length > 0) {
    map.fitBounds(matches[0].getBounds(), { maxZoom: 19 });
    matches.forEach(l => {
      l.setStyle({ color:"red", weight:3, fillOpacity:0.25 });
      l.openPopup();
    });
    lastHighlighted = matches;

    const labels = matches.slice(0,5).map(l => {
      const p = l.feature?.properties || {};
      return p.parcel_cod || `${p.zone || ""}-${p.block || ""}`;
    });
    infoBox.textContent = `พบ ${matches.length} รายการ: ${labels.join(", ")}${matches.length>5?" …":""}`;
  } else {
    infoBox.textContent = "ไม่พบข้อมูลที่ค้นหา";
    alert("ไม่พบข้อมูลที่ค้นหา");
  }
}
$("searchBtn").addEventListener("click", searchParcel);
$("parcelInput").addEventListener("keydown", (e) => { if (e.key === "Enter") searchParcel(); });
$("clearBtn").addEventListener("click", () => { $("parcelInput").value=""; infoBox.textContent=""; clearHighlight(); map.closePopup(); });

/* ====================== SAVE TO SERVER ====================== */
document.getElementById("btnSave").addEventListener("click", async () => {
  // export เฉพาะ Parcel
  const gj = parcelLayer.toGeoJSON();

  try {
    const res = await fetch("save.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gj)
    });
    const out = await res.json();
    alert(out.message || "บันทึกแล้ว");
  } catch (err) {
    alert("เกิดข้อผิดพลาดในการบันทึก: " + err);
  }
});

/* ====================== AUTO SEARCH FROM URL ====================== */
function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

window.addEventListener("load", () => {
  const parcelParam = getQueryParam("parcel");
  if (parcelParam) {
    // ใส่ค่าลงช่องค้นหา
    $("parcelInput").value = parcelParam;
    // รอ parcelLayer โหลดเสร็จแล้วค่อยค้นหา
    const trySearch = setInterval(() => {
      if (parcelLayer) {
        searchParcel();
        clearInterval(trySearch);
      }
    }, 500);
  }
});

fetch(DATA_PARCEL)
  .then(res => res.json())
  .then(data => {
    const bad = data.features.filter(f => {
      if (!f.geometry) return true;
      if (!f.geometry.coordinates) return true;
      if (f.geometry.type === "Polygon" && f.geometry.coordinates.length === 0) return true;
      return false;
    });
    console.log("จำนวน feature geometry ผิดพลาด:", bad.length, bad);
    if (bad.length > 0) {
      alert("⚠️ พบ geometry ผิดพลาด: เปิด console ดูรายละเอียด");
    }
  });

