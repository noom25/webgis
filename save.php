<?php
// บันทึกกลับไฟล์ data/parcel.geojson
header('Content-Type: application/json; charset=utf-8');

try {
  $raw = file_get_contents('php://input');
  if ($raw === false || $raw === '') {
    throw new Exception('ไม่มีข้อมูลส่งมา');
  }
  // ตรวจสอบว่าเป็น JSON ที่พอจะ parse ได้
  $json = json_decode($raw, true);
  if ($json === null) {
    throw new Exception('รูปแบบ JSON ไม่ถูกต้อง');
  }

  $target = __DIR__ . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'parcel.geojson';
  // สำรองไฟล์เก่า
  if (file_exists($target)) {
    @copy($target, $target . '.bak_' . date('Ymd_His'));
  }
  // เขียนไฟล์ใหม่ (pretty print)
  $ok = file_put_contents($target, json_encode($json, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
  if ($ok === false) {
    throw new Exception('ไม่สามารถเขียนไฟล์ได้: ตรวจสิทธิ์โฟลเดอร์ data/');
  }

  echo json_encode(['ok' => true, 'message' => '✅ บันทึก parcel.geojson สำเร็จ']);
} catch (Exception $e) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'message' => '❌ ' . $e->getMessage()]);
}
