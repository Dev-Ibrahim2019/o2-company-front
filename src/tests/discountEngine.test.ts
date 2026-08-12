import { discountEngine } from "../services/discountEngine";

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) { passed++; } else { failed++; errors.push(`❌ FAIL: ${message}`); }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual === expected) { passed++; } else { failed++; errors.push(`❌ FAIL: ${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
}

function assertAlmostEqual(actual: number, expected: number, message: string) {
  if (Math.abs(actual - expected) < 0.01) { passed++; } else { failed++; errors.push(`❌ FAIL: ${message} — expected ~${expected}, got ${actual}`); }
}

// Current mock data:
// Employees: 15=حسين أحمد, 16=سارة علي, 17=محمد عمر, 18=نورة خالد, 19=خالد سعيد
// Customers: 1=القدس, 2=غزة, 3=فلسطين
// Suppliers: 10=الغذاء المثالي, 11=المشروبات
// Departments: 1=مشروبات, 2=مقبلات, 3=شاورما, 4=حلويات, 5=مشروبات باردة
// Items: 70=شاورما(20₪,dept3), 71=بيبسي(5₪,dept1), 72=بطاطا(10₪,dept2), 73=برجر(35₪,dept3), 74=كولا(5₪,dept1), 75=ماء(2₪,dept1), 76=عصير(12₪,dept1), 77=بيتزا(45₪,dept3)
// Categories: 1=مشروبات غازية(dept1), 2=مشروبات ساخنة(dept1), 3=مقبلات باردة(dept2), 4=ساندويشات(dept3)
// Brands: 1=Pepsi, 2=Coca Cola, 3=Almarai
// Seeded discounts: HUSS-SHAW(emp15+item70,20%,p1), HUSS-DEPT(emp15+dept3,10%,p2), HUSS-BURG(emp15+item73,15%,p3), VIP-DRNK(cust1+dept1,15%,p1), PEPSI-OFF(brand1,1₪,p5), OPENING(all,25%,p10)

function testOpeningOnlyOnce() {
  console.log("\n15. OPENING (مرة واحدة) — الاستخدام الثاني يفشل");
  // OPENING should have been consumed by testGlobalOpeningDiscount
  const result = discountEngine.calculate({ price: 100, quantity: 1 });
  assert(!result.has_discount, "OPENING already used and should NOT match again");
  const openingRejected = result.rejected_discounts.find(r => r.code === "OPENING");
  assert(!!openingRejected, "OPENING must be rejected with reason");
  if (openingRejected) {
    assert(openingRejected.reason.length > 0, "rejection reason is non-empty");
  }
}

function testEmployeeWithItemDiscount() {
  console.log("\n2. موظف 15 + صنف 70 (شاورما 20₪) ← خصم 20%");
  const result = discountEngine.calculate({ price: 20, quantity: 1, employee_id: 15, item_id: 70 });
  assert(result.has_discount, "emp 15 + item 70 must find discount");
  if (result.has_discount && result.matched_discount) {
    assertEqual(result.matched_discount.code, "HUSS-SHAW", "HUSS-SHAW selected (priority 1)");
    assertEqual(result.matched_discount.discount_amount, 4, "20% of 20 = 4");
    assertEqual(result.matched_discount.final_price, 16, "final price 16");
  }
  assert(result.rejected_discounts.length > 0, "must have rejected discounts");
}

function testCustomerWithDepartmentDiscount() {
  console.log("\n3. عميل 1 (القدس) + قسم 1 (مشروبات) ← خصم 15%");
  const result = discountEngine.calculate({ price: 50, quantity: 1, customer_id: 1, department_id: 1 });
  assert(result.has_discount, "VIP customer + drinks dept must find discount");
  if (result.has_discount && result.matched_discount) {
    assertEqual(result.matched_discount.code, "VIP-DRNK", "VIP-DRNK selected");
    assertEqual(result.matched_discount.discount_amount, 7.5, "15% of 50 = 7.5");
    assertEqual(result.matched_discount.final_price, 42.5, "final price 42.5");
  }
}

function testCustomerWrongDepartment() {
  console.log("\n4. عميل 1 + قسم 3 (شاورما) ← VIP-DRNK مرفوض (النطاق لا يطابق)");
  const result = discountEngine.calculate({ price: 50, quantity: 1, customer_id: 1, department_id: 3 });
  const vipRejected = result.rejected_discounts.find(r => r.code === "VIP-DRNK");
  assert(!!vipRejected, "VIP-DRNK rejected (scope mismatch)");
  if (vipRejected) {
    assert(vipRejected.reason.includes("لا ينطبق"), `rejection reason mentions scope: ${vipRejected.reason}`);
  }
}

function testGlobalBrandDiscount() {
  console.log("\n5. صنف 71 (بيبسي 5₪, براند Pepsi=1) ← خصم 1₪ ثابت");
  const result = discountEngine.calculate({ price: 5, quantity: 1, item_id: 71 });
  assert(result.has_discount, "Pepsi must get PEPSI-OFF brand discount");
  if (result.has_discount && result.matched_discount) {
    assertEqual(result.matched_discount.code, "PEPSI-OFF", "PEPSI-OFF selected");
    assertEqual(result.matched_discount.discount_amount, 1, "fixed 1 NIS");
    assertEqual(result.matched_discount.final_price, 4, "5 - 1 = 4");
  }
}

function testEmployeeItemCompoundPriority() {
  console.log("\n6. موظف 15 + صنف 70 (شاورما 20₪) ← أولوية 1 (HUSS-SHAW 20%) يتفوق على HUSS-DEPT 10%");
  const result = discountEngine.calculate({ price: 20, quantity: 1, employee_id: 15, item_id: 70 });
  assert(result.has_discount, "must find discount");
  if (result.has_discount && result.matched_discount) {
    assertEqual(result.matched_discount.priority, 1, "priority 1 selected (HUSS-SHAW)");
    assertEqual(result.matched_discount.value, 20, "20% is best");
  }
  assert(result.rejected_discounts.length > 0, "must have rejected discounts");
}

function testEmployeeItemNoMatch() {
  console.log("\n7. موظف 16 (سارة) + أي صنف ← لا خصم (OPENING مستهلك، ليس لسارة أي خصم)");
  const result = discountEngine.calculate({ price: 10, quantity: 1, employee_id: 16, item_id: 72 });
  assert(!result.has_discount, "employee 16 has no discounts (OPENING already consumed)");
}

function testEmployeeWrongItemRejected() {
  console.log("\n7b. موظف 15 (حسين) + صنف 73 (برجر) ← HUSS-SHAW مرفوض (الصنف خطأ)");
  const result = discountEngine.calculate({ price: 35, quantity: 1, employee_id: 15, item_id: 73 });
  // HUSS-SHAW targets employee=15 AND item=70 → item 73 ≠ 70 ← AND يرفض
  const hussShawRejected = result.rejected_discounts.find(r => r.code === "HUSS-SHAW");
  assert(!!hussShawRejected, "HUSS-SHAW must be rejected (wrong item)");
  assert(!result.has_discount || result.matched_discount?.code !== "HUSS-SHAW",
    "HUSS-SHAW must NOT be the selected discount with wrong item");
}

function testSupplierNoDiscount() {
  console.log("\n8. مورد 10 (الغذاء المثالي) ← لا خصم للموردين حالياً");
  const result = discountEngine.calculate({ price: 100, quantity: 1, supplier_id: 10 });
  assert(!result.has_discount, "supplier 10 has no discount");
}

function testGlobalOpeningDiscount() {
  console.log("\n9. خصم شامل OPENING (25%) مرة واحدة");
  const r1 = discountEngine.calculate({ price: 100, quantity: 1 });
  assert(r1.has_discount, "OPENING matches everyone");
  if (r1.has_discount && r1.matched_discount) {
    assertEqual(r1.matched_discount.code, "OPENING", "OPENING selected");
    assertEqual(r1.matched_discount.discount_amount, 25, "25% of 100 = 25");
    assertEqual(r1.matched_discount.final_price, 75, "final price 75");
  }
}

function testCartWithMultipleItems() {
  console.log("\n10. سلة: صنف 71 (بيبسي 5₪×2) + صنف 70 (شاورما 20₪×1) ← موظف 15");
  const result = discountEngine.calculateCart({
    items: [
      { item_id: 71, item_name: "بيبسي", price: 5, quantity: 2, department_id: 1 },
      { item_id: 70, item_name: "شاورما", price: 20, quantity: 1, department_id: 3 },
    ],
    employee_id: 15,
  });
  assert(result.items.length === 2, "2 line items");
  const shawarma = result.items.find(i => i.item_id === 70);
  const pepsi = result.items.find(i => i.item_id === 71);
  assert(!!shawarma, "shawarma line exists");
  assert(!!pepsi, "pepsi line exists");
  if (shawarma && shawarma.discount) {
    assertEqual(shawarma.discount.code, "HUSS-SHAW", "shawarma gets HUSS-SHAW");
    assertEqual(shawarma.discount_amount, 4, "20% of 20 = 4");
    assertEqual(shawarma.final_total, 16, "shawarma line final = 16");
  }
  if (pepsi) {
    // Pepsi (item 71) has brand_id=1 (Pepsi) → PEPSI-OFF gives 1₪ per_quantity
    assert(!!pepsi.discount, "pepsi gets PEPSI-OFF brand discount");
    if (pepsi.discount) {
      assertEqual(pepsi.discount.code, "PEPSI-OFF", "PEPSI-OFF on pepsi");
    }
    assertEqual(pepsi.discount_amount, 2, "1₪ × 2 qty = 2 discount on pepsi");
    assertEqual(pepsi.final_total, 8, "pepsi line final = 8 (10 - 2)");
  }
  assertEqual(result.total_original, 30, "total original = 10 + 20 = 30");
  assertEqual(result.total_discount, 6, "total discount = 4 (shawarma) + 2 (pepsi) = 6");
  assertEqual(result.total_final, 24, "total final = 24");
}

function testCartWithCompoundTargets() {
  console.log("\n11. سلة: عميل 1 + صنف 71 (بيبسي 5₪×1) ← خصم VIP-DRNK 15% + PEPSI-OFF 1₪");
  const result = discountEngine.calculateCart({
    items: [
      { item_id: 71, item_name: "بيبسي", price: 5, quantity: 1, department_id: 1 },
    ],
    customer_id: 1,
  });
  assert(result.items.length === 1, "1 item");
  if (result.items[0].discount) {
    // VIP-DRNK (priority 1) beats PEPSI-OFF (priority 5)
    assertEqual(result.items[0].discount.code, "VIP-DRNK", "VIP-DRNK wins (priority 1 > 5)");
    assertAlmostEqual(result.items[0].discount_amount, 0.75, "15% of 5 = 0.75");
    assertAlmostEqual(result.items[0].final_total, 4.25, "5 - 0.75 = 4.25");
  }
}

function testTargetValidation() {
  console.log("\n12. التحقق من الكيانات");
  const emp = discountEngine.validateTarget("employee", 15);
  assert(emp.found, "employee 15 exists (حسين أحمد)");
  const emp2 = discountEngine.validateTarget("employee", 999);
  assert(!emp2.found, "employee 999 not found");
  const dept = discountEngine.validateTarget("department", 1);
  assert(dept.found, "department 1 exists (مشروبات)");
  const item = discountEngine.validateTarget("item", 70);
  assert(item.found, "item 70 exists (شاورما)");
  const cat = discountEngine.validateTarget("category", 1);
  assert(cat.found, "category 1 exists (مشروبات غازية)");
  const brand = discountEngine.validateTarget("brand", 1);
  assert(brand.found, "brand 1 exists (Pepsi)");
  const all = discountEngine.validateTarget("all");
  assert(all.found, "'all' target is valid");
}

function testPerQuantityStrategy() {
  console.log("\n13. استراتيجية لكل قطعة — حسين+شاورما كمية 3");
  const result = discountEngine.calculateCart({
    items: [
      { item_id: 70, item_name: "شاورما", price: 20, quantity: 3, department_id: 3 },
    ],
    employee_id: 15,
  });
  assert(result.items.length === 1, "1 item");
  if (result.items[0].discount) {
    assertEqual(result.items[0].discount.code, "HUSS-SHAW", "HUSS-SHAW");
    assertEqual(result.items[0].discount.apply_strategy, "per_quantity", "per_quantity strategy");
    // per_quantity: 20% of 20 = 4 × 3 = 12
    assertEqual(result.items[0].discount_amount, 12, "4 × 3 = 12 discount");
    assertEqual(result.items[0].original_total, 60, "original total 60");
    assertEqual(result.items[0].final_total, 48, "final total 48");
  }
}

function testRejectedReasons() {
  console.log("\n14. أسباب الرفض مفصلة");
  const result = discountEngine.calculate({ price: 5, quantity: 1, item_id: 75 });
  // Item 75 (ماء) has brand_id=undefined, category_id=undefined → PEPSI-OFF won't match (no brand),
  // HUSS-SHAW/DEPT/BURG won't match (no employee), VIP-DRNK won't match (no customer),
  // OPENING already consumed by test 1 (once strategy) → no discount at all
  assert(!result.has_discount, "water has no discount (OPENING already used, others don't match)");
  assert(result.rejected_discounts.length > 0, "all rules rejected");
  for (const r of result.rejected_discounts) {
    assert(r.reason.length > 0, `rejected reason for ${r.code} is non-empty: ${r.reason}`);
  }
}

// ── Run All ──

console.log("══════════════════════════════════════════════");
console.log("  DISCOUNT ENGINE TEST SUITE");
console.log("══════════════════════════════════════════════");

discountEngine.seed();

// OPENING (global once) must run first — consumes the "once" quota
testGlobalOpeningDiscount();
// Now all subsequent tests run after OPENING is consumed
testEmployeeWithItemDiscount();
testCustomerWithDepartmentDiscount();
testGlobalBrandDiscount();
testEmployeeItemCompoundPriority();
testSupplierNoDiscount();
testEmployeeWrongItemRejected();
testCartWithMultipleItems();
testCartWithCompoundTargets();
testTargetValidation();
testPerQuantityStrategy();
testRejectedReasons();
testCustomerWrongDepartment();
testEmployeeItemNoMatch();
testOpeningOnlyOnce();

console.log(`\n══════════════════════════════════════════════`);
console.log(`  ${passed} ✅ Passed | ${failed} ❌ Failed`);
console.log(`══════════════════════════════════════════════`);

if (errors.length > 0) {
  console.log("\nErrors:");
  errors.forEach(e => console.log(e));
}

if (failed > 0) {
  throw new Error(`discountEngine test suite: ${failed} assertion(s) failed`);
}
